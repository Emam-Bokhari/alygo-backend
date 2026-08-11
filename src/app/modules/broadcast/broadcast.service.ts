import { StatusCodes } from "http-status-codes";
import { Broadcast } from "./broadcast.model";
import { IBroadcast } from "./broadcast.interface";
import {
  BROADCAST_DELIVERY_TYPE,
  BROADCAST_STATUS,
  BROADCAST_TARGET,
} from "./broadcast.constant";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { notificationHelper } from "../../builder/pushNotification";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { USER_ROLES, STATUS, DRIVER_STATUS } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { logger } from "../../../shared/logger";
import colors from "colors";

// Searchable fields for the list/search query
const BROADCAST_SEARCHABLE_FIELDS = ["title", "message"];

/**
 * Create a new broadcast announcement.
 * - Immediate: saves and processes in background.
 * - Scheduled: saves with SCHEDULED status for worker pickup.
 */
const createBroadcastToDB = async (
  payload: Partial<IBroadcast>,
  userId: string,
): Promise<IBroadcast> => {
  // Set createdBy
  payload.createdBy = userId as any;

  // Determine initial status
  if (payload.deliveryType === BROADCAST_DELIVERY_TYPE.IMMEDIATE) {
    payload.status = BROADCAST_STATUS.PENDING;
    // Clear scheduledAt for immediate delivery
    payload.scheduledAt = undefined;
  } else {
    payload.status = BROADCAST_STATUS.SCHEDULED;
  }

  const broadcast = await Broadcast.create(payload);
  if (!broadcast) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to create broadcast");
  }

  // For immediate delivery, process in background (non-blocking)
  if (payload.deliveryType === BROADCAST_DELIVERY_TYPE.IMMEDIATE) {
    processAndSendBroadcast(broadcast._id.toString()).catch((err) => {
      logger.error(
        colors.red(
          `[Broadcast] Background processing failed for ${broadcast._id}: ${err.message}`,
        ),
      );
    });
  }

  return broadcast;
};

/**
 * Resolve audience user IDs based on target audience and filters.
 * Returns an array of user ObjectIds eligible for push notification.
 */
const resolveAudienceUserIds = async (
  targetAudience: BROADCAST_TARGET,
  targetFilters?: IBroadcast["targetFilters"],
): Promise<string[]> => {
  switch (targetAudience) {
    case BROADCAST_TARGET.ALL_DRIVERS: {
      // Find all active, approved, non-suspended drivers
      const drivers = await Driver.find({
        approvalStatus: DRIVER_STATUS.APPROVED,
        "suspension.isSuspended": { $ne: true },
      })
        .select("userId")
        .lean();

      return drivers.map((d) => d.userId.toString());
    }

    case BROADCAST_TARGET.ALL_PASSENGERS: {
      // Find all active, non-suspended users with role "user" (passengers)
      const users = await User.find({
        role: USER_ROLES.USER,
        status: STATUS.ACTIVE,
        "suspension.isSuspended": { $ne: true },
      })
        .select("_id")
        .lean();

      return users.map((u) => u._id.toString());
    }

    case BROADCAST_TARGET.BY_CITY: {
      const cityId = targetFilters?.city;
      if (!cityId) return [];

      // Find the target city service area and all child areas (zones, airports) within it
      const serviceAreas = await ServiceArea.find({
        $or: [{ _id: cityId }, { cityId: cityId }],
        status: "active",
      })
        .select("_id")
        .lean();

      if (serviceAreas.length === 0) return [];

      const serviceAreaIds = serviceAreas.map((sa) => sa._id);

      // Find approved, non-suspended drivers in those service areas
      const drivers = await Driver.find({
        serviceAreaId: { $in: serviceAreaIds },
        approvalStatus: DRIVER_STATUS.APPROVED,
        "suspension.isSuspended": { $ne: true },
      })
        .select("userId")
        .lean();

      return drivers.map((d) => d.userId.toString());
    }

    case BROADCAST_TARGET.BY_STATE: {
      const stateId = targetFilters?.state;
      if (!stateId) return [];

      // Find the target state service area and all child areas (cities, zones, airports) within it
      const serviceAreas = await ServiceArea.find({
        $or: [{ _id: stateId }, { stateId: stateId }],
        status: "active",
      })
        .select("_id")
        .lean();

      if (serviceAreas.length === 0) return [];

      const serviceAreaIds = serviceAreas.map((sa) => sa._id);

      // Find approved, non-suspended drivers in those service areas
      const drivers = await Driver.find({
        serviceAreaId: { $in: serviceAreaIds },
        approvalStatus: DRIVER_STATUS.APPROVED,
        "suspension.isSuspended": { $ne: true },
      })
        .select("userId")
        .lean();

      return drivers.map((d) => d.userId.toString());
    }

    case BROADCAST_TARGET.BY_TIER: {
      const tierId = targetFilters?.tier;
      if (!tierId) return [];

      // Find approved, non-suspended drivers with the specified tier directly
      const drivers = await Driver.find({
        currentTier: tierId,
        approvalStatus: DRIVER_STATUS.APPROVED,
        "suspension.isSuspended": { $ne: true },
      })
        .select("userId")
        .lean();

      return drivers.map((d) => d.userId.toString());
    }

    default:
      return [];
  }
};

/**
 * Process and send a broadcast notification.
 * Uses atomic status transition to prevent duplicate processing.
 */
