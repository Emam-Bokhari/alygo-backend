import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Ride } from "../ride/ride.model";
import { User } from "../user/user.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { Event } from "../event/event.model";
import { Tracking } from "../tracking/tracking.model";
import { RIDE_TYPE, RIDE_STATUS } from "../ride/ride.constant";
import { SERVICE_AREA_TYPE } from "../serviceArea/serviceArea.constant";
import { STATUS } from "../../../enums/user";
import { utcToTimezone } from "../../../shared/timezoneHelper";

const getDistanceKm = (
  coords1: [number, number],
  coords2: [number, number],
) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const resolveReservationType = (
  ride: any,
  airportServiceAreaIds: string[],
  activeEvents: any[],
): "airport" | "event" | "scheduled" => {
  if (
    ride.serviceAreaId &&
    airportServiceAreaIds.includes(ride.serviceAreaId.toString())
  ) {
    return "airport";
  }

  if (activeEvents.length > 0 && ride.scheduledAt) {
    const scheduledTime = new Date(ride.scheduledAt);

    for (const event of activeEvents) {
      // Check event active time
      const start = new Date(event.startDateTime);
      const end = new Date(event.endDateTime);
      if (scheduledTime < start || scheduledTime > end) {
        continue;
      }

      // Check event area/location
      if (event.serviceAreaId) {
        if (
          ride.serviceAreaId &&
          event.serviceAreaId.toString() === ride.serviceAreaId.toString()
        ) {
          return "event";
        }
      } else if (
        event.location?.coordinates &&
        ride.pickup?.location?.coordinates
      ) {
        const distance = getDistanceKm(
          event.location.coordinates,
          ride.pickup.location.coordinates,
        );
        const radius = event.coverageRadiusKm || 25;
        if (distance <= radius) {
          return "event";
        }
      }
    }
  }

  return "scheduled";
};

