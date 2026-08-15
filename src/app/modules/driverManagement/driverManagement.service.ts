import { Types } from "mongoose";
import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import { Driver } from "../driver/driver.model";
import { RideCategory } from "../rideCategory/rideCategory.model";
import { User } from "../user/user.model";
import { Car } from "../car/car.model";
import { Ride } from "../ride/ride.model";
import { Wallet } from "../wallet/wallet.model";
import { Tier } from "../tier/tier.model";
import { Transaction } from "../transaction/transaction.model";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../../../enums/user";
import { VERIFICATION_STATUS } from "../driver/driver.constant";
import { calculateDriverAcceptanceRate } from "../tier/points.service";
import { RIDE_STATUS } from "../ride/ride.constant";
import { DriverQueryBuilder } from "./driverManagement.builder";
import { createAuditLog } from "../rbac/rbac.utils";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { emailHelper } from "../../../helpers/emailHelper";
import { socketHelper } from "../../../helpers/socketHelper";
import { AuditLog } from "../auditLog/auditLog.model";
import { utcToTimezone } from "../../../shared/timezoneHelper";

/**
 * Get paginated list of drivers overview
 */
const getDriversOverviewFromDB = async (queryParams: Record<string, any>) => {
  const queryBuilder = new DriverQueryBuilder(queryParams);
  const filterQuery = await queryBuilder.build();
  const sort = queryBuilder.getSort();
  const { page, limit, skip } = queryBuilder.getPagination();

  // Query Driver collection
  const drivers = await Driver.find(filterQuery)
    .sort(sort as any)
    .skip(skip)
    .limit(limit)
    .populate({
      path: "userId",
      select: "name email phone status averageRating totalRatings profileImage",
    })
    .populate("currentTier")
    .populate("nextTier")
    .populate("serviceAreaId", "name")
    .lean();

  const total = await Driver.countDocuments(filterQuery);
  const totalPage = Math.ceil(total / limit);

  const driverIds = drivers.map((d) => d._id);
  const userIds = drivers
    .map((d) => d.userId?._id || (d.userId as any))
    .filter(Boolean);

  // Batch query Cars, Completed Rides count, and active Ride Categories
  const [cars, rideCounts, activeCategories] = await Promise.all([
    Car.find({ driverId: { $in: driverIds } }).lean(),
    Ride.aggregate([
      { $match: { driverId: { $in: userIds }, status: RIDE_STATUS.COMPLETED } },
      { $group: { _id: "$driverId", count: { $sum: 1 } } },
    ]),
    RideCategory.find({ status: "active" }).lean(),
  ]);

  const carMap = new Map(cars.map((c) => [c.driverId.toString(), c]));
  const rideCountMap = new Map(
    rideCounts.map((r) => [r._id.toString(), r.count]),
  );

  // Helper to capitalize verification/compliance statuses
  const capitalize = (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "Pending";

  const formattedData = await Promise.all(
    drivers.map(async (driver: any) => {
      const user = (driver.userId as any) || {};

      // 1. City / Service Area
      let driverCity = "Unknown";
      if (driver.location?.address) {
        const addressParts = driver.location.address.split(",");
        if (addressParts.length > 0) {
          driverCity = addressParts[0].trim();
        }
      } else if (driver.serviceAreaId?.name) {
        driverCity = driver.serviceAreaId.name;
      }

      // 2. Vehicle Info
      const car = carMap.get(driver._id.toString());
      const vehicle = car ? `${car.brand} ${car.model}` : "";

      // 3. Determine matching ride categories based on the car's type and seats
      const matchedCategories: string[] = [];
      if (car) {
        for (const cat of activeCategories) {
          const vehicleType =
            cat.vehicleRequirements?.vehicleType ||
            (cat.vehicleRequirements as any)?.vehicleTypes?.[0];
          const minimumSeats = cat.vehicleRequirements?.minimumSeats || 0;
          const isCarTypeMatched =
            vehicleType &&
            car.carType &&
            vehicleType.toLowerCase() === car.carType.toLowerCase();
          const isSeatsSufficient = car.seatNumber >= minimumSeats;

          if (isCarTypeMatched && isSeatsSufficient) {
            matchedCategories.push(cat.name);
          }
        }
      }

      // 4. Tier details & progress
      const currentTierName = driver.currentTier?.name || "No Tier";
      const nextTierName = driver.nextTier?.name || null;
      const progressPercentage = driver.progressPercentage || 0;

      let tierProgress = "";
      if (nextTierName) {
        tierProgress = `${progressPercentage}% To ${nextTierName}`;
      } else {
        tierProgress = "Max Tier reached";
      }

      // 5. Tier Status (Active / at risk)
      // Check if driver is "at risk" of losing their tier
      let tierStatus = "Active";
      if (driver.currentTier && (driver.currentTier as any).requirements) {
        const reqs = (driver.currentTier as any).requirements;
        // Calculate driver's acceptance rate
        const acceptanceRate = await calculateDriverAcceptanceRate(
          driver.userId?._id || driver.userId,
        );

        const isRatingLow =
          (driver.averageRating || 0) < (reqs.ratingRequired || 0);
        const isAcceptanceRateLow =
          acceptanceRate < (reqs.acceptanceRateRequired || 0);
        const isTripsLow =
          (rideCountMap.get(user._id?.toString() || user.toString()) || 0) <
          (reqs.tripsRequired || 0);
        const isPointsLow =
          (driver.currentPoints || 0) < (reqs.pointsRequired || 0);

        if (isRatingLow || isAcceptanceRateLow || isTripsLow || isPointsLow) {
          tierStatus = "at risk";
        }
      }

      // 6. Compliance / Verification Statuses
      const compliance = driver.mvrStatus;
      const backgroundCheck = driver.backgroundCheckStatus;
      const mvrStatus = driver.mvrStatus;

      // 7. Overall status
      let overallStatus = driver.approvalStatus || DRIVER_STATUS.PENDING;
      if (user.status === STATUS.INACTIVE || driver.suspension?.isSuspended) {
        overallStatus = "suspended" as any;
      }

      return {
        driverId: {
          _id: driver._id.toString(),
          averageRating: driver.averageRating,
          currentPoints: driver.currentPoints,
          lifetimePoints: driver.lifetimePoints,
          approvalStatus: driver.approvalStatus,
          backgroundCheckStatus: driver.backgroundCheckStatus,
          mvrStatus: driver.mvrStatus,
          licenseExpiryDate: driver.licenseExpiryDate,
          suspension: driver.suspension,
        },
        userId: driver.userId
          ? {
              _id: user._id?.toString() || "",
              name: user.name || "",
              email: user.email || "",
              phone: user.phone || "",
              profileImage: user.profileImage || "",
              status: user.status || "",
            }
          : null,
        fullName: user.name || "",
        avatar: user.profileImage || "",
        email: user.email || "",
        phone: user.phone || "",
        averageRating: driver.averageRating
          ? Number(driver.averageRating.toFixed(1))
          : 0,
        completedTrips:
          rideCountMap.get(user._id?.toString() || user.toString()) || 0,
        tier: currentTierName,
        tierProgress,
        tierStatus,
        vehicle,
        rideCategories: matchedCategories,
        compliance,
        backgroundCheck,
        mvrStatus,
        status: overallStatus,
        city: driverCity,
      };
    }),
  );

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
 * Get overview stats summary for the Driver Management Admin Dashboard
 */
const getOverviewSummaryFromDB = async () => {
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch inactive user IDs (Suspended)
  const suspendedUsers = await User.find({
    role: USER_ROLES.DRIVER,
    status: STATUS.INACTIVE,
  }).select("_id");
  const suspendedUserIds = suspendedUsers.map((u) => u._id);

  // Fetch active user IDs
  const activeUsers = await User.find({
    role: USER_ROLES.DRIVER,
    status: STATUS.ACTIVE,
  }).select("_id");
  const activeUserIds = activeUsers.map((u) => u._id);

  const [
    totalDrivers,
    onlineDrivers,
    pendingApproval,
    suspendedDrivers,
    complianceExpired,
    compliancePending,
    verifiedDrivers,
  ] = await Promise.all([
    Driver.countDocuments(),
    Driver.countDocuments({
      driverAvailabilityStatus: "online",
      approvalStatus: DRIVER_STATUS.APPROVED,
      "suspension.isSuspended": { $ne: true },
      userId: { $in: activeUserIds },
    }),
    Driver.countDocuments({ approvalStatus: DRIVER_STATUS.PENDING }),
    Driver.countDocuments({
      $or: [
        { userId: { $in: suspendedUserIds } },
        { "suspension.isSuspended": true },
      ],
    }),
    Driver.countDocuments({ licenseExpiryDate: { $lte: now } }),
    Driver.countDocuments({
      $or: [
        {
          backgroundCheckStatus: {
            $in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED],
          },
        },
        {
          mvrStatus: {
            $in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED],
          },
        },
        { licenseExpiryDate: { $lte: thirtyDaysLater } },
      ],
    }),
    Driver.countDocuments({
      approvalStatus: DRIVER_STATUS.APPROVED,
      backgroundCheckStatus: VERIFICATION_STATUS.VERIFIED,
      mvrStatus: VERIFICATION_STATUS.VERIFIED,
    }),
  ]);

  // Fetch tier distribution
  const tiers = await Tier.find().select("name");
  const activeTiers = await Promise.all(
    tiers.map(async (t) => {
      const count = await Driver.countDocuments({ currentTier: t._id });
      return {
        tierId: t._id.toString() as string | null,
        name: t.name,
        count,
      };
    }),
  );

  const noTierCount = await Driver.countDocuments({ currentTier: null });
  activeTiers.push({
    tierId: null,
    name: "No Tier",
    count: noTierCount,
  });

  return {
    totalDrivers,
    onlineDrivers,
    pendingApproval,
    suspendedDrivers,
    compliancePending,
    complianceExpired,
    verifiedDrivers,
    activeTiers,
  };
};

