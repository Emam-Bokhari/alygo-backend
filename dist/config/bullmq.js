"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectionOptions =
  exports.reservationReminderQueue =
  exports.driverAvailabilityCheckQueue =
  exports.radiusExpansionQueue =
  exports.driverVisibilityQueue =
  exports.rideExpirationQueue =
  exports.QUEUE_NAMES =
    void 0;
const bullmq_1 = require("bullmq");
const index_1 = __importDefault(require("./index"));
// BullMQ connection options
const connectionOptions = {
  host: index_1.default.redis_host || "localhost",
  port: parseInt(index_1.default.redis_port || "6379"),
  password: index_1.default.redis_password,
  db: parseInt(index_1.default.redis_db || "0"),
};
exports.connectionOptions = connectionOptions;
// Queue names
exports.QUEUE_NAMES = {
  RIDE_EXPIRATION: "ride-expiration",
  DRIVER_VISIBILITY: "driver-visibility",
  RADIUS_EXPANSION: "radius-expansion",
  DRIVER_AVAILABILITY_CHECK: "driver-availability-check",
  RESERVATION_REMINDER: "reservation-reminder",
};
// Create queues
exports.rideExpirationQueue = new bullmq_1.Queue(
  exports.QUEUE_NAMES.RIDE_EXPIRATION,
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
exports.driverVisibilityQueue = new bullmq_1.Queue(
  exports.QUEUE_NAMES.DRIVER_VISIBILITY,
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
exports.radiusExpansionQueue = new bullmq_1.Queue(
  exports.QUEUE_NAMES.RADIUS_EXPANSION,
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
exports.driverAvailabilityCheckQueue = new bullmq_1.Queue(
  exports.QUEUE_NAMES.DRIVER_AVAILABILITY_CHECK,
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
exports.reservationReminderQueue = new bullmq_1.Queue(
  exports.QUEUE_NAMES.RESERVATION_REMINDER,
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
