import { Types } from "mongoose";
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
const FALLBACK_POINTS: Record<string, number> = {
  ride_completed: 5,
  five_star_rating: 2,
  airport_ride: 3,
  scheduled_ride: 2,
  peak_hour_ride: 2,
  referral_completed: 10,
  accepted_ride_cancelled: -10,
  policy_violation: -50,
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
          eventType: "ride_completed",
          points: 5,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "5-Star Rating",
          eventType: "five_star_rating",
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Airport Ride",
          eventType: "airport_ride",
          points: 3,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Scheduled Ride",
          eventType: "scheduled_ride",
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Peak Hour Ride",
          eventType: "peak_hour_ride",
          points: 2,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Referral Completed",
          eventType: "referral_completed",
          points: 10,
          actionType: "earning",
          status: STATUS.ACTIVE,
        },
        {
          name: "Accepted Ride Cancelled",
          eventType: "accepted_ride_cancelled",
          points: -10,
          actionType: "deduction",
          status: STATUS.ACTIVE,
        },
        {
          name: "Policy Violation",
          eventType: "policy_violation",
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
  eventType: string,
  source: string,
  referenceId?: string | Types.ObjectId,
  options: { notes?: string; session?: any } = {},
) => {
  const session = options.session;
  const config = await getSystemConfig();

  // If driver rewards system is disabled globally, skip
  if (config.driverRewards && !config.driverRewards.enabled) {
    return null;
  }

  const driverId = new Types.ObjectId(driverUserId);

  // 1. Idempotency Check: Prevent duplicate awards
  if (referenceId) {
    const refObjectId = new Types.ObjectId(referenceId);
    const existingHistory = await DriverPointHistory.findOne({
      driverId,
      eventType,
      $or: [
        { rideId: refObjectId },
        { referralId: refObjectId },
        { transactionId: refObjectId },
      ],
    }).session(session);

    if (existingHistory) {
      logger.info(
        `Duplicate points event skipped: driver ${driverUserId}, event ${eventType}, reference ${referenceId}`,
      );
      return null;
    }
  }

  // 2. Fetch point rule configuration
  const rule = await PointRule.findOne({
    eventType,
    status: STATUS.ACTIVE,
  }).session(session);
  const pointValue = rule ? rule.points : FALLBACK_POINTS[eventType] || 0;

  if (pointValue === 0) {
    return null;
  }

  // 3. Find driver profile
  const driver = await Driver.findOne({ userId: driverId }).session(session);
  if (!driver) {
    logger.error(`Driver profile not found for user ID: ${driverUserId}`);
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

  // 4. Save points log history
  const historyData: any = {
    driverId,
    eventType,
    source,
    points: pointValue,
    balanceAfter: newPoints,
    notes: options.notes || `Points change for event ${eventType}`,
  };

  if (referenceId) {
    const refObjectId = new Types.ObjectId(referenceId);
    if (source === "ride") historyData.rideId = refObjectId;
    else if (source === "referral") historyData.referralId = refObjectId;
    else if (source === "wallet" || source === "transaction")
      historyData.transactionId = refObjectId;
  }

  const [historyEntry] = await DriverPointHistory.create([historyData], {
    session,
  });

  await driver.save({ session });

  // 5. Evaluate upgrades immediately on points increase
  if (pointValue > 0) {
    await checkDriverTierProgression(driverId, session);
  }

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
};

/**
 * Deduct points from a driver
 */
const deductPoints = async (
  driverUserId: string | Types.ObjectId,
  eventType: string,
  source: string,
  referenceId?: string | Types.ObjectId,
  options: { notes?: string; session?: any } = {},
) => {
  // Deducting points is structurally the same as awarding negative points
  return await awardPoints(
    driverUserId,
    eventType,
    source,
    referenceId,
    options,
  );
};

/**
 * Evaluate tier qualifications and promote if requirements are met
 */
const checkDriverTierProgression = async (
  driverUserId: string | Types.ObjectId,
  session?: any,
) => {
  const driverId = new Types.ObjectId(driverUserId);
  const driver = await Driver.findOne({ userId: driverId }).session(session);
  if (!driver) return;

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

  if (activeTiers.length === 0) return;

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

  // If driver qualifies for a higher level tier than their current one, promote!
  if (!oldTierId || oldTierId.toString() !== eligibleTier._id.toString()) {
    const oldTier = oldTierId
      ? await Tier.findById(oldTierId).session(session)
      : null;

    // Promote if eligibleTier level is greater than oldTier level
    if (!oldTier || eligibleTier.level > oldTier.level) {
      driver.currentTier = eligibleTier._id;
      driver.tierAchievedAt = new Date();

      // Log tier history
      await TierHistory.create(
        [
          {
            driverId,
            oldTierId: oldTierId || null,
            newTierId: eligibleTier._id,
            points: currentPoints,
            reason: `Automatic Promotion to ${eligibleTier.name} (Satisfied all conditions: Points, Trips, Rating, Acceptance Rate)`,
          },
        ],
        { session },
      );

      await driver.save({ session });

      // Socket upgrade
      socketHelper.sendToUser(driverId.toString(), "driver-tier-upgraded", {
        oldTier: oldTier ? oldTier.name : null,
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
    }
  }
};

/**
 * Evaluate tier downgrade criteria and demote if necessary
 */
const checkDriverTierDowngrade = async (
  driverUserId: string | Types.ObjectId,
  session?: any,
) => {
  const driverId = new Types.ObjectId(driverUserId);
  const driver = await Driver.findOne({ userId: driverId }).session(session);
  if (!driver) return;

  const currentPoints = driver.currentPoints || 0;

  // 1. Calculate stats
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

  if (activeTiers.length === 0) return;

  // 3. Find highest level matching tier
  let eligibleTier = activeTiers[0];
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

  const oldTierId = driver.currentTier;

  // Demote if eligible level is lower than current tier level
  if (oldTierId && oldTierId.toString() !== eligibleTier._id.toString()) {
    const oldTier = await Tier.findById(oldTierId).session(session);

    if (oldTier && eligibleTier.level < oldTier.level) {
      driver.currentTier = eligibleTier._id;
      driver.tierAchievedAt = new Date();

      // Get next tier
      const nextTier =
        activeTiers.find((t) => t.level === eligibleTier.level + 1) || null;
      driver.nextTier = nextTier ? nextTier._id : null;

      if (nextTier && nextTier.requirements?.pointsRequired) {
        driver.progressPercentage = Math.min(
          99,
          Math.round(
            (currentPoints / nextTier.requirements.pointsRequired) * 100,
          ),
        );
      } else {
        driver.progressPercentage = 100;
      }

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
        await checkDriverTierDowngrade(d.userId, session);
        const newTierId = (
          await Driver.findOne({ userId: d.userId }).session(session)
        )?.currentTier;

        if (
          oldTierId &&
          newTierId &&
          oldTierId.toString() !== newTierId.toString()
        ) {
          demotedCount++;
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
  checkDriverTierProgression,
  checkDriverTierDowngrade,
  processScheduledDowngrades,
};