/**
 * Reusable helper to assemble paginated, filtered driver lists
 */
const queryDriversList = async (
  queryParams: Record<string, any>,
  extraFilters: Record<string, any> = {},
) => {
  const queryBuilder = new DriverQueryBuilder({
    ...queryParams,
    ...extraFilters,
  });
  const filterQuery = await queryBuilder.build();
  const sort = queryBuilder.getSort();
  const { page, limit, skip } = queryBuilder.getPagination();

  // Query Driver collection
  const drivers = await Driver.find(filterQuery)
    .sort(sort as any)
    .skip(skip)
    .limit(limit)
    .populate(
      "userId",
      "name email phone status averageRating totalRatings profileImage",
    )
    .populate("currentTier", "name")
    .populate("serviceAreaId", "name")
    .lean();

  // Batch query Cars to avoid N+1 queries
  const driverIds = drivers.map((d) => d._id);
  const cars = await Car.find({ driverId: { $in: driverIds } }).lean();
  const carMap = new Map(cars.map((c) => [c.driverId.toString(), c]));

  // Round rating scores in response to ensure they are integers for output DTO
  const formattedDrivers = drivers.map((d) => {
    const userObj = d.userId as any;
    if (userObj) {
      userObj.averageRating = userObj.averageRating
        ? Math.round(userObj.averageRating)
        : 0;
    }
    const driverRating = d.averageRating ? Math.round(d.averageRating) : 0;

    return {
      ...d,
      averageRating: driverRating,
      vehicle: carMap.get(d._id.toString()) || null,
    };
  });

  // Calculate meta count
  const total = await Driver.countDocuments(filterQuery);
  const totalPage = Math.ceil(total / limit);

  return {
    data: formattedDrivers,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

/**
 * Online Drivers: online, approved, active, not suspended
 */
const getOnlineDriversFromDB = async (queryParams: Record<string, any>) => {
  const activeUsers = await User.find({
    role: USER_ROLES.DRIVER,
    status: STATUS.ACTIVE,
  }).select("_id");
  const activeUserIds = activeUsers.map((u) => u._id);

  return queryDriversList(queryParams, {
    availability: "online",
    approvalStatus: DRIVER_STATUS.APPROVED,
    userId: { $in: activeUserIds },
    "suspension.isSuspended": { $ne: true },
  });
};

/**
 * Pending Approval Drivers: waiting for admin approval
 */
const getPendingApprovalDriversFromDB = async (
  queryParams: Record<string, any>,
) => {
  return queryDriversList(queryParams, {
    approvalStatus: DRIVER_STATUS.PENDING,
  });
};

/**
 * Suspended Drivers: inactive status in User model or isSuspended true
 */
const getSuspendedDriversFromDB = async (queryParams: Record<string, any>) => {
  const suspendedUsers = await User.find({
    role: USER_ROLES.DRIVER,
    status: STATUS.INACTIVE,
  }).select("_id");
  const suspendedUserIds = suspendedUsers.map((u) => u._id);

  return queryDriversList(queryParams, {
    $or: [
      { userId: { $in: suspendedUserIds } },
      { "suspension.isSuspended": true },
    ],
  });
};

/**
 * Compliance Drivers: requires admin attention
 */
const getComplianceDriversFromDB = async (queryParams: Record<string, any>) => {
  return queryDriversList(queryParams, {
    complianceStatus: queryParams.complianceStatus || "pending",
  });
};

/**
 * Fetch detailed driver management info
 */
const getDriverDetailsFromDB = async (
  driverId: string,
  queryParams: Record<string, any> = {},
) => {
  const driver = await Driver.findById(driverId)
    .populate("userId", "name profileImage phone email")
    .populate("serviceAreaId", "timezone")
    .lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const user = driver.userId as any;
  const serviceArea = driver.serviceAreaId as any;
  const timezone = serviceArea?.timezone || "UTC";

  // Reusable helper to format dates in local timezone
  const formatTime = (
    date: Date | string | undefined | null,
    tz: string,
  ): string | null => {
    if (!date) return null;
    return utcToTimezone(date, tz).toFormat("LLL d, yyyy h:mm a");
  };

  const page = Number(queryParams.page) || 1;
  const limit = Number(queryParams.limit) || 10;
  const skip = (page - 1) * limit;

  // Retrieve parallel details
  const [car, completedTrips, auditLogs] = await Promise.all([
    Car.findOne({ driverId: driver._id }).lean(),
    user?._id
      ? Ride.countDocuments({
          driverId: user._id,
          status: RIDE_STATUS.COMPLETED,
        })
      : Promise.resolve(0),
    AuditLog.find({
      $or: [
        { "details.driverId": driverId },
        { "details.driverId": new Types.ObjectId(driverId) },
      ],
      action: {
        $in: [
          "DRIVER_APPROVED",
          "DRIVER_REJECTED",
          "DRIVER_SUSPENDED",
          "DRIVER_UNSUSPENDED",
        ],
      },
    })
      .sort({ createdAt: -1 })
      .populate("performedBy", "name")
      .lean(),
  ]);

  // Paginate audit logs for verification history
  const paginatedLogs = auditLogs.slice(skip, skip + limit);

  // Capitalization helper
  const capitalize = (str: string) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

  // 1. Basic Driver Information
  const driverInfo = {
    driverId: driver._id.toString(),
    fullName: user?.name || "",
    avatar: user?.profileImage || null,
    phone: user?.phone || "",
    email: user?.email || "",
    vehicleName: car ? `${car.brand} ${car.model}` : "",
    vehicleNumber: car ? car.licensePlate : "",
    completedTrips,
    averageRating: driver.averageRating || 0,
  };

  // 2. Identity Verification Summary
  const latestVerificationLog = auditLogs.find((log) =>
    [
      "DRIVER_APPROVED",
      "DRIVER_REJECTED",
      "DRIVER_SUSPENDED",
      "DRIVER_UNSUSPENDED",
    ].includes(log.action),
  );

  let verificationStatus = capitalize(driver.mvrStatus || "pending");
  let verificationDate: string | null = null;
  let lastVerificationDate: string | null = formatTime(
    driver.lastVerificationDate || (driver as any).updatedAt,
    timezone,
  );
  let verificationSource = driver.verificationSource || "Onboarding";
  let verificationNotes =
    driver.verificationNotes ||
    "Live selfie captured via in-app camera. Gallery uploads disabled.";

  if (latestVerificationLog) {
    if (latestVerificationLog.action === "DRIVER_APPROVED") {
      verificationStatus = "Verified";
      verificationDate = formatTime(latestVerificationLog.createdAt, timezone);
    } else if (latestVerificationLog.action === "DRIVER_REJECTED") {
      verificationStatus = "Rejected";
    } else if (latestVerificationLog.action === "DRIVER_SUSPENDED") {
      verificationStatus = "Suspended";
    } else if (latestVerificationLog.action === "DRIVER_UNSUSPENDED") {
      verificationStatus = "Verified";
    }
    lastVerificationDate = formatTime(
      latestVerificationLog.createdAt,
      timezone,
    );

    verificationSource =
      latestVerificationLog.details?.triggerSource ||
      latestVerificationLog.details?.source ||
      (latestVerificationLog.action === "DRIVER_APPROVED"
        ? "Onboarding"
        : "Manual Review");

    verificationNotes =
      latestVerificationLog.details?.reason ||
      latestVerificationLog.details?.note ||
      (latestVerificationLog.action === "DRIVER_APPROVED"
        ? "Live selfie captured via in-app camera. Gallery uploads disabled."
        : "");
  } else if (driver.mvrStatus === VERIFICATION_STATUS.VERIFIED) {
    verificationDate = formatTime(
      driver.mvrVerifiedAt || (driver as any).updatedAt,
      timezone,
    );
  }

  const identityVerification = {
    verificationStatus,
    verificationDate,
    lastVerificationDate,
    verificationSource,
    verificationNotes,
  };

  // 3. Verification Images
  const profilePhoto = user?.profileImage
    ? {
        imageUrl: user.profileImage,
        uploadedAt: formatTime(
          (user as any).updatedAt || (driver as any).createdAt,
          timezone,
        ),
      }
    : null;

  const latestLiveSelfie = driver.liveSelfie
    ? {
        imageUrl: driver.liveSelfie,
        capturedAt: formatTime(
          driver.mvrVerifiedAt || (driver as any).updatedAt,
          timezone,
        ),
      }
    : null;

  const verificationImages =
    profilePhoto || latestLiveSelfie
      ? {
          profilePhoto,
          latestLiveSelfie,
        }
      : null;

  // 4. Verification History
  const verificationHistory = paginatedLogs.map((log) => {
    let status = "Pending";
    if (log.action === "DRIVER_APPROVED") status = "Verified";
    else if (log.action === "DRIVER_REJECTED") status = "Rejected";
    else if (log.action === "DRIVER_SUSPENDED") status = "Suspended";
    else if (log.action === "DRIVER_UNSUSPENDED") status = "Active";

    const triggerSource =
      log.details?.triggerSource ||
      log.details?.source ||
      (log.action === "DRIVER_APPROVED" ? "Onboarding" : "Manual Review");

    const notes =
      log.details?.reason ||
      log.details?.note ||
      (log.action === "DRIVER_APPROVED"
        ? "Initial onboarding verification."
        : "");

    return {
      verifiedAt: formatTime(log.createdAt, timezone),
      triggerSource,
      verificationStatus: status,
      reviewedBy: (log.performedBy as any)?.name || "System",
      notes,
    };
  });

  return {
    driver: {
      ...driverInfo,
      ssn: driver.ssn,
      ssnCard: driver.ssnCard,
      drivingLicense: driver.drivingLicense,
      drivingLicenseNumber: driver.drivingLicenseNumber,
      taxDocument: driver.taxDocument,
      documentsStatus: driver.documentsStatus,
      approvalStatus: driver.approvalStatus,
      taxLegalName: driver.taxLegalName,
      taxBusinessName: driver.taxBusinessName,
      taxIdType: driver.taxIdType,
      taxIdValue: driver.taxIdValue,
      taxEmail: driver.taxEmail,
      taxPhone: driver.taxPhone,
      taxStreet: driver.taxStreet,
      taxCity: driver.taxCity,
      taxState: driver.taxState,
      taxZipCode: driver.taxZipCode,
      taxCountry: driver.taxCountry,
    },
    car,
    identityVerification,
    verificationImages,
    verificationHistory,
  };
};

/**
 * Approve Driver
 */
const approveDriverInDB = async (
  driverId: string,
  adminId: string,
  req?: Request,
) => {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  // Update Driver approval statuses
  const updatedDriver = await Driver.findByIdAndUpdate(
    driverId,
    {
      $set: {
        approvalStatus: DRIVER_STATUS.APPROVED,
        mvrStatus: VERIFICATION_STATUS.VERIFIED,
        mvrVerifiedAt: new Date(),
        "suspension.isSuspended": false,
        "suspension.suspendedBy": null,
        "suspension.suspendedAt": null,
        "suspension.reason": "",
        "suspension.note": "",
      },
    },
    { new: true },
  );

  // Ensure User status is Active
  await User.findByIdAndUpdate(driver.userId, {
    status: STATUS.ACTIVE,
  });

  // 1. Audit Log
  await createAuditLog("DRIVER_APPROVED", adminId, { driverId }, req);

  // 2. Push Notification
  await sendNotifications({
    receiver: driver.userId,
    type: NOTIFICATION_TYPE.DRIVER,
    title: "Driver Account Approved",
    text: "Congratulations! Your driver account has been approved by the admin. You are now eligible to receive ride requests.",
  });

  // 3. Welcome Email
  const user = await User.findById(driver.userId);
  if (user && user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Welcome to Alygo! Your Driver Account is Approved",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>We are pleased to inform you that your driver account on <strong>Alygo</strong> has been approved!</p>
          <p>You can now go online inside the driver app and start accepting ride matches.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(driver.userId.toString(), "driver-status-updated", {
    approvalStatus: DRIVER_STATUS.APPROVED,
    isSuspended: false,
    message: "Your driver account status is approved.",
  });

  return updatedDriver;
};

/**
 * Reject Driver
 */
const rejectDriverInDB = async (
  driverId: string,
  adminId: string,
  reason?: string,
  req?: Request,
) => {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const updatedDriver = await Driver.findByIdAndUpdate(
    driverId,
    {
      $set: {
        approvalStatus: DRIVER_STATUS.REJECTED,
      },
    },
    { new: true },
  );

  // 1. Audit Log
  await createAuditLog("DRIVER_REJECTED", adminId, { driverId, reason }, req);

  // 2. Push Notification
  await sendNotifications({
    receiver: driver.userId,
    type: NOTIFICATION_TYPE.DRIVER,
    title: "Application Rejected",
    text: `Your driver application was rejected. Reason: ${reason || "Document mismatch."}`,
  });

  // 3. Rejection Email
  const user = await User.findById(driver.userId);
  if (user && user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Alygo Driver Application Update",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>Your driver application with <strong>Alygo</strong> has been reviewed.</p>
          <p>Unfortunately, your application was not approved at this time for the following reason:</p>
          <blockquote style="background: #f4f4f4; padding: 10px; border-left: 3px solid #d9534f; margin: 15px 0;">
            ${reason || "Document verification failed."}
          </blockquote>
          <p>Please log in and update your details to resubmit.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(driver.userId.toString(), "driver-status-updated", {
    approvalStatus: DRIVER_STATUS.REJECTED,
    message: `Your driver profile was rejected. Reason: ${reason}`,
  });

  return updatedDriver;
};

/**
 * Suspend Driver: mark User as inactive and write suspension details
 */
const suspendDriverInDB = async (
  driverId: string,
  adminId: string,
  reason?: string,
  note?: string,
  req?: Request,
) => {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  // Write suspension log details to Driver model
  await Driver.findByIdAndUpdate(driverId, {
    $set: {
      "suspension.isSuspended": true,
      "suspension.suspendedBy": new Types.ObjectId(adminId),
      "suspension.suspendedAt": new Date(),
      "suspension.reason": reason || "",
      "suspension.note": note || "",
    },
  });

  // Suspend user (mark status inactive)
  await User.findByIdAndUpdate(driver.userId, {
    status: STATUS.INACTIVE,
  });

  // 1. Audit Log
  await createAuditLog(
    "DRIVER_SUSPENDED",
    adminId,
    { driverId, reason, note },
    req,
  );

  // 2. Push Notification
  await sendNotifications({
    receiver: driver.userId,
    type: NOTIFICATION_TYPE.DRIVER,
    title: "Driver Account Suspended",
    text: `Your driver account has been suspended. Reason: ${reason || "Policy violation."}`,
  });

  // 3. Email
  const user = await User.findById(driver.userId);
  if (user && user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Alygo Account Suspension Notice",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>This is to inform you that your driver account on <strong>Alygo</strong> has been suspended.</p>
          <p><strong>Reason:</strong> ${reason || "Policy violation."}</p>
          <p>If you believe this is a mistake, please reach out to customer support.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(driver.userId.toString(), "driver-status-updated", {
    isSuspended: true,
    message: `Your driver account has been suspended. Reason: ${reason}`,
  });

  return { success: true, message: "Driver suspended successfully" };
};

/**
 * Unsuspend Driver: mark User as active and clear suspension details
 */
const unsuspendDriverInDB = async (
  driverId: string,
  adminId: string,
  req?: Request,
) => {
  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  // Clear suspension log details from Driver model
  await Driver.findByIdAndUpdate(driverId, {
    $set: {
      "suspension.isSuspended": false,
      "suspension.suspendedBy": null,
      "suspension.suspendedAt": null,
      "suspension.reason": "",
      "suspension.note": "",
    },
  });

  // Unsuspend user
  await User.findByIdAndUpdate(driver.userId, {
    status: STATUS.ACTIVE,
  });

  // 1. Audit Log
  await createAuditLog("DRIVER_UNSUSPENDED", adminId, { driverId }, req);

  // 2. Push Notification
  await sendNotifications({
    receiver: driver.userId,
    type: NOTIFICATION_TYPE.DRIVER,
    title: "Driver Account Activated",
    text: "Your driver account suspension has been lifted. Welcome back!",
  });

  // 3. Email
  const user = await User.findById(driver.userId);
  if (user && user.email) {
    await emailHelper.sendEmail({
      to: user.email,
      subject: "Alygo Driver Account Reactivated",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hello ${user.name},</h2>
          <p>We are pleased to inform you that your driver account on <strong>Alygo</strong> has been reactivated.</p>
          <p>You can now go online inside the driver app and start accepting ride matchings.</p>
          <br />
          <p>Best regards,<br/>The Alygo Team</p>
        </div>
      `,
    });
  }

  // 4. Socket Event
  socketHelper.sendToUser(driver.userId.toString(), "driver-status-updated", {
    isSuspended: false,
    message: "Your driver account suspension has been lifted.",
  });

  return { success: true, message: "Driver unsuspended successfully" };
};

export const DriverManagementServices = {
  getDriversOverviewFromDB,
  getOverviewSummaryFromDB,
  getOnlineDriversFromDB,
  getPendingApprovalDriversFromDB,
  getSuspendedDriversFromDB,
  getComplianceDriversFromDB,
  getDriverDetailsFromDB,
  approveDriverInDB,
  rejectDriverInDB,
  suspendDriverInDB,
  unsuspendDriverInDB,
};
