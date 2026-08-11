import { Types } from "mongoose";
import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import { User } from "../user/user.model";
import { Ride } from "../ride/ride.model";
import { Wallet } from "../wallet/wallet.model";
import { Transaction } from "../transaction/transaction.model";
import { Review } from "../review/review.model";
import { EmergencyContact } from "../emergencyContact/emergencyContact.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { Tracking } from "../tracking/tracking.model";
import { STATUS, USER_ROLES } from "../../../enums/user";
import { RIDE_STATUS } from "../ride/ride.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { utcToTimezone } from "../../../shared/timezoneHelper";
import { createAuditLog } from "../rbac/rbac.utils";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { emailHelper } from "../../../helpers/emailHelper";
import { socketHelper } from "../../../helpers/socketHelper";

/**
 * Get paginated list of passengers overview
 */
const getPassengersOverview = async (queryParams: Record<string, any>) => {
  const { search, searchTerm, status, city, sortBy, sortOrder } = queryParams;
  const page = Number(queryParams.page) || 1;
  const limit = Number(queryParams.limit) || 10;

  // Build filter query
  const filterQuery: any = { role: USER_ROLES.USER };

  const term = search || searchTerm;
  if (term) {
    const searchRegex = new RegExp(term as string, "i");
    filterQuery.$or = [
      { name: { $regex: searchRegex } },
      { email: { $regex: searchRegex } },
      { phone: { $regex: searchRegex } },
    ];
    if (Types.ObjectId.isValid(term as string)) {
      filterQuery.$or.push({ _id: new Types.ObjectId(term as string) });
    }
  }

  if (status) {
    if (
      status === "inactive" ||
      status === "suspended" ||
      status === "banned"
    ) {
      filterQuery.status = STATUS.INACTIVE;
    } else if (status === "active") {
      filterQuery.status = STATUS.ACTIVE;
    } else {
      filterQuery.status = status;
    }
  }

  if (city) {
    filterQuery["location.address"] = { $regex: city, $options: "i" };
  }

  // Build sort
  const sort: any = {};
  if (sortBy) {
    const fieldMap: Record<string, string> = {
      fullName: "name",
      email: "email",
      averageRating: "averageRating",
      createdAt: "createdAt",
    };
    const sortField = fieldMap[sortBy] || sortBy;
    sort[sortField] = sortOrder === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  // Fetch passengers
  const passengers = await User.find(filterQuery)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(filterQuery);
  const totalPage = Math.ceil(total / limit);

  const passengerIds = passengers.map((p) => p._id);

  // Batch query total trips count and wallet balances to avoid N+1 queries
  const [rideCounts, wallets] = await Promise.all([
    Ride.aggregate([
      { $match: { userId: { $in: passengerIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]),
    Wallet.find({ userId: { $in: passengerIds } }).lean(),
  ]);

  const rideCountMap = new Map(
    rideCounts.map((r) => [r._id.toString(), r.count]),
  );
  const walletMap = new Map(
    wallets.map((w) => [w.userId.toString(), w.balance]),
  );

  // Format response rows
  const formattedData = passengers.map((user: any) => {
    let passengerCity = "Unknown";
    if (user.location?.address) {
      const addressParts = user.location.address.split(",");
      if (addressParts.length > 0) {
        passengerCity = addressParts[0].trim();
      }
    }

    return {
      passengerId: user._id.toString(),
      fullName: user.name,
      avatar: user.profileImage || "",
      email: user.email,
      averageRating: user.averageRating
        ? Number(user.averageRating.toFixed(1))
        : 0,
      totalTrips: rideCountMap.get(user._id.toString()) || 0,
      walletBalance: walletMap.get(user._id.toString()) || 0,
      city: passengerCity,
      accountStatus: user.status === STATUS.INACTIVE ? "Banned" : "Active",
    };
  });

  return {
    data: formattedData,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

/**
 * Get active passengers currently involved in an active ride
 */
const getLivePassengers = async (query: Record<string, any>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Active statuses matching the requirements
  const matchStage: any = {
    status: {
      $in: [
        RIDE_STATUS.DRIVER_ACCEPTED,
        RIDE_STATUS.DRIVER_ON_THE_WAY,
        RIDE_STATUS.DRIVER_ARRIVED,
        RIDE_STATUS.STARTED,
      ],
    },
  };

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "passenger",
      },
    },
    { $unwind: "$passenger" },
    { $match: { "passenger.role": USER_ROLES.USER } },
  ];

  // Lookup service area
  pipeline.push(
    {
      $lookup: {
        from: "serviceareas",
        localField: "serviceAreaId",
        foreignField: "_id",
        as: "serviceArea",
      },
    },
    { $unwind: { path: "$serviceArea", preserveNullAndEmptyArrays: true } },
  );

  // Search by passenger name, email, or phone
  const term = query.search || query.searchTerm;
  if (term) {
    const searchRegex = new RegExp(term as string, "i");
    pipeline.push({
      $match: {
        $or: [
          { "passenger.name": { $regex: searchRegex } },
          { "passenger.email": { $regex: searchRegex } },
          { "passenger.phone": { $regex: searchRegex } },
        ],
      },
    });
  }

  // City filter
  if (query.city) {
    pipeline.push({
      $match: {
        "serviceArea.city": { $regex: query.city, $options: "i" },
      },
    });
  }

  // Sort by ride request time
  pipeline.push({
    $sort: { createdAt: -1 },
  });

  // Facet pagination
  pipeline.push({
    $facet: {
      metadata: [{ $count: "total" }],
      data: [{ $skip: skip }, { $limit: limit }],
    },
  });

  const result = await Ride.aggregate(pipeline);
  const rides = result[0]?.data || [];
  const total = result[0]?.metadata[0]?.total || 0;
  const totalPage = Math.ceil(total / limit);

  const passengerIds = rides.map((r: any) => r.passenger._id);

  // Batch query total trips
  const rideCounts = await Ride.aggregate([
    { $match: { userId: { $in: passengerIds } } },
    { $group: { _id: "$userId", count: { $sum: 1 } } },
  ]);
  const rideCountMap = new Map(
    rideCounts.map((r) => [r._id.toString(), r.count]),
  );

  const formattedData = rides.map((r: any) => {
    let passengerCity = r.serviceArea?.city || "Unknown";
    if (passengerCity === "Unknown" && r.passenger?.location?.address) {
      const addressParts = r.passenger.location.address.split(",");
      if (addressParts.length > 0) {
        passengerCity = addressParts[0].trim();
      }
    }

    return {
      passengerId: r.passenger._id.toString(),
      fullName: r.passenger.name,
      avatar: r.passenger.profileImage || "",
      currentRideId: r._id.toString(),
      rideStatus: r.status,
      totalTrips: rideCountMap.get(r.passenger._id.toString()) || 0,
      averageRating: r.passenger.averageRating
        ? Number(r.passenger.averageRating.toFixed(1))
        : 0,
      city: passengerCity,
    };
  });

  return {
    data: formattedData,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

/**
 * Get suspended or banned passengers list
 */
const getSuspendedPassengers = async (queryParams: Record<string, any>) => {
  const result = await getPassengersOverview({
    ...queryParams,
    status: "inactive", // Forces suspended passengers list
  });

  const data = result.data.map((p: any) => {
    const { accountStatus, ...rest } = p;
    return {
      ...rest,
      suspensionStatus: "Banned",
    };
  });

  return {
    data,
    meta: result.meta,
  };
};

/**
 * Get detailed dashboard profile view for passenger
 */
const getPassengerDetails = async (passengerId: string) => {
  const user = await User.findOne({
    _id: passengerId,
    role: USER_ROLES.USER,
  }).lean();
  if (!user) {
    throw new ApiError(404, "Passenger not found");
  }

  // Query details in parallel to optimize DB load
  const [
    totalTrips,
    completedTrips,
    cancelledTrips,
    distanceResult,
    spentResult,
    walletDoc,
    walletStats,
    emergencyContactDoc,
    recentTrips,
    reviews,
  ] = await Promise.all([
    Ride.countDocuments({ userId: passengerId }),
    Ride.countDocuments({ userId: passengerId, status: RIDE_STATUS.COMPLETED }),
    Ride.countDocuments({
      userId: passengerId,
      status: {
        $in: [
          RIDE_STATUS.CANCELLED,
          RIDE_STATUS.CANCELLED_BY_USER,
          RIDE_STATUS.CANCELLED_BY_DRIVER,
        ],
      },
    }),
    Ride.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(passengerId),
          status: RIDE_STATUS.COMPLETED,
        },
      },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: "$routeInfo.totalDistanceKm" },
        },
      },
    ]),
    Ride.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(passengerId),
          status: RIDE_STATUS.COMPLETED,
        },
      },
      { $group: { _id: null, totalSpent: { $sum: "$fare.total" } } },
    ]),
    Wallet.findOne({ userId: passengerId }).lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(passengerId),
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: "$transactionType",
          total: { $sum: "$amount" },
        },
      },
    ]),
    EmergencyContact.findOne({ userId: passengerId, isActive: true }).lean(),
    Ride.find({ userId: passengerId }).sort({ createdAt: -1 }).limit(5).lean(),
    Review.find({ receiverId: passengerId })
      .sort({ createdAt: -1 })
      .populate("reviewerId", "name")
      .lean(),
  ]);

  const totalDistance = distanceResult[0]?.totalDistance || 0;
  const totalSpentFromRides = spentResult[0]?.totalSpent || 0;

  // Extract wallet transactions statistics
  let totalDeposits = 0;
  let totalSpentFromWallet = 0;
  let totalRefunds = 0;
  walletStats.forEach((stat) => {
    if (stat._id === TRANSACTION_TYPE.WALLET_TOPUP) {
      totalDeposits = stat.total;
    } else if (
      stat._id === TRANSACTION_TYPE.BOOKING_PAYMENT ||
      stat._id === TRANSACTION_TYPE.CANCELLATION_FEE
    ) {
      totalSpentFromWallet += stat.total;
    } else if (
      stat._id === TRANSACTION_TYPE.REFUND ||
      stat._id === TRANSACTION_TYPE.CANCELLATION_COMPENSATION
    ) {
      totalRefunds = stat.total;
    }
  });

  const tz = "UTC";
  const formatDate = (date?: Date | null): string | null => {
    if (!date) return null;
    return utcToTimezone(date, tz).toISO();
  };

  const basicInformation = {
    passengerId: user._id.toString(),
    fullName: user.name,
    avatar: user.profileImage || "",
    email: user.email,
    phone: user.phone || "",
    gender: user.gender || "male",
    dateOfBirth: user.dateOfBirth
      ? user.dateOfBirth.toISOString().split("T")[0]
      : null,
  };

  const account = {
    accountStatus: user.status === STATUS.INACTIVE ? "Banned" : "Active",
    createdAt: formatDate((user as any).createdAt),
    lastLogin: null,
    verificationStatus: user.verified ? "Verified" : "Unverified",
  };

  const rideStatistics = {
    totalTrips,
    completedTrips,
    cancelledTrips,
    totalDistance: Number(totalDistance.toFixed(2)),
    totalSpent: Number(totalSpentFromRides.toFixed(2)),
    averageRating: user.averageRating
      ? Number(user.averageRating.toFixed(1))
      : 0,
  };

  const wallet = {
    currentBalance: walletDoc?.balance || 0,
    totalDeposits: Number(totalDeposits.toFixed(2)),
    totalSpent: Number(totalSpentFromWallet.toFixed(2)),
    totalRefunds: Number(totalRefunds.toFixed(2)),
  };

  const emergencyContact = emergencyContactDoc
    ? {
        name: emergencyContactDoc.name,
        phone: emergencyContactDoc.phone,
        relationship: emergencyContactDoc.relationship || "",
      }
    : null;

  const formattedRecentTrips = recentTrips.map((r: any) => ({
    rideId: r._id.toString(),
    pickup: r.pickup.address,
    destination: r.destination.address,
    status: r.status,
    fare: r.fare?.total || 0,
    completedAt: formatDate(r.completedAt || r.updatedAt),
  }));

  const formattedRecentReviews = reviews.map((rev: any) => ({
    reviewerName: rev.reviewerId?.name || "Anonymous",
    rating: rev.rating,
    comment: rev.reviewText || "",
    createdAt: formatDate(rev.createdAt),
  }));

  return {
    basicInformation,
    account,
    rideStatistics,
    wallet,
    ...(emergencyContact ? { emergencyContact } : {}),
    recentTrips: formattedRecentTrips,
    recentReviews: formattedRecentReviews,
  };
};

