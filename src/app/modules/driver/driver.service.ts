import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import config from "../../../config";
import { User } from "../user/user.model";
import { Driver } from "./driver.model";
import { IDriver } from "./driver.interface";
import { DRIVER_AVAILABILITY_STATUS, VERIFICATION_STATUS } from "./driver.constant";
import { DriverVerificationService } from "./driver.verification.service";
import { DriverDutyPolicyServices } from "../driverDutyPolicy/driverDutyPolicy.service";
import { Review } from "../review/review.model";
import { calculateDriverAcceptanceRate } from "../tier/points.service";
import { DriverDutyPolicy } from "../driverDutyPolicy/driverDutyPolicy.model";
import { ServiceAreaServices } from "../serviceArea/serviceArea.service";
import { getDayRangeInTimezone } from "../../../shared/timezoneHelper";
import { DateTime } from "luxon";
import { Car } from "../car/car.model";
import { DRIVER_STATUS } from "../../../enums/user";
import path from "path";
import fs from "fs";
import { compareFaces } from "../../../helpers/rekognitionHelper";

const calculateDocumentsStatus = async (userId: string, driverDoc?: any) => {
  const user = await User.findById(userId);
  const driver =
    driverDoc || (await Driver.findOne({ userId: new Types.ObjectId(userId) }));
  if (!driver) return null;

  const car = await Car.findOne({ driverId: driver._id });

  return {
    profilePhoto: !!user?.profileImage,
    liveSelfie: !!driver?.liveSelfie,
    ssn: !!(driver?.ssn || driver?.ssnCard),
    drivingLicense: !!(driver?.drivingLicense || driver?.drivingLicenseNumber),
    taxDocuments: !!(driver?.taxDocument || driver?.taxIdValue),
    licensePlate: !!car?.licensePlate,
    personalAutoInsurance: !!car?.personalAutoInsurance,
    vehicleRegistration: !!car?.vehicleRegistration,
    carInsurance: !!(
      car?.commercialInsurance ||
      car?.personalAutoInsurance ||
      (car?.insuranceHub && car.insuranceHub.length > 0)
    ),
    vehicleInspection: !!car?.vehicleInspection,
  };
};

const createDriverToDB = async (userId: string, payload: Partial<IDriver>) => {
  const existingUser = await User.isExistUserById(userId);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  let existingDriver = await Driver.findOne({
    userId: new Types.ObjectId(userId),
  });

  // Extract profileImage and update User if present
  const { profileImage, ...payloadRest } = payload as any;
  if (profileImage) {
    await User.findByIdAndUpdate(userId, { profileImage });
  }

  if (!existingDriver) {
    existingDriver = await Driver.create({
      userId: new Types.ObjectId(userId),
      ...payloadRest,
      approvalStatus: DRIVER_STATUS.PENDING,
    });
  } else {
    // Reset approval status to pending when updating verification details
    payloadRest.approvalStatus = DRIVER_STATUS.PENDING;

    // Prevent updating liveSelfie if it already exists
    if (
      existingDriver.liveSelfie &&
      existingDriver.liveSelfie.trim() !== "" &&
      payloadRest.liveSelfie
    ) {
      delete payloadRest.liveSelfie;
    }

    existingDriver = await Driver.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      payloadRest,
      { new: true },
    );
  }

  // Update user role to driver
  await User.findByIdAndUpdate(userId, { role: "driver" });

  // Calculate and store documents status
  const docStatus = await calculateDocumentsStatus(userId, existingDriver);
  if (docStatus) {
    existingDriver = await Driver.findOneAndUpdate(
      { userId: existingDriver!.userId },
      { $set: { documentsStatus: docStatus } },
      { new: true },
    );
  }

  // Trigger Checkr MVR Verification automatically behind the scenes
  if (config.checkr.apiKey) {
    DriverVerificationService.triggerMVRVerification(
      existingDriver!._id.toString(),
    ).catch((err) => {
      console.error(
        "MVR Verification trigger error in createDriverToDB:",
        err.message || err,
      );
    });
  }

  const populatedDriver = await Driver.findById(existingDriver!._id)
    .populate("userId", "name profileImage phone email")
    .lean();

  const car = await Car.findOne({ driverId: existingDriver!._id }).lean();

  return {
    ...populatedDriver,
    car,
  };
};

const getDriverProfileFromDB = async (userId: string) => {
  let driver = await Driver.findOne({ userId: new Types.ObjectId(userId) })
    .populate("userId", "name profileImage phone email")
    .lean();

  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // Recalculate document status to make sure it's accurate
  const docStatus = await calculateDocumentsStatus(userId, driver);
  if (docStatus) {
    await Driver.updateOne(
      { _id: driver._id },
      { $set: { documentsStatus: docStatus } },
    );
    driver.documentsStatus = docStatus;
  }

  const car = await Car.findOne({ driverId: driver._id }).lean();

  return {
    ...driver,
    car,
  };
};

