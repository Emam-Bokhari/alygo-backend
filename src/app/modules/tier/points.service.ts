import { Types } from "mongoose";
import { POINT_EVENT_TYPE } from "./tier.constant";
import { PointRule } from "./pointRule.model";
import { DriverPointHistory } from "./driverPointHistory.model";
import { TierHistory } from "./tierHistory.model";
import { Tier } from "./tier.model";
import { Driver } from "../driver/driver.model";
import { Ride } from "../ride/ride.model";
import { RIDE_STATUS, DRIVER_MATCHING_STATUS } from "../ride/ride.constant";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { socketHelper } from "../../../helpers/socketHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { logger } from "../../../shared/logger";
import { STATUS } from "../../../enums/user";

// Fallback points constants
const FALLBACK_POINTS: Partial<Record<POINT_EVENT_TYPE, number>> = {
  [POINT_EVENT_TYPE.RIDE_COMPLETED]: 5,
  [POINT_EVENT_TYPE.FIVE_STAR_RATING]: 2,
  [POINT_EVENT_TYPE.AIRPORT_RIDE]: 3,
  [POINT_EVENT_TYPE.SCHEDULED_RIDE]: 2,
  [POINT_EVENT_TYPE.PEAK_HOUR_RIDE]: 2,
  [POINT_EVENT_TYPE.REFERRAL_COMPLETED]: 10,
  [POINT_EVENT_TYPE.ACCEPTED_RIDE_CANCELLED]: -10,
  [POINT_EVENT_TYPE.POLICY_VIOLATION]: -50,
};

/**
 * Calculate dynamic driver acceptance rate based on notified rides in the last 30 days
 */