/**
 * Get active ride details and live tracking for active passenger
 */
const getLivePassengerDetails = async (passengerId: string) => {
  const ride = await Ride.findOne({
    userId: passengerId,
    status: {
      $in: [
        RIDE_STATUS.DRIVER_ACCEPTED,
        RIDE_STATUS.DRIVER_ON_THE_WAY,
        RIDE_STATUS.DRIVER_ARRIVED,
        RIDE_STATUS.STARTED,
      ],
    },
  })
    .populate("serviceAreaId")
    .lean();

  if (!ride) {
    throw new ApiError(404, "No active ride found for this passenger");
  }

  const [passengerUser, driverDoc, trackingDoc] = await Promise.all([
    User.findById(ride.userId).select("name phone email profileImage status"),
    ride.driverId
      ? Driver.findOne({ userId: ride.driverId }).populate(
          "userId",
          "name phone email profileImage status",
        )
      : null,
    Tracking.findOne({ rideId: ride._id }),
  ]);

   const carDoc = driverDoc
    ? await Car.findOne({ driverId: driverDoc._id }).lean()
    : null;

  const tz = ride.timezone || "UTC";
  const formatDate = (date?: Date | null): string | null => {
    if (!date) return null;
    return utcToTimezone(date, tz).toISO();
  };

  const passenger = {
    passengerId: passengerUser?._id?.toString() || ride.userId.toString(),
    fullName: passengerUser?.name || "",
    avatar: passengerUser?.profileImage || "",
    phone: passengerUser?.phone || "",
  };

  const currentRide = {
    rideId: ride._id.toString(),
    rideStatus: ride.status,
    pickup: ride.pickup.address,
    destination: ride.destination.address,
    requestedAt: formatDate(ride.requestedAt),
    acceptedAt: formatDate(ride.acceptedAt),
  };

  let driver = null;
  if (driverDoc) {
    const driverUser = driverDoc.userId as any;
    driver = {
      driverId: driverUser?._id?.toString() || ride.driverId?.toString() || "",
      fullName: driverUser?.name || "",
      avatar: driverUser?.profileImage || "",
      rating: driverDoc.averageRating || 0,
      phone: driverUser?.phone || "",
    };
  }

  let vehicle = null;
  if (carDoc) {
    vehicle = {
      vehicleName: `${carDoc.brand} ${carDoc.model}`,
      vehicleNumber: carDoc.licensePlate,
      color: (carDoc as any).color || "N/A",
    };
  }

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

  const liveTracking = {
    driverLocation: trackingDoc?.driverLocation?.coordinates
      ? {
          latitude: trackingDoc.driverLocation.coordinates[1],
          longitude: trackingDoc.driverLocation.coordinates[0],
        }
      : null,
    passengerPickup: ride.pickup?.location?.coordinates
      ? {
          latitude: ride.pickup.location.coordinates[1],
          longitude: ride.pickup.location.coordinates[0],
          address: ride.pickup.address,
        }
      : null,
    destination: ride.destination?.location?.coordinates
      ? {
          latitude: ride.destination.location.coordinates[1],
          longitude: ride.destination.location.coordinates[0],
          address: ride.destination.address,
        }
      : null,
    ETA: trackingDoc?.estimatedArrivalMinutes || 0,
    remainingDistance: trackingDoc?.remainingDistanceKm || 0,
    progressPercentage: routeProgressPercentage,
  };

  const fare = {
    estimatedFare: ride.fare?.rideFare || ride.fare?.subtotal || 0,
    surge: ride.fare?.surgeApplied || 0,
    platformFee: ride.fare?.commission || 0,
    totalFare: ride.fare?.total || 0,
  };

  const timeline = [];
  if (ride.requestedAt) {
    timeline.push({
      status: "requested",
      title: "Trip Requested",
      createdAt: formatDate(ride.requestedAt),
    });
  }
  if (ride.acceptedAt) {
    timeline.push({
      status: "accepted",
      title: "Driver Accepted",
      createdAt: formatDate(ride.acceptedAt),
    });
  }
  const enRouteTime = ride.userApprovedAt || trackingDoc?.driverOnTheWayAt;
  if (enRouteTime) {
    timeline.push({
      status: "en_route",
      title: "Driver En Route",
      createdAt: formatDate(enRouteTime),
    });
  }
  if (ride.arrivedAt) {
    timeline.push({
      status: "arrived",
      title: "Driver Arrived",
      createdAt: formatDate(ride.arrivedAt),
    });
  }
  if (ride.startedAt) {
    timeline.push({
      status: "started",
      title: "Trip In Progress",
      createdAt: formatDate(ride.startedAt),
    });
  }
  if (ride.completedAt) {
    timeline.push({
      status: "completed",
      title: "Trip Completed",
      createdAt: formatDate(ride.completedAt),
    });
  }
  if (ride.cancellation?.cancelledAt) {
    timeline.push({
      status: "cancelled",
      title: "Trip Cancelled",
      createdAt: formatDate(ride.cancellation.cancelledAt),
    });
  }

  return {
    passenger,
    currentRide,
    ...(driver ? { driver } : {}),
    ...(vehicle ? { vehicle } : {}),
    liveTracking,
    fare,
    timeline,
  };
};

