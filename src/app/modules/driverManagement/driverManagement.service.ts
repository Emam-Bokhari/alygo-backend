import { Types } from "mongoose";
import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";
import { Driver } from "../driver/driver.model";
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
        { taxVerificationStatus: { $in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED] } },
        { backgroundCheckStatus: { $in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED] } },
        { identityVerificationStatus: { $in: [VERIFICATION_STATUS.PENDING, VERIFICATION_STATUS.REJECTED] } },
        { licenseExpiryDate: { $lte: thirtyDaysLater } },
      ],
    }),
    Driver.countDocuments({
      approvalStatus: DRIVER_STATUS.APPROVED,
      taxVerified: true,
      backgroundCheckStatus: VERIFICATION_STATUS.VERIFIED,
      identityVerificationStatus: VERIFICATION_STATUS.VERIFIED,
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
const queryDriversList = async (queryParams: Record<string, any>, extraFilters: Record<string, any> = {}) => {
  const queryBuilder = new DriverQueryBuilder({ ...queryParams, ...extraFilters });
  const filterQuery = await queryBuilder.build();
  const sort = queryBuilder.getSort();
  const { page, limit, skip } = queryBuilder.getPagination();

  // Query Driver collection
  const drivers = await Driver.find(filterQuery)
    .sort(sort as any)
    .skip(skip)
    .limit(limit)
    .populate("userId", "name email phone status averageRating totalRatings profileImage")
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
      userObj.averageRating = userObj.averageRating ? Math.round(userObj.averageRating) : 0;
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
const getPendingApprovalDriversFromDB = async (queryParams: Record<string, any>) => {
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
const getDriverDetailsFromDB = async (driverId: string) => {
  const driver = await Driver.findById(driverId)
    .populate("userId")
    .populate("currentTier")
    .populate("serviceAreaId")
    .lean();

  if (!driver) {
    throw new ApiError(404, "Driver not found");
  }

  const userId = driver.userId ? (driver.userId as any)._id : null;

  // Retrieve parallel details (Trips: limit last 10, Wallet Transactions: limit last 10)
  const [vehicle, wallet, completedRides, cancelledRides, totalRides, recentTrips, recentTransactions] = await Promise.all([
    Car.findOne({ driverId: driver._id }).lean(),
    userId ? Wallet.findOne({ userId }).lean() : Promise.resolve(null),
    userId ? Ride.countDocuments({ driverId: userId, status: RIDE_STATUS.COMPLETED }) : Promise.resolve(0),
    userId ? Ride.countDocuments({ driverId: userId, status: { $in: [RIDE_STATUS.CANCELLED, RIDE_STATUS.CANCELLED_BY_DRIVER] } }) : Promise.resolve(0),
    userId ? Ride.countDocuments({ driverId: userId }) : Promise.resolve(0),
    userId
      ? Ride.find({ driverId: userId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate("userId", "name profileImage phone")
          .lean()
      : Promise.resolve([]),
    userId
      ? Transaction.find({ $or: [{ userId }, { driverId: driver._id }] })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
      : Promise.resolve([]),
  ]);

  const acceptanceRate = userId ? await calculateDriverAcceptanceRate(userId) : 0;
  const cancellationRate = totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0;

  // Round rating scores only in response output DTO to preserve DB float value
  const roundedRating = driver.averageRating ? Math.round(driver.averageRating) : 0;
  const roundedUserRating = driver.userId && (driver.userId as any).averageRating
    ? Math.round((driver.userId as any).averageRating)
    : 0;

  const userWithRoundedRating = driver.userId
    ? { ...driver.userId, averageRating: roundedUserRating }
    : null;

  // Activity list builder (Activities: limit last 20)
  const activities: any[] = [];
  if (driver.recentDestinations) {
    driver.recentDestinations.forEach((d: any) => {
      activities.push({
        type: "destination_visited",
        title: `Visited destination: ${d.title}`,
        timestamp: d.lastVisitedAt || d.createdAt,
      });
    });
  }
  recentTrips.forEach((t: any) => {
    activities.push({
      type: "trip",
      title: `Trip ${t.status} - ${t.pickupAddress || "Unknown"} to ${t.destinationAddress || "Unknown"}`,
      timestamp: t.createdAt,
    });
  });
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Return clean, modular structured object
  return {
    driverId: driver._id.toString(),
    userId: userId ? userId.toString() : null,
    driverInfo: userWithRoundedRating,
    vehicle,
    documents: {
      drivingLicense: driver.drivingLicense || "",
      liveSelfie: driver.liveSelfie || "",
      ssn: driver.ssn || "",
      taxDocuments: driver.taxDocuments || [],
    },
    tier: {
      currentTier: driver.currentTier || null,
      nextTier: driver.nextTier || null,
      progressPercentage: driver.progressPercentage || 0,
      tierAchievedAt: driver.tierAchievedAt || null,
    },
    rideStatistics: {
      totalRides,
      completedRides,
      cancelledRides,
      cancellationRate,
      acceptanceRate,
    },
    wallet: wallet || { balance: 0, currency: "USD", status: "none" },
    walletTransactions: recentTransactions,
    rating: {
      averageRating: roundedRating,
      totalRatings: driver.totalRatings || 0,
      totalReviews: driver.totalReviews || 0,
    },
    trips: recentTrips,
    compliance: {
      taxVerificationStatus: driver.taxVerificationStatus,
      backgroundCheckStatus: driver.backgroundCheckStatus || VERIFICATION_STATUS.PENDING,
      identityVerificationStatus: driver.identityVerificationStatus || VERIFICATION_STATUS.PENDING,
      licenseExpiryDate: driver.licenseExpiryDate || null,
    },
    backgroundCheck: {
      status: driver.backgroundCheckStatus || VERIFICATION_STATUS.PENDING,
      verifiedAt: driver.backgroundCheckStatus === VERIFICATION_STATUS.VERIFIED ? (driver as any).updatedAt : null,
    },
    identityVerification: {
      status: driver.identityVerificationStatus || VERIFICATION_STATUS.PENDING,
      verifiedAt: driver.identityVerificationStatus === VERIFICATION_STATUS.VERIFIED ? (driver as any).updatedAt : null,
    },
    approvalInfo: {
      approvalStatus: driver.approvalStatus || DRIVER_STATUS.PENDING,
    },
    suspensionInfo: {
      isSuspended: driver.suspension?.isSuspended || false,
      suspendedBy: driver.suspension?.suspendedBy || null,
      suspendedAt: driver.suspension?.suspendedAt || null,
      reason: driver.suspension?.reason || "",
      note: driver.suspension?.note || "",
    },
    recentActivities: activities.slice(0, 20),
  };
};

/**
 * Approve Driver
 */
const approveDriverInDB = async (driverId: string, adminId: string, req?: Request) => {
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
const rejectDriverInDB = async (driverId: string, adminId: string, reason?: string, req?: Request) => {
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
const suspendDriverInDB = async (driverId: string, adminId: string, reason?: string, note?: string, req?: Request) => {
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
  await createAuditLog("DRIVER_SUSPENDED", adminId, { driverId, reason, note }, req);

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
const unsuspendDriverInDB = async (driverId: string, adminId: string, req?: Request) => {
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
