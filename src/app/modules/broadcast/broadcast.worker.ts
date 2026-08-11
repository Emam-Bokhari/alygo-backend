import { Queue, Worker, Job } from "bullmq";
import { connectionOptions } from "../../../config/bullmq";
import { Broadcast } from "./broadcast.model";
import { BROADCAST_STATUS } from "./broadcast.constant";
import { BroadcastService } from "./broadcast.service";
import { logger } from "../../../shared/logger";
import colors from "colors";

export const BROADCAST_PROCESSING_QUEUE = "broadcast-processing";

export const broadcastProcessingQueue = new Queue(BROADCAST_PROCESSING_QUEUE, {
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
 * Process all due scheduled broadcasts.
 * Finds broadcasts with status SCHEDULED and scheduledAt <= now,
 * then processes each one using the shared processAndSendBroadcast function.
 */
const processDueBroadcasts = async (): Promise<void> => {
  const now = new Date();

  // Find all due scheduled broadcasts (not deleted)
  const dueBroadcasts = await Broadcast.find({
    status: BROADCAST_STATUS.SCHEDULED,
    scheduledAt: { $lte: now },
  })
    .select("_id")
    .lean();

  if (dueBroadcasts.length === 0) return;

  logger.info(
    colors.blue(
      `[Broadcast Worker] Found ${dueBroadcasts.length} due broadcast(s) to process`,
    ),
  );

  // Process each due broadcast
  // processAndSendBroadcast has built-in atomic status transition,
  // so duplicate processing is prevented even with concurrent workers
  for (const broadcast of dueBroadcasts) {
    try {
      await BroadcastService.processAndSendBroadcast(
        broadcast._id.toString(),
      );
    } catch (err: any) {
      logger.error(
        colors.red(
          `[Broadcast Worker] Error processing broadcast ${broadcast._id}: ${err.message}`,
        ),
      );
    }
  }
};

const broadcastWorker = new Worker(
  BROADCAST_PROCESSING_QUEUE,
  async (job: Job) => {
    logger.info(`[Broadcast Worker] Processing job ${job.id}`);
    try {
      await processDueBroadcasts();
    } catch (err: any) {
      logger.error(
        `[Broadcast Worker] Error in broadcast processing job: ${err.message}`,
      );
      throw err;
    }
  },
  {
    connection: connectionOptions,
  },
);

broadcastWorker.on("completed", (job) => {
  logger.info(`[Broadcast Worker] Job ${job.id} completed successfully`);
});

broadcastWorker.on("failed", (job, err) => {
  logger.error(`[Broadcast Worker] Job ${job?.id} failed: ${err.message}`);
});

export const broadcastWorkerExports = {
  broadcastProcessingQueue,
  broadcastWorker,
};