const processAndSendBroadcast = async (broadcastId: string): Promise<void> => {
  // Atomic status transition: only process if current status is PENDING or SCHEDULED
  const broadcast = await Broadcast.findOneAndUpdate(
    {
      _id: broadcastId,
      status: { $in: [BROADCAST_STATUS.PENDING, BROADCAST_STATUS.SCHEDULED] },
    },
    { $set: { status: BROADCAST_STATUS.PROCESSING } },
    { new: true },
  );

  if (!broadcast) {
    logger.info(
      colors.yellow(
        `[Broadcast] Skipping ${broadcastId} — already processing/sent/cancelled`,
      ),
    );
    return;
  }

  try {
    // Resolve audience
    const userIds = await resolveAudienceUserIds(
      broadcast.targetAudience,
      broadcast.targetFilters,
    );

    if (userIds.length === 0) {
      await Broadcast.findByIdAndUpdate(broadcastId, {
        $set: {
          status: BROADCAST_STATUS.SENT,
          sentAt: new Date(),
          recipientCount: 0,
          deliveredCount: 0,
        },
      });
      logger.info(
        colors.yellow(
          `[Broadcast] ${broadcastId} — no eligible recipients found`,
        ),
      );
      return;
    }

    // Determine notification type based on target audience
    const notificationType =
      broadcast.targetAudience === BROADCAST_TARGET.ALL_PASSENGERS
        ? NOTIFICATION_TYPE.USER
        : NOTIFICATION_TYPE.BROADCAST;

    // Send via existing push notification helper
    // notificationHelper.sendToBatch already handles:
    // - FCM multicast with 500-token batching
    // - Invalid token cleanup
    // - Parallel DB notification save
    await notificationHelper.sendToBatch(userIds, {
      title: broadcast.title,
      body: broadcast.message,
      type: notificationType,
      data: {
        type: NOTIFICATION_TYPE.BROADCAST,
        broadcastType: broadcast.type,
        referenceId: broadcast._id.toString(),
        referenceModel: "Broadcast",
      },
    });

    // Update broadcast as sent
    await Broadcast.findByIdAndUpdate(broadcastId, {
      $set: {
        status: BROADCAST_STATUS.SENT,
        sentAt: new Date(),
        recipientCount: userIds.length,
        deliveredCount: userIds.length,
      },
    });

    logger.info(
      colors.green(
        `✅ [Broadcast] ${broadcastId} sent to ${userIds.length} recipients`,
      ),
    );
  } catch (error: any) {
    // Mark as failed
    await Broadcast.findByIdAndUpdate(broadcastId, {
      $set: {
        status: BROADCAST_STATUS.FAILED,
        failureReason:
          error.message || "Unknown error during broadcast processing",
      },
    });

    logger.error(
      colors.red(`❌ [Broadcast] ${broadcastId} failed: ${error.message}`),
    );
  }
};

/**
 * Get all broadcasts with pagination, search, filter, and sort.
 */
const getAllBroadcastsFromDB = async (query: Record<string, unknown>) => {
  const baseQuery = Broadcast.find()
    .populate({
      path: "createdBy",
      select: "name email profileImage",
    })
    .populate({
      path: "targetFilters.city",
      select: "city type",
    })
    .populate({
      path: "targetFilters.state",
      select: "state type",
    })
    .populate({
      path: "targetFilters.tier",
      select: "name code level",
    });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(BROADCAST_SEARCHABLE_FIELDS)
    .filter()
    .sort()
    .paginate();

  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return {
    data: result,
    meta,
  };
};

/**
 * Get a single broadcast by ID.
 */
const getSingleBroadcastFromDB = async (
  id: string,
): Promise<IBroadcast | null> => {
  const broadcast = await Broadcast.findById(id)
    .populate({
      path: "createdBy",
      select: "name email profileImage",
    })
    .populate({
      path: "targetFilters.city",
      select: "city type",
    })
    .populate({
      path: "targetFilters.state",
      select: "state type",
    })
    .populate({
      path: "targetFilters.tier",
      select: "name code level",
    });

  if (!broadcast) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Broadcast not found");
  }

  return broadcast;
};

/**
 * Soft-delete a broadcast.
 * Prevents deletion of broadcasts currently being processed.
 */
const deleteBroadcastFromDB = async (id: string) => {
  const broadcast = await Broadcast.findById(id);
  if (!broadcast) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Broadcast not found");
  }

  if (broadcast.status === BROADCAST_STATUS.PROCESSING) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot delete a broadcast that is currently being processed",
    );
  }

  const result = await Broadcast.softDeleteById(id);
  return result;
};

/**
 * Cancel a scheduled broadcast.
 * Only broadcasts with SCHEDULED status can be cancelled.
 */
const cancelScheduledBroadcast = async (id: string) => {
  const broadcast = await Broadcast.findById(id);
  if (!broadcast) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Broadcast not found");
  }

  if (broadcast.status !== BROADCAST_STATUS.SCHEDULED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot cancel a broadcast with status "${broadcast.status}". Only scheduled broadcasts can be cancelled.`,
    );
  }

  const result = await Broadcast.findByIdAndUpdate(
    id,
    { $set: { status: BROADCAST_STATUS.CANCELLED } },
    { new: true },
  );

  return result;
};

export const BroadcastService = {
  createBroadcastToDB,
  resolveAudienceUserIds,
  processAndSendBroadcast,
  getAllBroadcastsFromDB,
  getSingleBroadcastFromDB,
  deleteBroadcastFromDB,
  cancelScheduledBroadcast,
};
