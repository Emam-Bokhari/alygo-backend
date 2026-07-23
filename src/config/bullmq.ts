import { Queue, Worker, Job } from "bullmq";
import config from "./index";
import { logger } from "../shared/logger";

// BullMQ connection options
const connectionOptions = {
  host: config.redis_host || "localhost",
  port: parseInt(config.redis_port || "6379"),
  password: config.redis_password,
  db: parseInt(config.redis_db || "0"),
};

// Queue names
export const QUEUE_NAMES = {
  RIDE_EXPIRATION: "ride-expiration",
  DRIVER_VISIBILITY: "driver-visibility",
  RADIUS_EXPANSION: "radius-expansion",
  DRIVER_AVAILABILITY_CHECK: "driver-availability-check",
  RESERVATION_REMINDER: "reservation-reminder",
  DRIVER_REWARDS_CHECK: "driver-rewards-check",
};

// Create queues
export const rideExpirationQueue = new Queue(QUEUE_NAMES.RIDE_EXPIRATION, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const driverVisibilityQueue = new Queue(QUEUE_NAMES.DRIVER_VISIBILITY, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const radiusExpansionQueue = new Queue(QUEUE_NAMES.RADIUS_EXPANSION, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const driverAvailabilityCheckQueue = new Queue(
  QUEUE_NAMES.DRIVER_AVAILABILITY_CHECK,
  {
    connection: connectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  },
);

export const reservationReminderQueue = new Queue(
  QUEUE_NAMES.RESERVATION_REMINDER,
  {
    connection: connectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  },
);

export const driverRewardsQueue = new Queue(QUEUE_NAMES.DRIVER_REWARDS_CHECK, {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Job data types
export interface RideExpirationJobData {
  rideId: string;
  userId: string;
}

export interface DriverVisibilityJobData {
  rideId: string;
  driverId: string;
  userId: string;
}

export interface RadiusExpansionJobData {
  rideId: string;
  userId: string;
  pickupLocation: { type: string; coordinates: [number, number] };
  currentRadiusKm: number;
  rideCategoryId: string;
  serviceCategoryId?: string;
  expansionCount: number;
}

export interface DriverAvailabilityCheckJobData {
  // No specific data needed for periodic checks
}

export { connectionOptions };