export const calculateDriverAcceptanceRate = async (
  driverUserId: string | Types.ObjectId,
): Promise<number> => {
  const driverId = new Types.ObjectId(driverUserId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rides = await Ride.find({
    "driverMatching.notifiedDrivers.driverId": driverId,
    createdAt: { $gte: thirtyDaysAgo },
  }).select("driverMatching.notifiedDrivers driverId");

  let offered = 0;
  let accepted = 0;

  for (const ride of rides) {
    const notifyInfo = ride.driverMatching?.notifiedDrivers?.find(
      (nd: any) => nd.driverId.toString() === driverId.toString(),
    );
    if (notifyInfo) {
      offered++;
      if (
        notifyInfo.status === DRIVER_MATCHING_STATUS.ACCEPTED ||
        ride.driverId?.toString() === driverId.toString()
      ) {
        accepted++;
      }
    }
  }

  return offered > 0 ? (accepted / offered) * 100 : 100;
};

/**
 * Seed default point rules if they do not exist
 */
const seedDefaultPointRules = async () => {
  try {
    const count = await PointRule.countDocuments();
    if (count === 0) {
      const defaultRules = [
        {
          name: "Ride Completed",
          eventType: POINT_EVENT_TYPE.RIDE_COMPLETED,
          points: 5,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "5-Star Rating",
          eventType: POINT_EVENT_TYPE.FIVE_STAR_RATING,
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Airport Ride",
          eventType: POINT_EVENT_TYPE.AIRPORT_RIDE,
          points: 3,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Scheduled Ride",
          eventType: POINT_EVENT_TYPE.SCHEDULED_RIDE,
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Peak Hour Ride",
          eventType: POINT_EVENT_TYPE.PEAK_HOUR_RIDE,
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Referral Completed",
          eventType: POINT_EVENT_TYPE.REFERRAL_COMPLETED,
          points: 10,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Accepted Ride Cancelled",
          eventType: POINT_EVENT_TYPE.ACCEPTED_RIDE_CANCELLED,
          points: -10,
          actionType: "deduction",
          status: STATUS.ACTIVE,
        },
        {
          name: "Policy Violation",
          eventType: POINT_EVENT_TYPE.POLICY_VIOLATION,
          points: -50,
          actionType: "deduction",
          status: STATUS.ACTIVE,
        },
      ];
      await PointRule.create(defaultRules);
      logger.info("✅ Default Point Rules seeded successfully.");
    }
  } catch (error: any) {
    logger.error("Error seeding default point rules:", error.message);
  }
};

/**
 * Award points to a driver
 */
const awardPoints = async (
  driverUserId: string | Types.ObjectId,
  eventType: POINT_EVENT_TYPE,
  source: string,
  referenceId?: string | Types.ObjectId,
  options: {
    notes?: string;
    session?: any;
    rideId?: string | Types.ObjectId;
    metadata?: Record<string, any>;
    overridePoints?: number;
    adminId?: string | Types.ObjectId;
  } = {},
) => {
  const session = options.session;
  try {
    const config = await getSystemConfig();

    // If driver rewards system is disabled globally, skip
    if (config.driverRewards && !config.driverRewards.enabled) {
      logger.info(`[Point Processing Failed] Driver rewards system is disabled globally.`);
      return null;
    }

    const driverId = new Types.ObjectId(driverUserId);

    // 1. Idempotency Checks
    let finalReferenceId = referenceId ? new Types.ObjectId(referenceId) : undefined;

    if (finalReferenceId) {
      const existingHistory = await DriverPointHistory.findOne({
        driverId,
        eventType,
        referenceId: finalReferenceId,
      }).session(session);

      if (existingHistory) {
        logger.info(
          `[Duplicate Prevented] Point transaction already processed (by referenceId) for driver ${driverUserId}, event ${eventType}, reference ${referenceId}.`
        );
        return null;
      }
    }

    // Deduplicate by rideId for ride-related events to ensure they only apply once per ride
    let rideIdToCheck: Types.ObjectId | undefined;
    if (options.rideId) {
      rideIdToCheck = new Types.ObjectId(options.rideId);
    } else if (source === "ride" && referenceId) {
      rideIdToCheck = new Types.ObjectId(referenceId);
    }

    if (rideIdToCheck) {
      const existingRideHistory = await DriverPointHistory.findOne({
        driverId,
        eventType,
        rideId: rideIdToCheck,
      }).session(session);

      if (existingRideHistory) {
        logger.info(
          `[Duplicate Prevented] Point transaction already processed (by rideId) for driver ${driverUserId}, event ${eventType}, ride ${rideIdToCheck}.`
        );
        return null;
      }
    }

    // 2. Fetch point rule configuration
    let pointValue = 0;
    let ruleId: Types.ObjectId | undefined;
    let action: "earning" | "deduction" = "earning";

    if (eventType === POINT_EVENT_TYPE.ADMIN_OVERRIDE) {
      pointValue = options.overridePoints !== undefined ? options.overridePoints : 0;
      action = pointValue >= 0 ? "earning" : "deduction";
    } else {
      const rule = await PointRule.findOne({ eventType }).session(session);

      if (!rule) {
        logger.warn(`[Rule Missing] PointRule does not exist in the database for event: ${eventType}.`);
        return null;
      }

      if (rule.status !== STATUS.ACTIVE) {
        logger.warn(`[Rule Disabled] PointRule is not active for event: ${eventType}.`);
        return null;
      }

      if (typeof rule.points !== "number" || isNaN(rule.points)) {
        logger.error(`[Point Processing Failed] PointRule points value is invalid for event ${eventType}: ${rule.points}`);
        return null;
      }

      pointValue = rule.points;
      ruleId = rule._id;
      action = rule.actionType;

      // Normalize points sign based on actionType
      if (action === "deduction" && pointValue > 0) {
        pointValue = -pointValue;
      } else if (action === "earning" && pointValue < 0) {
        pointValue = -pointValue;
      }
    }

    if (pointValue === 0) {
      logger.info(`[Point Processing Failed] Point value is 0 for event ${eventType}, skipping.`);
      return null;
    }

    // 3. Find driver profile
    const driver = await Driver.findOne({ userId: driverId }).session(session);
    if (!driver) {
      logger.error(`[Point Processing Failed] Driver profile not found for user ID: ${driverUserId}`);
      return null;
    }

    // Calculate new points
    const oldPoints = driver.currentPoints || 0;
    const newPoints = Math.max(0, oldPoints + pointValue);
    const lifetimeIncrease = pointValue > 0 ? pointValue : 0;
    const oldLifetime = driver.lifetimePoints || 0;

    driver.currentPoints = newPoints;
    driver.lifetimePoints = oldLifetime + lifetimeIncrease;

    // Initialize tier if not present
    if (!driver.currentTier) {
      const defaultTier = await Tier.findOne({ level: 1 }).session(session);
      if (defaultTier) {
        driver.currentTier = defaultTier._id;
      }
    }

    // Ensure we have a referenceId to satisfy Mongoose compound unique index
    if (!finalReferenceId) {
      finalReferenceId = new Types.ObjectId();
    }

    // 4. Save points log history
    const historyData: any = {
      driverId,
      eventType,
      source,
      points: pointValue,
      balanceAfter: newPoints,
      notes: options.notes || `Points change for event ${eventType}`,
      ruleId,
      referenceId: finalReferenceId,
      action,
      previousBalance: oldPoints,
      balanceChange: pointValue,
      newBalance: newPoints,
      metadata: {
        rideId: rideIdToCheck,
        reportId: source === "tripReport" ? finalReferenceId : undefined,
        referralId: source === "referral" ? finalReferenceId : undefined,
        adminId: options.adminId ? new Types.ObjectId(options.adminId) : undefined,
        notes: options.notes,
        source,
        ...options.metadata,
      },
    };

    if (source === "ride" && rideIdToCheck) historyData.rideId = rideIdToCheck;
    else if (source === "referral" && finalReferenceId) historyData.referralId = finalReferenceId;

    const [historyEntry] = await DriverPointHistory.create([historyData], {
      session,
    });

    await driver.save({ session });

    if (pointValue > 0) {
      logger.info(`[Points Awarded] Awarded ${pointValue} points to driver ${driverUserId} for event ${eventType}.`);
    } else {
      logger.info(`[Points Deducted] Deducted ${Math.abs(pointValue)} points from driver ${driverUserId} for event ${eventType}.`);
    }

    // 5. Evaluate and sync tiers immediately
    await syncDriverTier(driverId, session);

    // 6. Socket notification
    socketHelper.sendToUser(driverId.toString(), "driver-points-updated", {
      points: newPoints,
      eventType,
      change: pointValue,
    });

    // 7. Push notification
    sendNotifications({
      receiver: driverId,
      title: pointValue > 0 ? "Points Earned! 🎉" : "Points Deducted ⚠️",
      text: `You have ${pointValue > 0 ? "earned" : "lost"} ${Math.abs(pointValue)} points. Your new balance is ${newPoints} points.`,
      type: NOTIFICATION_TYPE.DRIVER,
    }).catch((err) => logger.error("FCM Notification error:", err.message));

    return historyEntry;
  } catch (error: any) {
    logger.error(`[Point Processing Failed] Failed to process points: ${error.message}`);
    return null;
  }
};

/**
 * Deduct points from a driver
 */
const deductPoints = async (
  driverUserId: string | Types.ObjectId,
  eventType: POINT_EVENT_TYPE,
  source: string,
  referenceId?: string | Types.ObjectId,
  options: {
    notes?: string;
    session?: any;
    rideId?: string | Types.ObjectId;
    metadata?: Record<string, any>;
    overridePoints?: number;
    adminId?: string | Types.ObjectId;
  } = {},
) => {
  // Deducting points is structurally the same as awarding points (the awardPoints method normalizes the sign based on the event rule)
  return await awardPoints(
    driverUserId,
    eventType,
    source,
    referenceId,
    options,
  );
};

/**
 * Sync driver tier (evaluates qualifications and promotes/demotes if necessary)
 */
const syncDriverTier = async (
  driverUserId: string | Types.ObjectId,
  session?: any,
) => {
  const driverId = new Types.ObjectId(driverUserId);
  const driver = await Driver.findOne({ userId: driverId }).session(session);
  if (!driver) {
    logger.warn(`[Point Processing Failed] Driver profile not found for user: ${driverUserId}`);
    return;
  }

  const currentPoints = driver.currentPoints || 0;

  // 1. Calculate driver statistics
  const tripsCount = await Ride.countDocuments({
    driverId,
    status: RIDE_STATUS.COMPLETED,
  }).session(session);

  const rating = driver.averageRating || 0;
  const acceptanceRate = await calculateDriverAcceptanceRate(driverId);

  // 2. Fetch all active tiers
  const activeTiers = await Tier.find({ status: STATUS.ACTIVE })
    .sort({ level: 1 })
    .session(session);

  if (activeTiers.length === 0) {
    logger.warn(`[Point Processing Failed] No active tiers found in system.`);
    return;
  }

  // 3. Find the highest matching tier
  let eligibleTier = activeTiers[0]; // fallback to lowest level
  for (const tier of activeTiers) {
    const pointsSatisfied =
      currentPoints >= (tier.requirements?.pointsRequired || 0);
    const tripsSatisfied =
      tripsCount >= (tier.requirements?.tripsRequired || 0);
    const ratingSatisfied = rating >= (tier.requirements?.ratingRequired || 0);
    const acceptanceSatisfied =
      acceptanceRate >= (tier.requirements?.acceptanceRateRequired || 0);

    if (
      pointsSatisfied &&
      tripsSatisfied &&
      ratingSatisfied &&
      acceptanceSatisfied
    ) {
      eligibleTier = tier;
    }
  }

  // Get next tier if available
  const nextTier =
    activeTiers.find((t) => t.level === eligibleTier.level + 1) || null;
  driver.nextTier = nextTier ? nextTier._id : null;

  // Update progress percentage
  if (nextTier && nextTier.requirements?.pointsRequired) {
    driver.progressPercentage = Math.min(
      99,
      Math.round((currentPoints / nextTier.requirements.pointsRequired) * 100),
    );
  } else {
    driver.progressPercentage = 100;
  }

  const oldTierId = driver.currentTier;

  // Check if we need to promote, demote, or keep same
  if (!oldTierId) {
    // Initial tier assignment
    driver.currentTier = eligibleTier._id;
    driver.tierAchievedAt = new Date();
    await driver.save({ session });
    logger.info(`[Tier Updated] Initial tier assigned: driver ${driverUserId}, tier ${eligibleTier.name}`);
    return;
  }

  if (oldTierId.toString() !== eligibleTier._id.toString()) {
    const oldTier = await Tier.findById(oldTierId).session(session);
    if (!oldTier) {
      // If old tier doesn't exist, just update
      driver.currentTier = eligibleTier._id;
      driver.tierAchievedAt = new Date();
      await driver.save({ session });
      logger.info(`[Tier Updated] Tier updated from non-existent: driver ${driverUserId}, new tier ${eligibleTier.name}`);
      return;
    }

    if (eligibleTier.level > oldTier.level) {
      // Promote!
      driver.currentTier = eligibleTier._id;
      driver.tierAchievedAt = new Date();

      // Log tier history
      await TierHistory.create(
        [
          {
            driverId,
            oldTierId: oldTier._id,
            newTierId: eligibleTier._id,
            points: currentPoints,
            reason: `Automatic Promotion to ${eligibleTier.name} (Satisfied all conditions: Points, Trips, Rating, Acceptance Rate)`,
          },
        ],
        { session },
      );

      await driver.save({ session });

      logger.info(`[Tier Updated] Driver promoted: driver ${driverUserId}, old tier ${oldTier.name}, new tier ${eligibleTier.name}`);

      // Socket upgrade
      socketHelper.sendToUser(driverId.toString(), "driver-tier-upgraded", {
        oldTier: oldTier.name,
        newTier: eligibleTier.name,
        level: eligibleTier.level,
      });

      // Notification
      sendNotifications({
        receiver: driverId,
        title: "Tier Upgraded! 🏆",
        text: `Congratulations! You have been upgraded to the ${eligibleTier.name} Tier. Enjoy your new benefits.`,
        type: NOTIFICATION_TYPE.DRIVER,
      }).catch((err) => logger.error("FCM Notification error:", err.message));

    } else if (eligibleTier.level < oldTier.level) {
      // Demote!
      driver.currentTier = eligibleTier._id;
      driver.tierAchievedAt = new Date();

      // Log tier history
      await TierHistory.create(
        [
          {
            driverId,
            oldTierId: oldTier._id,
            newTierId: eligibleTier._id,
            points: currentPoints,
            reason: `Automatic Downgrade to ${eligibleTier.name} (Performance dropped below ${oldTier.name} requirements)`,
          },
        ],
        { session },
      );

      await driver.save({ session });

      logger.info(`[Tier Updated] Driver demoted: driver ${driverUserId}, old tier ${oldTier.name}, new tier ${eligibleTier.name}`);

      // Socket downgrade
      socketHelper.sendToUser(driverId.toString(), "driver-tier-downgraded", {
        oldTier: oldTier.name,
        newTier: eligibleTier.name,
        level: eligibleTier.level,
      });

      // Notification
      sendNotifications({
        receiver: driverId,
        title: "Tier Downgraded ⚠️",
        text: `Your rewards tier was adjusted to ${eligibleTier.name}. Please check requirements to upgrade again.`,
        type: NOTIFICATION_TYPE.DRIVER,
      }).catch((err) => logger.error("FCM Notification error:", err.message));
    }
  } else {
    // Save driver progress changes (nextTier, progressPercentage) even if currentTier didn't change
    await driver.save({ session });
  }
};

/**
 * Scheduled cron job to check and process downgrades for all drivers
 */
const processScheduledDowngrades = async () => {
  logger.info("⏳ Starting scheduled driver tier downgrade checks...");
  const config = await getSystemConfig();

  // If auto downgrade is disabled globally, skip
  if (config.driverRewards && !config.driverRewards.autoDowngrade) {
    logger.info(
      "Skipping auto-downgrades (autoDowngrade is disabled in system configurations).",
    );
    return;
  }

  try {
    const drivers = await Driver.find({}).select("userId");
    let demotedCount = 0;

    for (const d of drivers) {
      const session = await Driver.startSession();
      session.startTransaction();
      try {
        const oldTierId = (
          await Driver.findOne({ userId: d.userId }).session(session)
        )?.currentTier;
        await syncDriverTier(d.userId, session);
        const newTierId = (
          await Driver.findOne({ userId: d.userId }).session(session)
        )?.currentTier;

        if (
          oldTierId &&
          newTierId &&
          oldTierId.toString() !== newTierId.toString()
        ) {
          // Verify if it was a demotion
          const oldTier = await Tier.findById(oldTierId).session(session);
          const newTier = await Tier.findById(newTierId).session(session);
          if (oldTier && newTier && newTier.level < oldTier.level) {
            demotedCount++;
          }
        }
        await session.commitTransaction();
      } catch (err: any) {
        await session.abortTransaction();
        logger.error(
          `Failed demotion check for driver ${d.userId}:`,
          err.message,
        );
      } finally {
        session.endSession();
      }
    }

    logger.info(
      `✅ Scheduled demotion checks completed. Total demoted: ${demotedCount}`,
    );
  } catch (error: any) {
    logger.error("Error in processScheduledDowngrades:", error.message);
  }
};

export const PointsService = {
  seedDefaultPointRules,
  awardPoints,
  deductPoints,
  checkDriverTierProgression: syncDriverTier,
  checkDriverTierDowngrade: syncDriverTier,
  syncDriverTier,
  processScheduledDowngrades,
};