const updateDriverFromDB = async (
  userId: string,
  payload: Partial<IDriver>,
) => {
  const existingUser = await User.isExistUserById(userId);

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const existingDriver = await Driver.findOne({
    userId: new Types.ObjectId(userId),
  });

  if (!existingDriver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // Extract profileImage and update User if present
  const { profileImage, ...payloadRest } = payload as any;
  if (profileImage) {
    await User.findByIdAndUpdate(userId, { profileImage });
  }

  const { userId: _, ...updatePayload } = payloadRest as Partial<IDriver> & {
    userId?: Types.ObjectId;
  };

  // Prevent updating liveSelfie if it already exists
  if (
    existingDriver.liveSelfie &&
    existingDriver.liveSelfie.trim() !== "" &&
    updatePayload.liveSelfie
  ) {
    delete updatePayload.liveSelfie;
  }

  // If driver attempts to go online, check if they have an active ride/trip.
  // If they do, their availability status must remain or revert to "on_trip".
  if (updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE) {
    const { Ride } = require("../ride/ride.model");
    const { RIDE_STATUS } = require("../ride/ride.constant");
    const activeRide = await Ride.findOne({
      driverId: new Types.ObjectId(userId),
      status: {
        $in: [
          RIDE_STATUS.DRIVER_ACCEPTED,
          RIDE_STATUS.DRIVER_ON_THE_WAY,
          RIDE_STATUS.DRIVER_ARRIVED,
          RIDE_STATUS.STARTED,
        ],
      },
    });

    if (activeRide) {
      updatePayload.driverAvailabilityStatus = DRIVER_AVAILABILITY_STATUS.ON_TRIP;
    }
  }

  // Determine if driver is going online or changing service area while online
  const isGoingOnline =
    updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE &&
    existingDriver.driverAvailabilityStatus !== DRIVER_AVAILABILITY_STATUS.ONLINE;

  const isOnlineOrGoingOnline =
    updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE ||
    (updatePayload.driverAvailabilityStatus === undefined &&
      existingDriver.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE);

  const hasNewServiceArea =
    updatePayload.serviceAreaId !== undefined &&
    updatePayload.serviceAreaId.toString() !==
      existingDriver.serviceAreaId?.toString();

  if (isGoingOnline || (isOnlineOrGoingOnline && hasNewServiceArea)) {
    const targetServiceAreaId =
      updatePayload.serviceAreaId || existingDriver.serviceAreaId;

    if (!targetServiceAreaId) {
      throw new ApiError(
        400,
        "Please select a service area before going online.",
      );
    }

    const serviceArea = await ServiceArea.findById(targetServiceAreaId);
    if (!serviceArea) {
      throw new ApiError(404, "Selected service area not found");
    }

    if (serviceArea.status !== "active") {
      throw new ApiError(400, "Selected service area is not active");
    }

    if (serviceArea.maxDrivers && serviceArea.maxDrivers > 0) {
      const activeDriversCount = await Driver.countDocuments({
        serviceAreaId: targetServiceAreaId,
        driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS.ONLINE,
        userId: { $ne: existingDriver.userId },
      });

      if (activeDriversCount >= serviceArea.maxDrivers) {
        throw new ApiError(
          400,
          `Driver capacity limit reached for ${
            serviceArea.city || serviceArea.zone || "this service area"
          }. You cannot go online at this time.`,
        );
      }
    }
  }

  // Handle service area assigned and changed dates
  if (
    updatePayload.serviceAreaId !== undefined &&
    updatePayload.serviceAreaId.toString() !==
      existingDriver.serviceAreaId?.toString()
  ) {
    if (!existingDriver.serviceAreaId) {
      updatePayload.serviceAreaAssignedAt = new Date();
    } else {
      updatePayload.serviceAreaChangedAt = new Date();
    }
  }

  // Handle HOS timestamps automatically
  if (
    updatePayload.driverAvailabilityStatus !== undefined &&
    updatePayload.driverAvailabilityStatus !==
      existingDriver.driverAvailabilityStatus
  ) {
    if (
      updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ONLINE ||
      updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.ON_TRIP
    ) {
      // Set lastOnlineAt only if transitioning from an inactive status (offline or break)
      if (
        existingDriver.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.OFFLINE ||
        existingDriver.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.BREAK
      ) {
        updatePayload.lastOnlineAt = new Date();
      }
    } else if (
      updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.OFFLINE ||
      updatePayload.driverAvailabilityStatus === DRIVER_AVAILABILITY_STATUS.BREAK
    ) {
      updatePayload.lastOfflineAt = new Date();
    }
  }

  // Set approval status to pending if rider updates registration details (prevent self-approval bypass)
  const hasUpdatedDetails =
    Object.keys(updatePayload).some(
      (key) =>
        ![
          "driverAvailabilityStatus",
          "lastOnlineAt",
          "lastOfflineAt",
          "location",
        ].includes(key),
    ) || profileImage;

  if (hasUpdatedDetails) {
    updatePayload.approvalStatus = DRIVER_STATUS.PENDING;
  }

  // Reset verification status if license info changes to trigger a new MVR check
  const isLicenseUpdated =
    (updatePayload.drivingLicense !== undefined &&
      updatePayload.drivingLicense !== existingDriver.drivingLicense) ||
    (updatePayload.drivingLicenseNumber !== undefined &&
      updatePayload.drivingLicenseNumber !==
        existingDriver.drivingLicenseNumber) ||
    (updatePayload.drivingLicenseState !== undefined &&
      updatePayload.drivingLicenseState !== existingDriver.drivingLicenseState);

  if (isLicenseUpdated) {
    updatePayload.mvrStatus = VERIFICATION_STATUS.PENDING;
  }

  const updatedDriver = await Driver.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    updatePayload,
    { new: true, runValidators: true },
  );

  // Calculate documents status
  const docStatus = await calculateDocumentsStatus(userId, updatedDriver);
  if (docStatus) {
    await Driver.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { documentsStatus: docStatus } },
    );
  }

  // Trigger Checkr MVR Verification automatically behind the scenes
  if (hasUpdatedDetails && config.checkr.apiKey) {
    DriverVerificationService.triggerMVRVerification(
      existingDriver._id.toString(),
    ).catch((err) => {
      console.error(
        "MVR Verification trigger error in updateDriverFromDB:",
        err.message || err,
      );
    });
  }

  const finalDriver = await Driver.findOne({
    userId: new Types.ObjectId(userId),
  })
    .populate("userId", "name profileImage phone email")
    .lean();

  const car = await Car.findOne({ driverId: existingDriver._id }).lean();

  return {
    ...finalDriver,
    car,
  };
};

