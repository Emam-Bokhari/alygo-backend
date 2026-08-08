import { Ride } from "../ride/ride.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { RIDE_STATUS, RIDE_TYPE } from "../ride/ride.constant";
import {
  ILiveTripsQuery,
  ILiveTripsResponse,
  ILiveTrip,
} from "./liveTrips.interface";
import { Tracking } from "../tracking/tracking.model";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { CancellationReason } from "../cancellationReason/cancellationReason.model";
import { utcToTimezone } from "../../../shared/timezoneHelper";
import ApiError from "../../../errors/ApiErrors";

const getLiveTripsFromDB = async (
  query: ILiveTripsQuery,
): Promise<ILiveTripsResponse> => {
  const {
    page = 1,
    limit = 10,
    searchTerm,
    status,
    rideCategoryId,
    driverId,
    passengerId,
    city,
    serviceAreaId,
    rideType,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build match stage
  const matchStage: any = {};

  // Status filter
  if (status) {
    matchStage.status = status;
  }

  // Ride category filter
  if (rideCategoryId) {
    matchStage["rideCategory.categoryId"] = rideCategoryId;
  }

  // Driver filter
  if (driverId) {
    matchStage.driverId = driverId;
  }

  // Passenger filter
  if (passengerId) {
    matchStage.userId = passengerId;
  }

  // Service area filter
  if (serviceAreaId) {
    matchStage.serviceAreaId = serviceAreaId;
  }

  // Ride type filter
  if (rideType) {
    matchStage.rideType = rideType;
  }

  // Date range filter
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) {
      matchStage.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      matchStage.createdAt.$lte = new Date(endDate);
    }
  }

  // Search filter - search across tripId, driver name, passenger name, pickup address, dropoff address
  const searchStage: any = {};
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm, "i");
    searchStage.$or = [
      { tripId: { $regex: searchRegex } },
      { "driver.name": { $regex: searchRegex } },
      { "passenger.name": { $regex: searchRegex } },
      { pickup: { $regex: searchRegex } },
      { dropoff: { $regex: searchRegex } },
    ];
  }

  // Build sort stage
  const sortStage: any = {};
  const validSortFields = ["createdAt", "fare", "status", "tripId"];
  const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  sortStage[sortField] = sortOrder === "asc" ? 1 : -1;

  // Aggregation pipeline
  const pipeline: any[] = [
    // Match stage - filter rides first
    {
      $match: matchStage,
    },
    // Lookup driver (from User collection since driverId references User)
    {
      $lookup: {
        from: "users",
        localField: "driverId",
        foreignField: "_id",
        as: "driver",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$driver",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Lookup passenger (from User collection)
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "passenger",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$passenger",
        preserveNullAndEmptyArrays: false,
      },
    },
    // Lookup service area for city
    {
      $lookup: {
        from: "serviceareas",
        localField: "serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
        pipeline: [
          {
            $project: {
              city: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$serviceArea",
        preserveNullAndEmptyArrays: true,
      },
    },
    // Apply search filter after lookups
    ...(searchTerm ? [{ $match: searchStage }] : []),
    // Apply city filter after lookup
    ...(city
      ? [
          {
            $match: {
              "serviceArea.city": { $regex: city, $options: "i" },
            },
          },
        ]
      : []),
    // Project only required fields
    {
      $project: {
        _id: 1,
        tripId: 1,
        driver: {
          _id: "$driver._id",
          name: { $ifNull: ["$driver.name", ""] },
        },
        passenger: {
          _id: "$passenger._id",
          name: "$passenger.name",
        },
        category: "$rideCategory.name",
        pickup: "$pickup.address",
        dropoff: "$destination.address",
        city: { $ifNull: ["$serviceArea.city", ""] },
        status: 1,
        fare: "$fare.total",
        createdAt: 1,
      },
    },
    // Sort
    {
      $sort: sortStage,
    },
    // Facet for pagination
    {
      $facet: {
        items: [
          {
            $skip: (page - 1) * limit,
          },
          {
            $limit: limit,
          },
        ],
        totalCount: [
          {
            $count: "count",
          },
        ],
      },
    },
  ];

  const result = await Ride.aggregate(pipeline);

  const data = result[0]?.items || [];
  const totalItems = result[0]?.totalCount[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: data as ILiveTrip[],
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  };
};

const getLiveTripByIdFromDB = async (rideId: string): Promise<any> => {
  const ride = await Ride.findById(rideId).populate("serviceAreaId");
  if (!ride) {
    throw new ApiError(404, "Ride not found");
  }

  // Fetch associated documents in parallel
  const [passengerUser, driverDoc, trackingDoc] = await Promise.all([
    User.findById(ride.userId).select(
      "name phone email profileImage averageRating status",
    ),
    ride.driverId
      ? Driver.findOne({ userId: ride.driverId }).populate(
          "userId",
          "name phone email profileImage status",
        )
      : null,
    Tracking.findOne({ rideId }),
  ]);

  // Fetch car and cancellation reason if needed
  const [carDoc, cancellationReasonDoc] = await Promise.all([
    driverDoc
      ? Car.findOne({ driverId: driverDoc._id, isVerified: true })
      : null,
    ride.cancellation?.cancellationReasonId
      ? CancellationReason.findById(ride.cancellation.cancellationReasonId)
      : null,
  ]);

  const tz = ride.timezone || "UTC";

  // Helper to format dates consistently with the ride's timezone
  const formatDate = (date?: Date | null): string | null => {
    if (!date) return null;
    return utcToTimezone(date, tz).toISO();
  };

  // 1. Ride Information
  const rideInfo = {
    rideId: ride._id.toString(),
    bookingReference: `TR-${ride._id.toString().slice(-4).toUpperCase()}`,
    status: ride.status,
    rideCategory: ride.rideCategory.name,
    city: (ride.serviceAreaId as any)?.city || "",
    estimatedDistance: ride.routeInfo.totalDistanceKm,
    estimatedDuration: ride.routeInfo.totalDurationMinutes,
    createdAt: formatDate(ride.createdAt),
    acceptedAt: formatDate(ride.acceptedAt),
    startedAt: formatDate(ride.startedAt),
    completedAt: formatDate(ride.completedAt),
  };

  // 2. Driver Information
  let driverInfo = null;
  if (driverDoc) {
    const driverUser = driverDoc.userId as any;
    driverInfo = {
      id: driverUser?._id?.toString() || "",
      fullName: driverUser?.name || "",
      phone: driverUser?.phone || "",
      email: driverUser?.email || "",
      avatar: driverUser?.profileImage || "",
      overallRating: driverDoc.averageRating || 0,
      vehicleName: carDoc ? `${carDoc.brand} ${carDoc.model}` : "",
      vehicleNumber: carDoc?.licensePlate || "",
      driverStatus: driverUser?.status || "",
    };
  }

  // 3. Passenger Information
  const passengerInfo = passengerUser
    ? {
        id: passengerUser._id.toString(),
        fullName: passengerUser.name || "",
        phone: passengerUser.phone || "",
        email: passengerUser.email || "",
        avatar: passengerUser.profileImage || "",
        overallRating: passengerUser.averageRating || 0,
        passengerStatus: passengerUser.status || "",
      }
    : null;

  // 4. Pickup
  const pickup = {
    address: ride.pickup.address,
    latitude: ride.pickup?.location?.coordinates?.[1] ?? 0,
    longitude: ride.pickup?.location?.coordinates?.[0] ?? 0,
  };

  // 5. Dropoff
  const dropoff = {
    address: ride.destination.address,
    latitude: ride.destination?.location?.coordinates?.[1] ?? 0,
    longitude: ride.destination?.location?.coordinates?.[0] ?? 0,
  };

  // 6. Stops
  const stops = ride.stops
    ? ride.stops.map((stop: any) => ({
        address: stop.address,
        latitude: stop.location?.coordinates?.[1] ?? 0,
        longitude: stop.location?.coordinates?.[0] ?? 0,
        sequence: stop.order,
      }))
    : [];

  // Route progress calculation
  let routeProgressPercentage = 0;
  if (
    trackingDoc &&
    trackingDoc.totalDistanceKm &&
    trackingDoc.remainingDistanceKm
  ) {
    const total = trackingDoc.totalDistanceKm;
    const remaining = trackingDoc.remainingDistanceKm;
    if (total > 0) {
      routeProgressPercentage = Math.round(((total - remaining) / total) * 100);
      routeProgressPercentage = Math.max(
        0,
        Math.min(100, routeProgressPercentage),
      );
    }
  }

  // 7. Live Tracking
  const liveTracking = trackingDoc
    ? {
        currentDriverLocation: trackingDoc.driverLocation?.coordinates
          ? {
              latitude: trackingDoc.driverLocation.coordinates[1],
              longitude: trackingDoc.driverLocation.coordinates[0],
            }
          : null,
        heading: (trackingDoc as any).heading || 0,
        speed: (trackingDoc as any).speed || 0,
        lastUpdated: formatDate(
          trackingDoc.lastDriverLocationUpdateAt ||
            trackingDoc.lastUpdatedAt ||
            (trackingDoc as any).updatedAt,
        ),
        routePolyline: trackingDoc.polyline || ride.routeInfo.polyline || "",
        ETA: trackingDoc.estimatedArrivalMinutes || 0,
        routeProgressPercentage,
      }
    : {
        currentDriverLocation: null,
        heading: 0,
        speed: 0,
        lastUpdated: null,
        routePolyline: ride.routeInfo.polyline || "",
        ETA: 0,
        routeProgressPercentage: 0,
      };

  // 8. Fare Summary
  const fareSummary = {
    baseFare: ride.fare.baseFare,
    distanceFare: ride.fare.distanceFare,
    durationFare: ride.fare.timeFare,
    surgeFare: ride.fare.surgeApplied || 0,
    waitingCharge: ride.fare.stopWaitingCharge || 0,
    tollCharge: 0,
    platformFee: ride.fare.commission,
    discount: ride.fare.discount,
    totalFare: ride.fare.total,
    paymentMethod: ride.payment.method || null,
    paymentStatus: ride.payment.status || null,
  };

  // 9. Ride Timeline
  const timeline = [];
  if (ride.requestedAt) {
    timeline.push({
      status: "requested",
      title: "Trip Requested",
      timestamp: formatDate(ride.requestedAt),
    });
  }
  if (ride.acceptedAt) {
    timeline.push({
      status: "accepted",
      title: "Driver Accepted",
      timestamp: formatDate(ride.acceptedAt),
    });
  }
  const enRouteTime = ride.userApprovedAt || trackingDoc?.driverOnTheWayAt;
  if (enRouteTime) {
    timeline.push({
      status: "en_route",
      title: "Driver En Route",
      timestamp: formatDate(enRouteTime),
    });
  }
  if (ride.arrivedAt) {
    timeline.push({
      status: "arrived",
      title: "Driver Arrived",
      timestamp: formatDate(ride.arrivedAt),
    });
  }
  if (ride.startedAt) {
    timeline.push({
      status: "started",
      title: "Trip In Progress",
      timestamp: formatDate(ride.startedAt),
    });
  }
  if (ride.completedAt) {
    timeline.push({
      status: "completed",
      title: "Trip Completed",
      timestamp: formatDate(ride.completedAt),
    });
  }
  if (ride.cancellation?.cancelledAt) {
    timeline.push({
      status: "cancelled",
      title: "Trip Cancelled",
      timestamp: formatDate(ride.cancellation.cancelledAt),
    });
  }

  // 10. Cancellation
  const cancellation = ride.cancellation?.cancelledAt
    ? {
        cancelled: true,
        cancelledBy: ride.cancellation.cancelledBy,
        reason: ride.cancellation.cancellationReasonName || "",
        description: cancellationReasonDoc?.description || "",
        cancelledAt: formatDate(ride.cancellation.cancelledAt),
      }
    : null;

  // 11. Safety Events
  const safetyEvents: any[] = [];

  // 12. Map Information
  const mapInformation = {
    driverLocation: liveTracking.currentDriverLocation,
    pickup: {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
      address: pickup.address,
    },
    dropoff: {
      latitude: dropoff.latitude,
      longitude: dropoff.longitude,
      address: dropoff.address,
    },
    polyline: liveTracking.routePolyline,
    ETA: liveTracking.ETA,
    routeProgress: liveTracking.routeProgressPercentage,
  };

  return {
    ride: rideInfo,
    driver: driverInfo,
    passenger: passengerInfo,
    pickup,
    dropoff,
    stops,
    liveTracking,
    fareSummary,
    timeline,
    cancellation,
    safetyEvents,
    mapInformation,
  };
};

export const LiveTripsService = {
  getLiveTripsFromDB,
  getLiveTripByIdFromDB,
};