/**
 * Suspend Passenger: mark User status as inactive and write suspension details
 */
const suspendPassengerInDB = async (
  passengerId: string,
  adminId: string,
  reason?: string,
  note?: string,
  req?: Request,
) => {
  const user = await User.findOne({ _id: passengerId, role: USER_ROLES.USER });
  if (!user) {
    throw new ApiError(404, "Passenger not found");
  }

  // Update suspension details and status in User model
  await User.findByIdAndUpdate(passengerId, {
    $set: {
      status: STATUS.INACTIVE,
      "suspension.isSuspended": true,
      "suspension.suspendedBy": new Types.ObjectId(adminId),
      "suspension.suspendedAt": new Date(),
      "suspension.reason": reason || "",
      "suspension.note": note || "",
    },
  });

  // 1. Audit Log
  await createAuditLog(
    "PASSENGER_SUSPENDED",
    adminId,
    { passengerId, reason, note },
    req,
  );

  // 2. Push Notification
  await sendNotifications({
    receiver: user._id,
    type: NOTIFICATION_TYPE.USER,
    title: "Account Suspended",
    text: `Your account has been suspended. Reason: ${reason || "Policy violation."}`,
  });

  // 3. Email
  if (user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Alygo Account Suspension Notice",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>This is to inform you that your passenger account on <strong>Alygo</strong> has been suspended.</p>
          <p><strong>Reason:</strong> ${reason || "Policy violation."}</p>
          <p>If you believe this is a mistake, please reach out to customer support.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(user._id.toString(), "passenger-status-updated", {
    isSuspended: true,
    message: `Your passenger account has been suspended. Reason: ${reason}`,
  });

  return { success: true, message: "Passenger suspended successfully" };
};

/**
 * Unsuspend Passenger: mark User status as active and clear suspension details
 */
const unsuspendPassengerInDB = async (
  passengerId: string,
  adminId: string,
  req?: Request,
) => {
  const user = await User.findOne({ _id: passengerId, role: USER_ROLES.USER });
  if (!user) {
    throw new ApiError(404, "Passenger not found");
  }

  // Clear suspension details and set status active in User model
  await User.findByIdAndUpdate(passengerId, {
    $set: {
      status: STATUS.ACTIVE,
      "suspension.isSuspended": false,
      "suspension.suspendedBy": null,
      "suspension.suspendedAt": null,
      "suspension.reason": "",
      "suspension.note": "",
    },
  });

  // 1. Audit Log
  await createAuditLog("PASSENGER_UNSUSPENDED", adminId, { passengerId }, req);

  // 2. Push Notification
  await sendNotifications({
    receiver: user._id,
    type: NOTIFICATION_TYPE.USER,
    title: "Account Activated",
    text: "Your account suspension has been lifted. Welcome back!",
  });

  // 3. Email
  if (user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Alygo Account Reactivated",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>We are pleased to inform you that your passenger account on <strong>Alygo</strong> has been reactivated.</p>
          <p>You can now log in and request rides as normal.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(user._id.toString(), "passenger-status-updated", {
    isSuspended: false,
    message: "Your passenger account suspension has been lifted.",
  });

  return { success: true, message: "Passenger unsuspended successfully" };
};

export const PassengerManagementServices = {
  getPassengersOverview,
  getLivePassengers,
  getSuspendedPassengers,
  getPassengerDetails,
  getLivePassengerDetails,
  suspendPassengerInDB,
  unsuspendPassengerInDB,
};