const getReservationsOverviewFromDB = async (
  queryParams: Record<string, any>,
) => {
  const {
    page = 1,
    limit = 10,
    search,
    searchTerm,
    reservationType,
    status,
    startDate,
    endDate,
    driverId,
    passengerId,
    airport,
    city,
  } = queryParams;

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Resolve airport service areas and active events
  const [airportServiceAreas, activeEvents] = await Promise.all([
    ServiceArea.find({ type: SERVICE_AREA_TYPE.AIRPORT }).select("_id").lean(),
    Event.find({ status: STATUS.ACTIVE }).lean(),
  ]);

  const airportServiceAreaIds = airportServiceAreas.map((sa) =>
    sa._id.toString(),
  );

  // Base query: only scheduled/reservation rides
  const filterQuery: any = { rideType: RIDE_TYPE.SCHEDULED };

  // Status Filter
  if (status) {
    filterQuery.status = status;
  }

  // Date Range Filter (scheduledAt is the primary date for reservations)
  if (startDate || endDate) {
    filterQuery.scheduledAt = {};
    if (startDate) {
      filterQuery.scheduledAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filterQuery.scheduledAt.$lte = new Date(endDate);
    }
  }

  // Driver Filter
  if (driverId) {
    filterQuery.$or = [
      { driverId: new Types.ObjectId(driverId) },
      { assignedDriverId: new Types.ObjectId(driverId) },
    ];
  }

  // Passenger Filter
  if (passengerId) {
    filterQuery.userId = new Types.ObjectId(passengerId);
  }

  // Airport Filter
  if (airport) {
    filterQuery.serviceAreaId = new Types.ObjectId(airport);
  }

  // City Filter
  if (city) {
    const serviceAreasInCity = await ServiceArea.find({
      city: { $regex: city, $options: "i" },
    })
      .select("_id")
      .lean();
    const cityAreaIds = serviceAreasInCity.map((sa) => sa._id);
    filterQuery.serviceAreaId = { $in: cityAreaIds };
  }

  // Search Filter
  const searchVal = search || searchTerm;
  if (searchVal) {
    const userSearchQuery: any = {
      $or: [
        { name: { $regex: searchVal, $options: "i" } },
        { email: { $regex: searchVal, $options: "i" } },
        { phone: { $regex: searchVal, $options: "i" } },
      ],
    };
    const matchingUsers = await User.find(userSearchQuery).select("_id").lean();
    const matchingUserIds = matchingUsers.map((u) => u._id);

    const searchConditions: any[] = [
      { userId: { $in: matchingUserIds } },
      { driverId: { $in: matchingUserIds } },
      { assignedDriverId: { $in: matchingUserIds } },
      { "pickup.address": { $regex: searchVal, $options: "i" } },
      { "destination.address": { $regex: searchVal, $options: "i" } },
    ];

    if (Types.ObjectId.isValid(searchVal)) {
      searchConditions.push({ _id: new Types.ObjectId(searchVal) });
    }

    if (filterQuery.$or) {
      filterQuery.$and = [{ $or: filterQuery.$or }, { $or: searchConditions }];
      delete filterQuery.$or;
    } else {
      filterQuery.$or = searchConditions;
    }
  }

  // Event conditions for MongoDB queries
  const eventConditions = activeEvents.map((event) => {
    const cond: any = {
      scheduledAt: { $gte: event.startDateTime, $lte: event.endDateTime },
    };
    if (event.serviceAreaId) {
      cond.serviceAreaId = event.serviceAreaId;
    } else if (event.location?.coordinates) {
      const radiusInRadians = (event.coverageRadiusKm || 25) / 6378.1;
      cond["pickup.location"] = {
        $geoWithin: {
          $centerSphere: [event.location.coordinates, radiusInRadians],
        },
      };
    }
    return cond;
  });

  // Reservation Type Filter
  if (reservationType) {
    if (reservationType === "airport") {
      filterQuery.serviceAreaId = {
        $in: airportServiceAreaIds.map((id) => new Types.ObjectId(id)),
      };
    } else if (reservationType === "event") {
      if (eventConditions.length > 0) {
        if (filterQuery.$or) {
          filterQuery.$and = [
            { $or: filterQuery.$or },
            { $or: eventConditions },
          ];
          delete filterQuery.$or;
        } else {
          filterQuery.$or = eventConditions;
        }
      } else {
        filterQuery._id = null;
      }
    } else if (reservationType === "scheduled") {
      const notAirport = {
        serviceAreaId: {
          $nin: airportServiceAreaIds.map((id) => new Types.ObjectId(id)),
        },
      };
      const notEvent =
        eventConditions.length > 0 ? { $nor: eventConditions } : {};

      if (filterQuery.$and) {
        filterQuery.$and.push(notAirport);
        if (eventConditions.length > 0) filterQuery.$and.push(notEvent);
      } else {
        filterQuery.$and = [notAirport];
        if (eventConditions.length > 0) filterQuery.$and.push(notEvent);
      }
    }
  }

  // Calculate Statistics using parallel DB counts
  const statsQuery = { ...filterQuery };
  const [
    totalReservations,
    completedReservations,
    pendingAssignments,
    airportReservations,
    eventReservations,
  ] = await Promise.all([
    Ride.countDocuments(statsQuery),
    Ride.countDocuments({ ...statsQuery, status: RIDE_STATUS.COMPLETED }),
    Ride.countDocuments({
      ...statsQuery,
      driverId: null,
      assignedDriverId: null,
    }),
    Ride.countDocuments({
      ...statsQuery,
      serviceAreaId: {
        $in: airportServiceAreaIds.map((id) => new Types.ObjectId(id)),
      },
    }),
    eventConditions.length > 0
      ? Ride.countDocuments({ ...statsQuery, $or: eventConditions })
      : Promise.resolve(0),
  ]);

  const scheduledReservations =
    totalReservations - airportReservations - eventReservations;

  // Retrieve Reservations (paginated and populated)
  const reservations = await Ride.find(filterQuery)
    .populate({
      path: "userId",
      select: "name email profileImage averageRating",
    })
    .populate({
      path: "driverId",
      select: "name email profileImage averageRating",
    })
    .populate({
      path: "assignedDriverId",
      select: "name email profileImage averageRating",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = totalReservations;
  const totalPage = Math.ceil(total / limitNum);

  // Format list results
  const formattedData = reservations.map((ride: any) => {
    const passengerUser = ride.userId as any;
    const driverUser = (ride.driverId || ride.assignedDriverId) as any;
    const rideTz = ride.timezone || "UTC";
    const typeResolved = resolveReservationType(
      ride,
      airportServiceAreaIds,
      activeEvents,
    );

    return {
      reservationId: ride._id.toString(),
      reservationType: typeResolved,
      passenger: passengerUser
        ? {
            id: passengerUser._id.toString(),
            name: passengerUser.name,
          }
        : null,
      pickup: ride.pickup?.address || "",
      dropoff: ride.destination?.address || "",
      scheduledTime: ride.scheduledAt
        ? utcToTimezone(ride.scheduledAt, rideTz).toISO()
        : null,
      assignedDriver: driverUser
        ? {
            id: driverUser._id.toString(),
            name: driverUser.name,
          }
        : null,
      category: ride.rideCategory?.name || "",
      status: ride.status,
      createdAt: ride.createdAt
        ? utcToTimezone(ride.createdAt, rideTz).toISO()
        : null,
    };
  });

  return {
    statistics: {
      totalReservations,
      scheduledReservations,
      airportReservations,
      eventReservations,
      pendingAssignments,
      completedReservations,
    },
    data: formattedData,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage,
    },
  };
};

const getReservationDetailsFromDB = async (reservationId: string) => {
  const ride = await Ride.findById(reservationId)
    .populate({
      path: "userId",
      select: "name email phone profileImage averageRating status",
    })
    .populate({
      path: "driverId",
      select: "name email phone profileImage averageRating status",
    })
    .populate({
      path: "assignedDriverId",
      select: "name email phone profileImage averageRating status",
    })
    .populate("carId")
    .populate("serviceAreaId")
    .lean();

  if (!ride || ride.rideType !== RIDE_TYPE.SCHEDULED) {
    throw new ApiError(404, "Reservation not found");
  }

  const rideTz = ride.timezone || "UTC";

  const formatDate = (date?: Date | null): string | null => {
    if (!date) return null;
    return utcToTimezone(date, rideTz).toISO();
  };

  const [airportServiceAreas, activeEvents] = await Promise.all([
    ServiceArea.find({ type: SERVICE_AREA_TYPE.AIRPORT }).select("_id").lean(),
    Event.find({ status: STATUS.ACTIVE }).lean(),
  ]);
  const airportServiceAreaIds = airportServiceAreas.map((sa) =>
    sa._id.toString(),
  );
  const typeResolved = resolveReservationType(
    ride,
    airportServiceAreaIds,
    activeEvents,
  );

  const passengerUser = ride.userId as any;
  const driverUser = (ride.driverId || ride.assignedDriverId) as any;
  const carInfo = ride.carId as any;
  const serviceAreaInfo = ride.serviceAreaId as any;

  const passengerId = passengerUser?._id;
  const driverId = driverUser?._id;

  const [passengerCompletedTrips, driverCompletedTrips] = await Promise.all([
    passengerId
      ? Ride.countDocuments({
          userId: passengerId,
          status: RIDE_STATUS.COMPLETED,
        })
      : Promise.resolve(0),
    driverId
      ? Ride.countDocuments({
          driverId: driverId,
          status: RIDE_STATUS.COMPLETED,
        })
      : Promise.resolve(0),
  ]);

  const passengerInfo = passengerUser
    ? {
        passengerId: passengerUser._id.toString(),
        fullName: passengerUser.name,
        email: passengerUser.email,
        phone: passengerUser.phone || "",
        profileImage: passengerUser.profileImage || "",
        rating: passengerUser.averageRating || 0,
        totalTrips: passengerCompletedTrips,
        accountStatus:
          passengerUser.status === STATUS.INACTIVE ? "Banned" : "Active",
      }
    : null;

  const driverInfo = driverUser
    ? {
        driverId: driverUser._id.toString(),
        fullName: driverUser.name,
        email: driverUser.email,
        phone: driverUser.phone || "",
        profileImage: driverUser.profileImage || "",
        rating: driverUser.averageRating || 0,
        completedTrips: driverCompletedTrips,
        driverStatus:
          driverUser.status === STATUS.INACTIVE ? "Banned" : "Active",
      }
    : null;

  const vehicleInfo = carInfo
    ? {
        vehicleId: carInfo._id.toString(),
        make: carInfo.brand || "",
        model: carInfo.model || "",
        year: carInfo.year || 0,
        color: null,
        licensePlate: carInfo.licensePlate || "",
      }
    : null;

  const timeline: any[] = [];

  if (ride.createdAt) {
    timeline.push({
      status: "RESERVATION_CREATED",
      title: "Reservation Created",
      description: "Reservation created successfully",
      timestamp: formatDate(ride.createdAt),
      actor: "Passenger",
    });
  }

  if (ride.requestedAt) {
    timeline.push({
      status: "RESERVATION_REQUESTED",
      title: "Reservation Requested",
      description: "Reservation requested and pending confirmation",
      timestamp: formatDate(ride.requestedAt),
      actor: "Passenger",
    });
  }

  if (ride.reservationConfirmedAt) {
    timeline.push({
      status: "RESERVATION_CONFIRMED",
      title: "Reservation Confirmed",
      description: "Reservation confirmed by system",
      timestamp: formatDate(ride.reservationConfirmedAt),
      actor: "System",
    });
  }

  if (ride.reservationAssignedAt) {
    timeline.push({
      status: "DRIVER_ASSIGNED",
      title: "Driver Assigned",
      description: `Driver assigned: ${driverInfo?.fullName || "Assigned Driver"}`,
      timestamp: formatDate(ride.reservationAssignedAt),
      actor: "System",
    });
  }

  if (ride.reservationAcceptedAt || ride.acceptedAt) {
    timeline.push({
      status: "DRIVER_ACCEPTED",
      title: "Driver Accepted",
      description: "Driver accepted the reservation ride request",
      timestamp: formatDate(ride.reservationAcceptedAt || ride.acceptedAt),
      actor: "Driver",
    });
  }

  if (ride.arrivedAt) {
    timeline.push({
      status: "DRIVER_ARRIVED",
      title: "Driver Arrived",
      description: "Driver arrived at the pickup location",
      timestamp: formatDate(ride.arrivedAt),
      actor: "Driver",
    });
  }

  if (ride.startedAt) {
    timeline.push({
      status: "TRIP_STARTED",
      title: "Trip Started",
      description: "Trip started",
      timestamp: formatDate(ride.startedAt),
      actor: "Driver",
    });
  }

  if (ride.stops && ride.stops.length > 0) {
    ride.stops.forEach((stop: any) => {
      if (stop.isCompleted && stop.completedAt) {
        timeline.push({
          status: "STOP_REACHED",
          title: `Stop ${stop.order} Reached`,
          description: `Stop reached at ${stop.address}`,
          timestamp: formatDate(stop.completedAt),
          actor: "Driver",
        });
      }
    });
  }

  if (ride.completedAt) {
    timeline.push({
      status: "TRIP_COMPLETED",
      title: "Trip Completed",
      description: "Trip completed successfully",
      timestamp: formatDate(ride.completedAt),
      actor: "Driver",
    });
  }

  if (ride.cancellation?.cancelledAt) {
    const cancellationActor =
      ride.cancellation.cancelledBy === "user"
        ? "Passenger"
        : ride.cancellation.cancelledBy === "driver"
          ? "Driver"
          : "Admin";
    timeline.push({
      status: "RESERVATION_CANCELLED",
      title: "Reservation Cancelled",
      description: `Cancelled by: ${cancellationActor}. Reason: ${
        ride.cancellation.cancellationReasonName ||
        ride.reservationCancelledReason ||
        "N/A"
      }`,
      timestamp: formatDate(ride.cancellation.cancelledAt),
      actor: cancellationActor,
    });
  }

  timeline.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });

  const paymentInfo = ride.payment
    ? {
        status: ride.payment.status || "pending",
        method: ride.payment.method || "card",
        transactionId: ride.payment.stripePaymentIntentId || null,
        amount: ride.fare?.total || 0,
        currency: "USD",
        paidAt: formatDate(ride.payment.paidAt),
      }
    : null;

  const trackingDoc = await Tracking.findOne({ rideId: ride._id }).lean();
  const trackingInfo = trackingDoc
    ? {
        driverLocation: trackingDoc.driverLocation || null,
        pickupLocation: ride.pickup?.location || null,
        destinationLocation: ride.destination?.location || null,
        currentEta: trackingDoc.estimatedArrivalMinutes || null,
        remainingDistance: trackingDoc.remainingDistanceKm || null,
        routeProgress:
          trackingDoc.totalDistanceKm && trackingDoc.remainingDistanceKm
            ? Number(
                (
                  (1 -
                    trackingDoc.remainingDistanceKm /
                      trackingDoc.totalDistanceKm) *
                  100
                ).toFixed(1),
              )
            : null,
      }
    : null;

  const cancellationInfo = ride.cancellation?.cancelledAt
    ? {
        cancellationStatus: ride.status,
        cancelledBy: ride.cancellation.cancelledBy,
        cancellationReason: ride.cancellation.cancellationReasonName || null,
        cancellationNote: ride.reservationCancelledReason || null,
        cancelledAt: formatDate(ride.cancellation.cancelledAt),
      }
    : null;

  const metadataInfo = {
    timezone: ride.timezone || "UTC",
    reservationStatus: ride.reservationStatus || null,
    reservationExpiresAt: formatDate(ride.reservationExpiresAt),
    reservationConfirmedAt: formatDate(ride.reservationConfirmedAt),
    reservationAssignedAt: formatDate(ride.reservationAssignedAt),
    reservationAcceptedAt: formatDate(ride.reservationAcceptedAt),
    isSharingActive: ride.isSharingActive || false,
    shareToken: ride.shareToken || null,
    pickupVerificationMethod: ride.pickupVerification?.method || null,
    dropVerificationMethod: ride.dropVerification?.method || null,
  };

  return {
    reservation: {
      reservationId: ride._id.toString(),
      type: typeResolved,
      status: ride.status,
      category: ride.rideCategory?.name || "",
      city: serviceAreaInfo?.city || "Unknown",
      createdAt: formatDate(ride.createdAt),
      scheduledAt: formatDate(ride.scheduledAt),
      startedAt: formatDate(ride.startedAt),
      completedAt: formatDate(ride.completedAt),
    },
    passenger: passengerInfo,
    driver: driverInfo,
    vehicle: vehicleInfo,
    trip: {
      pickup: ride.pickup,
      destination: ride.destination,
      stops: ride.stops || [],
      distance: ride.routeInfo?.totalDistanceKm || 0,
      duration: ride.routeInfo?.totalDurationMinutes || 0,
    },
    fare: {
      baseFare: ride.fare?.baseFare || 0,
      distanceFare: ride.fare?.distanceFare || 0,
      timeFare: ride.fare?.timeFare || 0,
      surge: ride.fare?.surgeApplied || 0,
      platformFee: ride.fare?.commission || 0,
      discount: ride.fare?.discount || 0,
      tax: 0,
      tip: 0,
      totalFare: ride.fare?.total || 0,
      driverEarnings: ride.fare?.driverEarning || 0,
      currency: "USD",
    },
    payment: paymentInfo,
    timeline,
    cancellation: cancellationInfo,
    tracking: trackingInfo,
    metadata: metadataInfo,
  };
};

export const ReservationServices = {
  getReservationsOverviewFromDB,
  getReservationDetailsFromDB,
};
