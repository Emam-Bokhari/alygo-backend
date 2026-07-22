"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDriverSearchTiming = void 0;
const ride_constant_1 = require("../app/modules/ride/ride.constant");
const systemConfigHelper_1 = require("./systemConfigHelper");
/**
 * Calculate driver search timing information for a ride
 * Uses the existing expiration configuration from config.driverMatching.rideRequestLifetimeSeconds
 */
const calculateDriverSearchTiming = (ride) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const requestedAt = new Date(ride.requestedAt);
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const rideRequestLifetimeSeconds =
      systemConfig.driverMatching.rideRequestLifetimeSeconds;
    // Calculate elapsed time in seconds
    const elapsedMs = now.getTime() - requestedAt.getTime();
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    // Calculate remaining time
    const remainingSeconds = Math.max(
      0,
      rideRequestLifetimeSeconds - elapsedSeconds,
    );
    // Calculate progress percentage
    const progressPercentage = Math.min(
      100,
      (elapsedSeconds / rideRequestLifetimeSeconds) * 100,
    );
    // Check if driver was found
    const driverFound = !!ride.driverId;
    // Calculate time taken to find driver (if found)
    let driverFoundInSeconds = null;
    if (driverFound && ride.acceptedAt) {
      const acceptedAt = new Date(ride.acceptedAt);
      const driverFoundMs = acceptedAt.getTime() - requestedAt.getTime();
      driverFoundInSeconds = Math.floor(driverFoundMs / 1000);
    }
    // Check if ride is expired
    const isExpired =
      ride.status === ride_constant_1.RIDE_STATUS.EXPIRED ||
      elapsedSeconds >= rideRequestLifetimeSeconds;
    return {
      driverFound,
      driverFoundInSeconds,
      elapsedSeconds,
      remainingSeconds,
      progressPercentage: Math.round(progressPercentage),
      isExpired,
    };
  });
exports.calculateDriverSearchTiming = calculateDriverSearchTiming;