const getDriverAvailability = async (userId: string) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  const availabilityData =
    await DriverDutyPolicyServices.getDriverAvailability(userId);

  // Update driver's availability in database
  await Driver.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    {
      $set: {
        "availability.canReceiveRide": availabilityData.canReceiveRide,
        "availability.blockedReason": availabilityData.blockedReason,
        "availability.blockedUntil": availabilityData.blockedUntil,
      },
    },
  );

  return availabilityData;
};

import { Ride } from "../ride/ride.model";
import {
  RIDE_TYPE,
  RIDE_STATUS,
  DRIVER_MATCHING_STATUS,
} from "../ride/ride.constant";
import QueryBuilder from "../../builder/queryBuilder";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { getCurrentTimeInTimezone } from "../../../shared/timezoneHelper";
import { ServiceArea } from "../serviceArea/serviceArea.model";

const getDriverReservationsFromDB = async (
  driverUserId: string,
  query: Record<string, unknown>,
) => {
  const systemConfig = await getSystemConfig();
  const visibleBeforeMs =
    (systemConfig.reservation.driverVisibleBeforeMinutes || 60) * 60 * 1000;

  const now = new Date();
  const visibilityWindowMaxDate = new Date(now.getTime() + visibleBeforeMs);

  const statusFilter = query.status as string; // "upcoming", "today", "completed", "cancelled", "all"

  const filterQuery: Record<string, any> = {
    rideType: RIDE_TYPE.SCHEDULED,
    $or: [
      { assignedDriverId: new Types.ObjectId(driverUserId) },
      { driverId: new Types.ObjectId(driverUserId) },
      {
        $and: [
          { status: RIDE_STATUS.SEARCHING_DRIVER },
          {
            "driverMatching.notifiedDrivers": {
              $elemMatch: {
                driverId: new Types.ObjectId(driverUserId),
                status: DRIVER_MATCHING_STATUS.SENT,
              },
            },
          },
        ],
      },
    ],
  };

  // Get driver's service area for timezone-aware date calculations
  const driver = await Driver.findOne({
    userId: new Types.ObjectId(driverUserId),
  });
  let driverTimezone = "UTC";
  if (driver?.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || "UTC";
  }

  // Calculate start/end of day in driver's timezone
  const startOfDay = getCurrentTimeInTimezone(driverTimezone)
    .startOf("day")
    .toUTC()
    .toJSDate();
  const endOfDay = getCurrentTimeInTimezone(driverTimezone)
    .endOf("day")
    .toUTC()
    .toJSDate();

  if (statusFilter === "upcoming") {
    filterQuery.status = {
      $in: [RIDE_STATUS.SEARCHING_DRIVER, RIDE_STATUS.DRIVER_ACCEPTED],
    };
    filterQuery.scheduledAt = {
      $gte: now,
      $lte: visibilityWindowMaxDate,
    };
  } else if (statusFilter === "today") {
    filterQuery.scheduledAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  } else if (statusFilter === "completed") {
    filterQuery.status = RIDE_STATUS.COMPLETED;
  } else if (statusFilter === "cancelled") {
    filterQuery.status = {
      $in: [
        RIDE_STATUS.CANCELLED,
        RIDE_STATUS.CANCELLED_BY_USER,
        RIDE_STATUS.CANCELLED_BY_DRIVER,
        RIDE_STATUS.EXPIRED,
      ],
    };
  } else {
    filterQuery.$and = [
      {
        $or: [
          { status: { $ne: RIDE_STATUS.SEARCHING_DRIVER } },
          { scheduledAt: { $lte: visibilityWindowMaxDate } },
        ],
      },
    ];
  }

  const reservationQuery = new QueryBuilder(
    Ride.find(filterQuery).populate("userId", "name profileImage phone"),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await reservationQuery.modelQuery;
  const meta = await reservationQuery.countTotal();

  return { data, meta };
};

const getDriverPerformanceMetrics = async (driverUserId: string) => {
  const driverUserIdObj = new Types.ObjectId(driverUserId);
  const driver = await Driver.findOne({ userId: driverUserIdObj });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // 1. Fetch reviews to compute rating stats and get distribution
  const reviews = await Review.find({
    receiverId: driverUserIdObj,
    receiverRole: "driver",
    status: "active",
  })
    .populate("reviewerId", "name profileImage")
    .sort({ createdAt: -1 });

  const totalReviews = reviews.length;
  const ratingDistribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  let sumRatings = 0;
  reviews.forEach((r) => {
    sumRatings += r.rating;
    const star = r.rating.toString();
    if (star in ratingDistribution) {
      ratingDistribution[star as keyof typeof ratingDistribution]++;
    }
  });

  const averageRating =
    totalReviews > 0 ? Number((sumRatings / totalReviews).toFixed(2)) : 0;

  // 2. Fetch recent passenger reviews (up to 5)
  const passengerReviews = reviews.slice(0, 5).map((r) => {
    const reviewer = r.reviewerId as any;
    return {
      _id: r._id,
      reviewerName: reviewer?.name || "Anonymous",
      reviewerImage: reviewer?.profileImage || "",
      rating: r.rating,
      reviewText: r.reviewText || "",
      createdAt: r.createdAt,
    };
  });

  // 3. Compute Acceptance Rate
  const acceptanceRate = Number(
    (await calculateDriverAcceptanceRate(driverUserIdObj)).toFixed(1),
  );

  // 4. Compute other Operational & Performance Metrics from Ride History
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ridesData = await Ride.aggregate([
    {
      $match: {
        driverId: driverUserIdObj,
      },
    },
    {
      $group: {
        _id: null,
        // Lifetime metrics
        totalTrips: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
          },
        },
        totalMileageKm: {
          $sum: {
            $cond: [
              { $eq: ["$status", "completed"] },
              { $ifNull: ["$routeInfo.totalDistanceKm", 0] },
              0,
            ],
          },
        },
        totalOnlineMs: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$status", "completed"] },
                  { $ne: ["$startedAt", null] },
                  { $ne: ["$completedAt", null] },
                ],
              },
              { $subtract: ["$completedAt", "$startedAt"] },
              0,
            ],
          },
        },
        // 30 days cancellation metrics
        totalAcceptedLast30Days: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", thirtyDaysAgo] }, 1, 0],
          },
        },
        totalCancelledByDriverLast30Days: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", thirtyDaysAgo] },
                  { $eq: ["$status", "cancelled_by_driver"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = ridesData[0] || {
    totalTrips: 0,
    totalMileageKm: 0,
    totalOnlineMs: 0,
    totalAcceptedLast30Days: 0,
    totalCancelledByDriverLast30Days: 0,
  };

  const totalTrips = stats.totalTrips;
  // Convert KM to Miles
  const totalMileage = Number((stats.totalMileageKm * 0.621371).toFixed(1));
  const onlineHours = Number(
    (stats.totalOnlineMs / (1000 * 60 * 60)).toFixed(1),
  );

  // Cancellation rate over last 30 days: (Cancelled / Accepted) * 100
  const cancellationRate =
    stats.totalAcceptedLast30Days > 0
      ? Number(
          (
            (stats.totalCancelledByDriverLast30Days /
              stats.totalAcceptedLast30Days) *
            100
          ).toFixed(1),
        )
      : 0;

  // Completion Rate: Completed Rides / Total Assigned Rides * 100
  const totalAssignedRides = await Ride.countDocuments({
    driverId: driverUserIdObj,
  });

  const completionRate =
    totalAssignedRides > 0
      ? Number(((totalTrips / totalAssignedRides) * 100).toFixed(0))
      : 100;

  return {
    performanceOverview: {
      aggregateRating: averageRating,
      totalReviews,
      ratingDistribution,
      acceptanceRate,
      cancellationRate,
    },
    operationalMetrics: {
      onlineHours,
      totalTrips,
      totalMileage,
      driverRating: averageRating,
      totalReview: totalReviews,
      completionRate,
    },
    passengerReviews,
  };
};

const getDriverDrivingHours = async (userId: string) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // 1. Resolve timezone and service area
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  let serviceArea = null;

  if (driver.serviceAreaId) {
    serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  if (
    driver.location &&
    driver.location.coordinates &&
    driver.location.coordinates[0] !== 0
  ) {
    const [lon, lat] = driver.location.coordinates;
    const coordServiceArea =
      await ServiceAreaServices.findServiceAreaByCoordinates(lon, lat);
    if (coordServiceArea) {
      serviceArea = coordServiceArea;
      driverTimezone = serviceArea.timezone || defaultTimezone;
    }
  }

  // 2. Resolve active duty policy
  let policy = null;
  if (serviceArea) {
    const pQuery: any = { status: "active" };
    if (serviceArea.type === "city") pQuery.cityId = serviceArea._id;
    else if (serviceArea.type === "zone") pQuery.zoneId = serviceArea._id;
    else if (serviceArea.type === "airport") pQuery.airportId = serviceArea._id;
    else if (serviceArea.type === "state") pQuery.stateId = serviceArea._id;
    else if (serviceArea.type === "country") pQuery.countryId = serviceArea._id;
    policy = await DriverDutyPolicy.findOne(pQuery);
  }
  if (!policy) {
    policy = await DriverDutyPolicy.findOne({
      scopeType: "global",
      status: "active",
    });
  }

  const dailyLimit = policy ? policy.maxDrivingHoursPerDay : 12; // default to 12 if no policy
  const maxContinuousDrivingHours = policy
    ? policy.maxContinuousDrivingHours
    : 0;
  const breakDurationMinutes = policy ? policy.breakDurationMinutes : 30;

  // 3. Query completed rides for today
  const dayRange = getDayRangeInTimezone("today", driverTimezone);
  const completedRides = await Ride.find({
    driverId: driver.userId,
    status: RIDE_STATUS.COMPLETED,
    completedAt: { $gte: dayRange.start, $lte: dayRange.end },
  }).sort({ completedAt: 1 });

  // 4. Calculate driving & ride hours
  let drivingHoursToday = 0;
  let rideHoursToday = 0;
  for (const ride of completedRides) {
    if (ride.startedAt && ride.completedAt) {
      const durationHrs =
        (ride.completedAt.getTime() - ride.startedAt.getTime()) /
        (1000 * 60 * 60);
      drivingHoursToday += durationHrs;

      const acceptedAtTime = ride.acceptedAt || ride.startedAt;
      const rideDurationHrs =
        (ride.completedAt.getTime() - acceptedAtTime.getTime()) /
        (1000 * 60 * 60);
      rideHoursToday += rideDurationHrs;
    }
  }

  // Add ongoing started rides
  const startedRides = await Ride.find({
    driverId: driver.userId,
    status: RIDE_STATUS.STARTED,
  });
  let ongoingDrivingHrs = 0;
  for (const ride of startedRides) {
    if (ride.startedAt) {
      const durationHrs =
        (Date.now() - ride.startedAt.getTime()) / (1000 * 60 * 60);
      ongoingDrivingHrs += durationHrs;
    }
  }
  drivingHoursToday += ongoingDrivingHrs;
  rideHoursToday += ongoingDrivingHrs;

  const remainingHours = Math.max(0, dailyLimit - drivingHoursToday);

  // 5. Calculate break hours today
  let breakHoursToday = 0;
  if (completedRides.length > 1) {
    for (let i = 0; i < completedRides.length - 1; i++) {
      const rideA = completedRides[i];
      const rideB = completedRides[i + 1];
      if (rideA.completedAt && rideB.startedAt) {
        const gapHrs =
          (rideB.startedAt.getTime() - rideA.completedAt.getTime()) /
          (1000 * 60 * 60);
        const minBreakHrs = breakDurationMinutes / 60;
        if (gapHrs >= minBreakHrs) {
          breakHoursToday += Math.min(gapHrs, 2);
        }
      }
    }
  }

  if (driver.driverAvailabilityStatus === "break" && driver.lastOfflineAt) {
    const currentBreakHrs =
      (Date.now() - driver.lastOfflineAt.getTime()) / (1000 * 60 * 60);
    breakHoursToday += currentBreakHrs;
  }

  // 6. Calculate online, idle, and offline hours
  let totalOnlineHrs = 0;
  const now = new Date();
  if (driver.lastOnlineAt) {
    const onlineStart =
      driver.lastOnlineAt > dayRange.start
        ? driver.lastOnlineAt
        : dayRange.start;
    if (driver.driverAvailabilityStatus !== "offline") {
      totalOnlineHrs =
        (now.getTime() - onlineStart.getTime()) / (1000 * 60 * 60);
    } else if (driver.lastOfflineAt && driver.lastOfflineAt > onlineStart) {
      totalOnlineHrs =
        (driver.lastOfflineAt.getTime() - onlineStart.getTime()) /
        (1000 * 60 * 60);
    }
  }

  totalOnlineHrs = Math.max(totalOnlineHrs, rideHoursToday + breakHoursToday);
  const hrsSinceMidnight =
    (now.getTime() - dayRange.start.getTime()) / (1000 * 60 * 60);
  const offlineHoursToday = Math.max(0, hrsSinceMidnight - totalOnlineHrs);
  const idleHoursToday = Math.max(
    0,
    totalOnlineHrs - rideHoursToday - breakHoursToday,
  );

  // 7. Continuous driving calculation
  let continuousDrivingHours = 0;
  if (maxContinuousDrivingHours > 0) {
    let lastRideEndTime = new Date();
    for (let i = completedRides.length - 1; i >= 0; i--) {
      const ride = completedRides[i];
      if (ride.startedAt && ride.completedAt) {
        const rideDuration =
          (ride.completedAt.getTime() - ride.startedAt.getTime()) /
          (1000 * 60 * 60);
        const gapHours =
          (lastRideEndTime.getTime() - ride.completedAt.getTime()) /
          (1000 * 60 * 60);
        if (gapHours > (policy?.breakAfterHours || 4)) {
          break;
        }
        continuousDrivingHours += rideDuration;
        lastRideEndTime = ride.completedAt;
      }
    }
  }

  // 8. Determine alert
  const alert = {
    show: false,
    type: "safe",
    severity: "low",
    title: "Safe Limit",
    description: "You are well within your daily driving limit.",
  };

  let remainingContinuous =
    maxContinuousDrivingHours > 0
      ? Math.max(0, maxContinuousDrivingHours - continuousDrivingHours)
      : remainingHours;

  const thresholdContinuous =
    maxContinuousDrivingHours > 0 ? remainingContinuous : remainingHours;

  if (thresholdContinuous <= 0) {
    alert.show = true;
    alert.type = "exceeded";
    alert.severity = "critical";
    alert.title = "Daily Limit Exceeded";
    alert.description =
      "You have reached your maximum daily driving limit. Please go off-duty immediately.";
  } else if (thresholdContinuous <= 1.0) {
    alert.show = true;
    alert.type = "critical";
    alert.severity = "high";
    alert.title = "1 Hour Remaining Alert";
    alert.description =
      maxContinuousDrivingHours > 0 && remainingContinuous <= 1.0
        ? "You have 1 hour left of continuous daily driving eligibility. Alygo platform will require you to log off-duty soon."
        : "You have 1 hour left before reaching today's driving limit. Please start winding down your shift.";
  } else if (thresholdContinuous <= 2.0) {
    alert.show = true;
    alert.type = "warning";
    alert.severity = "medium";
    alert.title = "2 Hours Remaining Alert";
    alert.description = `You have ${thresholdContinuous.toFixed(1)} hours left before reaching your driving limit.`;
  }

  // Formatting strings
  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const percentage = Math.round((drivingHoursToday / dailyLimit) * 100);

  return {
    summary: {
      drivenToday: formatDuration(drivingHoursToday),
      remaining: formatDuration(remainingHours),
      allowedLimit: formatDuration(dailyLimit),
      percentage: Math.min(100, percentage),
      remainingPercentage: Math.max(0, 100 - percentage),
    },
    alert,
    timeline: {
      drive: Number(drivingHoursToday.toFixed(1)),
      break: Number(breakHoursToday.toFixed(1)),
      idle: Number(idleHoursToday.toFixed(1)),
      offline: Number(offlineHoursToday.toFixed(1)),
      remaining: Number(remainingHours.toFixed(1)),
    },
    todayStatistics: {
      drivenToday: Number(drivingHoursToday.toFixed(2)),
      remainingTime: Number(remainingHours.toFixed(2)),
      allowedLimit: Number(dailyLimit.toFixed(2)),
    },
  };
};

const getDriverDrivingHoursHistory = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // 1. Resolve timezone and policy
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  let serviceArea = null;

  if (driver.serviceAreaId) {
    serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  let policy = null;
  if (serviceArea) {
    const pQuery: any = { status: "active" };
    if (serviceArea.type === "city") pQuery.cityId = serviceArea._id;
    else if (serviceArea.type === "zone") pQuery.zoneId = serviceArea._id;
    else if (serviceArea.type === "airport") pQuery.airportId = serviceArea._id;
    else if (serviceArea.type === "state") pQuery.stateId = serviceArea._id;
    else if (serviceArea.type === "country") pQuery.countryId = serviceArea._id;
    policy = await DriverDutyPolicy.findOne(pQuery);
  }
  if (!policy) {
    policy = await DriverDutyPolicy.findOne({
      scopeType: "global",
      status: "active",
    });
  }

  const dailyLimit = policy ? policy.maxDrivingHoursPerDay : 12;

  // Resolve filters
  const cycle = (query.cycle as string) || "daily";

  let startUtc: Date | undefined;
  let endUtc: Date | undefined;
  if (query.startDate) {
    startUtc = getDayRangeInTimezone(
      query.startDate as string,
      driverTimezone,
    ).start;
  }
  if (query.endDate) {
    endUtc = getDayRangeInTimezone(query.endDate as string, driverTimezone).end;
  }

  // 2. Build Ride match stage
  const matchStage: any = {
    driverId: driver.userId,
    status: RIDE_STATUS.COMPLETED,
  };
  if (startUtc || endUtc) {
    matchStage.completedAt = {};
    if (startUtc) matchStage.completedAt.$gte = startUtc;
    if (endUtc) matchStage.completedAt.$lte = endUtc;
  }

  // 3. Build aggregation grouping by cycle
  let formatStr = "%Y-%m-%d";
  let allowedLimit = dailyLimit;

  if (cycle === "weekly") {
    formatStr = "%G-W%V"; // ISO Week format (Year-WWeekNo)
    allowedLimit = dailyLimit * 5; // e.g. 60 hours
  } else if (cycle === "monthly") {
    formatStr = "%Y-%m";
    allowedLimit = dailyLimit * 20; // e.g. 240 hours
  }

  const pipeline: any[] = [
    { $match: matchStage },
    {
      $project: {
        periodStr: {
          $dateToString: {
            format: formatStr,
            date: "$completedAt",
            timezone: driverTimezone,
          },
        },
        durationHrs: {
          $divide: [
            { $subtract: ["$completedAt", "$startedAt"] },
            1000 * 60 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$periodStr",
        drive: { $sum: "$durationHrs" },
      },
    },
  ];

  const results = await Ride.aggregate(pipeline);

  // 4. Ensure current period is represented in results if it falls within queried range
  const nowInTz = DateTime.now().setZone(driverTimezone);
  let currentPeriodStr = "";
  if (cycle === "daily") {
    currentPeriodStr = nowInTz.toFormat("yyyy-MM-dd");
  } else if (cycle === "weekly") {
    const weekStr = String(nowInTz.weekNumber).padStart(2, "0");
    currentPeriodStr = `${nowInTz.weekYear}-W${weekStr}`;
  } else if (cycle === "monthly") {
    currentPeriodStr = nowInTz.toFormat("yyyy-MM");
  }

  let isCurrentPeriodInQueryRange = true;
  const currentPeriodStart = getDayRangeInTimezone(
    nowInTz.toFormat("yyyy-MM-dd"),
    driverTimezone,
  ).start;
  const currentPeriodEnd = getDayRangeInTimezone(
    nowInTz.toFormat("yyyy-MM-dd"),
    driverTimezone,
  ).end;

  if (startUtc && currentPeriodEnd < startUtc) {
    isCurrentPeriodInQueryRange = false;
  }
  if (endUtc && currentPeriodStart > endUtc) {
    isCurrentPeriodInQueryRange = false;
  }

  if (isCurrentPeriodInQueryRange) {
    let currentPeriodItem = results.find(
      (item) => item._id === currentPeriodStr,
    );
    if (!currentPeriodItem) {
      currentPeriodItem = { _id: currentPeriodStr, drive: 0 };
      results.push(currentPeriodItem);
    }

    // Add ongoing driving hours to current period if status is started
    const startedRides = await Ride.find({
      driverId: driver.userId,
      status: RIDE_STATUS.STARTED,
    });
    let ongoingDrivingHrs = 0;
    for (const ride of startedRides) {
      if (ride.startedAt) {
        const durationHrs =
          (Date.now() - ride.startedAt.getTime()) / (1000 * 60 * 60);
        ongoingDrivingHrs += durationHrs;
      }
    }
    currentPeriodItem.drive += ongoingDrivingHrs;
  }

  // 5. Calculate real-time timeline (pie chart data) for the current active period
  let currentPeriodStartUtc: Date;
  let currentPeriodEndUtc: Date;
  if (cycle === "daily") {
    currentPeriodStartUtc = nowInTz.startOf("day").toUTC().toJSDate();
    currentPeriodEndUtc = nowInTz.endOf("day").toUTC().toJSDate();
  } else if (cycle === "weekly") {
    currentPeriodStartUtc = nowInTz.startOf("week").toUTC().toJSDate();
    currentPeriodEndUtc = nowInTz.endOf("week").toUTC().toJSDate();
  } else {
    currentPeriodStartUtc = nowInTz.startOf("month").toUTC().toJSDate();
    currentPeriodEndUtc = nowInTz.endOf("month").toUTC().toJSDate();
  }

  const currentPeriodCompletedRides = await Ride.find({
    driverId: driver.userId,
    status: RIDE_STATUS.COMPLETED,
    completedAt: { $gte: currentPeriodStartUtc, $lte: currentPeriodEndUtc },
  });
  let currentPeriodCompletedHrs = 0;
  for (const ride of currentPeriodCompletedRides) {
    if (ride.startedAt && ride.completedAt) {
      currentPeriodCompletedHrs +=
        (ride.completedAt.getTime() - ride.startedAt.getTime()) /
        (1000 * 60 * 60);
    }
  }

  const startedRidesForTimeline = await Ride.find({
    driverId: driver.userId,
    status: RIDE_STATUS.STARTED,
  });
  let currentPeriodOngoingHrs = 0;
  for (const ride of startedRidesForTimeline) {
    if (ride.startedAt) {
      currentPeriodOngoingHrs +=
        (Date.now() - ride.startedAt.getTime()) / (1000 * 60 * 60);
    }
  }

  const timelineDrive = Number(
    (currentPeriodCompletedHrs + currentPeriodOngoingHrs).toFixed(1),
  );
  const timelineLeft = Math.max(
    0,
    Number((allowedLimit - timelineDrive).toFixed(1)),
  );
  const timelinePercentage = Math.min(
    100,
    Math.round((timelineDrive / allowedLimit) * 100),
  );

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

  const timeline = {
    drive: timelineDrive,
    left: timelineLeft,
    allowedLimit: allowedLimit,
    percentage: timelinePercentage,
    driveTimeFormatted: formatDuration(timelineDrive),
    leftTimeFormatted: formatDuration(timelineLeft),
    allowedLimitFormatted: formatDuration(allowedLimit),
  };

  // 6. Sort and Paginate
  const sortStr = (query.sort as string) || "-_id";
  const isDesc = sortStr.startsWith("-");

  results.sort((a, b) => {
    if (a._id < b._id) return isDesc ? 1 : -1;
    if (a._id > b._id) return isDesc ? -1 : 1;
    return 0;
  });

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginatedResults = results.slice(skip, skip + limit);
  const total = results.length;
  const totalPage = Math.ceil(total / limit);

  // 7. Format labels & response
  const history = paginatedResults.map((item) => {
    let periodLabel = item._id;
    if (cycle === "daily") {
      const dt = DateTime.fromFormat(item._id, "yyyy-MM-dd", {
        zone: driverTimezone,
      });
      if (dt.isValid) {
        periodLabel = dt.toFormat("EEE, MMM dd");
      }
    } else if (cycle === "weekly") {
      const parts = item._id.split("-W");
      if (parts.length === 2) {
        periodLabel = `Week ${parts[1]}, ${parts[0]}`;
      }
    } else if (cycle === "monthly") {
      const dt = DateTime.fromFormat(item._id, "yyyy-MM", {
        zone: driverTimezone,
      });
      if (dt.isValid) {
        periodLabel = dt.toFormat("MMMM yyyy");
      }
    }

    const drive = Number(item.drive.toFixed(1));
    const remaining = Math.max(0, Number((allowedLimit - drive).toFixed(1)));
    const percentage = Math.min(100, Math.round((drive / allowedLimit) * 100));

    // Calculate status and cycleCompleted
    const cycleCompleted = drive <= allowedLimit;
    let status = "";
    if (cycle === "daily") {
      status = cycleCompleted
        ? "HOS Shift Summary Complied"
        : "HOS Shift Limit Exceeded";
    } else if (cycle === "weekly") {
      status = cycleCompleted
        ? "HOS Weekly Summary Complied"
        : "HOS Weekly Limit Exceeded";
    } else if (cycle === "monthly") {
      status = cycleCompleted
        ? "HOS Monthly Summary Complied"
        : "HOS Monthly Limit Exceeded";
    }

    return {
      period: periodLabel,
      drive,
      remaining,
      allowedLimit,
      percentage,
      drivingTime: `${drive}h`,
      remainingTime: `${remaining}h`,
      allowedLimitTime: `${allowedLimit}h`,
      status,
      cycleCompleted,
    };
  });

  return {
    timeline,
    history,
    pagination: {
      page,
      limit,
      total,
      totalPage,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
    },
  };
};

const getDriverDrivingHoursLedger = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  // 1. Resolve timezone and policy
  const systemConfig = await getSystemConfig();
  const defaultTimezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  let driverTimezone = defaultTimezone;
  let serviceArea = null;

  if (driver.serviceAreaId) {
    serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    driverTimezone = serviceArea?.timezone || defaultTimezone;
  }

  let policy = null;
  if (serviceArea) {
    const pQuery: any = { status: "active" };
    if (serviceArea.type === "city") pQuery.cityId = serviceArea._id;
    else if (serviceArea.type === "zone") pQuery.zoneId = serviceArea._id;
    else if (serviceArea.type === "airport") pQuery.airportId = serviceArea._id;
    else if (serviceArea.type === "state") pQuery.stateId = serviceArea._id;
    else if (serviceArea.type === "country") pQuery.countryId = serviceArea._id;
    policy = await DriverDutyPolicy.findOne(pQuery);
  }
  if (!policy) {
    policy = await DriverDutyPolicy.findOne({
      scopeType: "global",
      status: "active",
    });
  }

  const dailyLimit = policy ? policy.maxDrivingHoursPerDay : 12;

  // Resolve filters
  let startUtc: Date | undefined;
  let endUtc: Date | undefined;
  if (query.startDate) {
    startUtc = getDayRangeInTimezone(
      query.startDate as string,
      driverTimezone,
    ).start;
  }
  if (query.endDate) {
    endUtc = getDayRangeInTimezone(query.endDate as string, driverTimezone).end;
  }

  // 2. Build Ride match stage
  const matchStage: any = {
    driverId: driver.userId,
    status: RIDE_STATUS.COMPLETED,
  };
  if (startUtc || endUtc) {
    matchStage.completedAt = {};
    if (startUtc) matchStage.completedAt.$gte = startUtc;
    if (endUtc) matchStage.completedAt.$lte = endUtc;
  }

  // 3. Group completed rides by day for detailed stats
  const pipeline: any[] = [
    { $match: matchStage },
    {
      $project: {
        dateStr: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$completedAt",
            timezone: driverTimezone,
          },
        },
        durationHrs: {
          $divide: [
            { $subtract: ["$completedAt", "$startedAt"] },
            1000 * 60 * 60,
          ],
        },
        rideDurationHrs: {
          $divide: [
            {
              $subtract: [
                "$completedAt",
                { $ifNull: ["$acceptedAt", "$startedAt"] },
              ],
            },
            1000 * 60 * 60,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$dateStr",
        drive: { $sum: "$durationHrs" },
        rideTime: { $sum: "$rideDurationHrs" },
      },
    },
  ];

  const results = await Ride.aggregate(pipeline);

  // 4. Sort and Paginate
  const sortStr = (query.sort as string) || "-_id";
  const isDesc = sortStr.startsWith("-");

  results.sort((a, b) => {
    if (a._id < b._id) return isDesc ? 1 : -1;
    if (a._id > b._id) return isDesc ? -1 : 1;
    return 0;
  });

  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginatedResults = results.slice(skip, skip + limit);
  const total = results.length;
  const totalPage = Math.ceil(total / limit);

  // 5. Format Ledger Entries
  const ledger = paginatedResults.map((item) => {
    const dt = DateTime.fromFormat(item._id, "yyyy-MM-dd", {
      zone: driverTimezone,
    });
    const periodLabel = dt.isValid ? dt.toFormat("EEE, MMM dd") : item._id;

    const drive = Number(item.drive.toFixed(1));
    const rideTime = Number(Math.max(drive, item.rideTime).toFixed(1));

    const breakTime = Number(Math.max(0.5, drive * 0.1).toFixed(1));
    const idleTime = Number(Math.max(0.2, (rideTime - drive) * 0.5).toFixed(1));
    const remaining = Number(Math.max(0, dailyLimit - drive).toFixed(1));

    const cycleCompleted = drive <= dailyLimit;
    const status = cycleCompleted
      ? "HOS Shift Summary Complied"
      : "HOS Shift Limit Exceeded";

    return {
      date: periodLabel,
      drivingTime: `${drive}h`,
      rideTime: `${rideTime}h`,
      breakTime: `${breakTime}h`,
      idleTime: `${idleTime}h`,
      remainingTime: `${remaining}h`,
      status,
      cycleCompleted,
    };
  });

  return {
    ledger,
    pagination: {
      page,
      limit,
      total,
      totalPage,
      hasNextPage: page < totalPage,
      hasPrevPage: page > 1,
    },
  };
};

const verifySelfieFaceToDB = async (userId: string, selfieUrl: string) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });

  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  if (!driver.liveSelfie || driver.liveSelfie.trim() === "") {
    throw new ApiError(
      400,
      "Driver has no reference selfie record. Please upload a selfie first during onboarding.",
    );
  }

  // Map both to absolute paths
  const referenceRelativePath = driver.liveSelfie.replace(/^\//, "");
  const referenceFilePath = path.join(process.cwd(), referenceRelativePath);

  const verificationRelativePath = selfieUrl.replace(/^\//, "");
  const verificationFilePath = path.join(
    process.cwd(),
    verificationRelativePath,
  );

  // Check if reference selfie exists on disk
  if (!fs.existsSync(referenceFilePath)) {
    throw new ApiError(
      500,
      "Failed to read reference selfie from server storage",
    );
  }

  // Check if uploaded verification selfie exists on disk
  if (!fs.existsSync(verificationFilePath)) {
    throw new ApiError(
      400,
      "Verification selfie file was not uploaded correctly",
    );
  }

  let referenceSelfieBuffer: Buffer;
  let verificationSelfieBuffer: Buffer;

  try {
    referenceSelfieBuffer = fs.readFileSync(referenceFilePath);
    verificationSelfieBuffer = fs.readFileSync(verificationFilePath);
  } catch (error) {
    throw new ApiError(500, "Failed to read selfie files for comparison");
  }

  // Perform AWS Rekognition Face Comparison
  let result;
  try {
    result = await compareFaces(
      referenceSelfieBuffer,
      verificationSelfieBuffer,
      80,
    );
  } finally {
    // Always clean up/delete the temporary verification selfie file from disk
    if (
      fs.existsSync(verificationFilePath) &&
      verificationFilePath !== referenceFilePath
    ) {
      try {
        fs.unlinkSync(verificationFilePath);
      } catch (err) {
        console.error("Error deleting temporary verification file:", err);
      }
    }
  }

  if (!result.match) {
    throw new ApiError(400, "Face verification failed. Faces do not match.");
  }

  // Update lastVerificationDate
  driver.lastVerificationDate = new Date();
  await driver.save();

  return {
    match: result.match,
    similarity: result.similarity,
    confidence: result.confidence,
  };
};

export const DriverServices = {
  calculateDocumentsStatus,
  createDriverToDB,
  getDriverProfileFromDB,
  updateDriverFromDB,
  getDriverAvailability,
  getDriverReservationsFromDB,
  getDriverPerformanceMetrics,
  getDriverDrivingHours,
  getDriverDrivingHoursHistory,
  getDriverDrivingHoursLedger,
  verifySelfieFaceToDB,
};
