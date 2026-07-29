import { Queue, Worker, Job } from "bullmq";
import { connectionOptions } from "../../../../config/bullmq";
import { Call } from "../call.model";
import { CALL_STATUS } from "../call.constant";
import { callSocketHelper } from "../socket/call.socket";
import { notificationHelper } from "../../../builder/pushNotification";
import { NOTIFICATION_TYPE } from "../../notification/notification.constant";
import { logger } from "../../../../shared/logger";
import { User } from "../../user/user.model";
import config from "../../../../config";
import colors from "colors";

export const CALL_CLEANUP_QUEUE = "call-cleanup";

export const callCleanupQueue = new Queue(CALL_CLEANUP_QUEUE, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

/**
 * Cleanup expired, ringing, and excessively long-running active calls
 */
const processCallCleanup = async (): Promise<void> => {
  const now = new Date();

  // 1. Expire Ring Timeout (mark calls as TIMEOUT / MISSED after CALL_RING_TIMEOUT_SECONDS)
  const ringTimeoutSeconds = config.agora.ringTimeoutSeconds || 30;
  const ringTimeoutThreshold = new Date(
    now.getTime() - ringTimeoutSeconds * 1000,
  );

  const timedOutCalls = await Call.find({
    status: { $in: [CALL_STATUS.INITIATED, CALL_STATUS.RINGING] },
    createdAt: { $lte: ringTimeoutThreshold },
  });

  for (const call of timedOutCalls) {
    call.status = CALL_STATUS.TIMEOUT;
    call.missed = true;
    call.endedAt = now;
    call.endReason = "ring_timeout";
    await call.save();

    logger.info(
      colors.yellow(
        `[Call Cleanup Worker] Call ${call._id} timed out due to no answer (missed).`,
      ),
    );

    const callerUser = await User.findById(call.callerId).select(
      "name profileImage",
    );
    const receiverUser = await User.findById(call.receiverId).select(
      "name profileImage",
    );

    // Emit WebSockets events
    const payload = {
      callId: call._id.toString(),
      status: CALL_STATUS.TIMEOUT,
      reason: "ring_timeout",
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
      callerName: callerUser?.name || "",
      callerProfileImage: callerUser?.profileImage || null,
      receiverName: receiverUser?.name || "",
      receiverProfileImage: receiverUser?.profileImage || null,
    };

    callSocketHelper.emitCallTimeout(call.callerId.toString(), payload);
    callSocketHelper.emitCallTimeout(call.receiverId.toString(), payload);
    callSocketHelper.emitCallEnded(call.callerId.toString(), payload);
    callSocketHelper.emitCallEnded(call.receiverId.toString(), payload);

    // Send FCM push notifications for missed call
    try {
      const isReceiverDriver = call.receiverRole === "driver";
      await notificationHelper.sendToUser(call.receiverId.toString(), {
        title: "Missed Call",
        body: `You missed a call from ${
          call.callerRole === "driver" ? "Driver" : "Passenger"
        }.`,
        type: isReceiverDriver
          ? NOTIFICATION_TYPE.DRIVER
          : NOTIFICATION_TYPE.USER,
        data: {
          type: "call-missed",
          callId: call._id.toString(),
        },
      });
    } catch (fcmError: any) {
      logger.error(
        `[Call Cleanup Worker] FCM error for missed call ${call._id}: ${fcmError.message}`,
      );
    }
  }

  // 2. Clean up long-running calls in ACCEPTED or CONNECTED status exceeding CALL_MAX_DURATION_MINUTES
  const maxDurationMinutes = config.agora.maxDurationMinutes || 120;
  const durationThreshold = new Date(
    now.getTime() - maxDurationMinutes * 60 * 1000,
  );

  const longRunningCalls = await Call.find({
    status: { $in: [CALL_STATUS.ACCEPTED, CALL_STATUS.CONNECTED] },
    $or: [
      { startedAt: { $lte: durationThreshold } },
      { answeredAt: { $lte: durationThreshold } },
      { createdAt: { $lte: durationThreshold } },
    ],
  });

  for (const call of longRunningCalls) {
    const callStartTime = call.startedAt || call.answeredAt || call.createdAt;
    const durationSec = Math.floor(
      (now.getTime() - callStartTime.getTime()) / 1000,
    );

    call.status = CALL_STATUS.ENDED;
    call.endedAt = now;
    call.durationSeconds = durationSec;
    call.endReason = "max_duration_exceeded";
    await call.save();

    logger.info(
      colors.yellow(
        `[Call Cleanup Worker] Call ${call._id} automatically ended. Maximum duration reached.`,
      ),
    );

    const callerUser = await User.findById(call.callerId).select(
      "name profileImage",
    );
    const receiverUser = await User.findById(call.receiverId).select(
      "name profileImage",
    );

    // Emit socket events
    const payload = {
      callId: call._id.toString(),
      status: CALL_STATUS.ENDED,
      reason: "max_duration_exceeded",
      durationSeconds: durationSec,
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
      callerName: callerUser?.name || "",
      callerProfileImage: callerUser?.profileImage || null,
      receiverName: receiverUser?.name || "",
      receiverProfileImage: receiverUser?.profileImage || null,
    };
    callSocketHelper.emitCallEnded(call.callerId.toString(), payload);
    callSocketHelper.emitCallEnded(call.receiverId.toString(), payload);
  }
};

const callCleanupWorker = new Worker(
  CALL_CLEANUP_QUEUE,
  async (job: Job) => {
    logger.info(`[Call Cleanup Worker] Processing job ${job.id}`);
    try {
      await processCallCleanup();
    } catch (err: any) {
      logger.error(
        `[Call Cleanup Worker] Error processing call cleanup: ${err.message}`,
      );
      throw err;
    }
  },
  {
    connection: connectionOptions,
  },
);

callCleanupWorker.on("completed", (job) => {
  logger.info(`[Call Cleanup Worker] Job ${job.id} completed successfully`);
});

callCleanupWorker.on("failed", (job, err) => {
  logger.error(`[Call Cleanup Worker] Job ${job?.id} failed: ${err.message}`);
});

export const callWorker = {
  callCleanupQueue,
  callCleanupWorker,
};
