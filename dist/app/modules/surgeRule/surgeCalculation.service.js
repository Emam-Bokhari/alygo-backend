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
exports.SurgeCalculationService =
  exports.getInterpolatedMultiplier =
  exports.isEventActive =
  exports.isHoliday =
  exports.isPeakHour =
    void 0;
const mongoose_1 = require("mongoose");
const surgeRule_model_1 = require("./surgeRule.model");
const surgeRule_constant_1 = require("./surgeRule.constant");
const status_1 = require("../../../constants/status");
const ride_model_1 = require("../ride/ride.model");
const ride_constant_1 = require("../ride/ride.constant");
const driver_model_1 = require("../driver/driver.model");
const serviceArea_model_1 = require("../serviceArea/serviceArea.model");
const googleRouteService_1 = require("../../../services/googleRouteService");
const logger_1 = require("../../../shared/logger");
const peakHour_model_1 = require("../peakHour/peakHour.model");
const holiday_model_1 = require("../holiday/holiday.model");
const event_model_1 = require("../event/event.model");
const timezoneHelper_1 = require("../../../shared/timezoneHelper");
// Deterministic priority order for Surge Rules (highest to lowest)
const RULE_PRIORITY = [
  surgeRule_constant_1.SURGE_RULE_TYPE.AIRPORT,
  surgeRule_constant_1.SURGE_RULE_TYPE.EVENT,
  surgeRule_constant_1.SURGE_RULE_TYPE.PEAK_HOUR,
  surgeRule_constant_1.SURGE_RULE_TYPE.HOLIDAY,
  surgeRule_constant_1.SURGE_RULE_TYPE.DEFAULT,
];
/**
 * Check if current time falls within any active Peak Hour configuration
 * Uses timezone-aware helper for accurate time comparison
 */
const isPeakHour = (date, peakHours) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!peakHours || peakHours.length === 0) {
      return false;
    }
    for (const peakHour of peakHours) {
      if (
        (0, timezoneHelper_1.isPeakHourActive)(
          peakHour.startTime,
          peakHour.endTime,
          peakHour.timezone,
          peakHour.applicableDays,
        )
      ) {
        return true;
      }
    }
    return false;
  });
exports.isPeakHour = isPeakHour;
/**
 * Check if current date falls within any active Holiday configuration
 * Uses timezone-aware helper for accurate date comparison
 */
const isHoliday = (date, holidays) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!holidays || holidays.length === 0) {
      return false;
    }
    for (const holiday of holidays) {
      if (
        (0, timezoneHelper_1.isHolidayActive)(
          holiday.startDate,
          holiday.endDate,
          holiday.timezone,
        )
      ) {
        return true;
      }
    }
    return false;
  });
exports.isHoliday = isHoliday;
/**
 * Check if current date/time falls within any active Event configuration
 * Supports both city-wide events and location-specific events
 * Uses timezone-aware helper for accurate datetime comparison
 */
const isEventActive = (date, events, serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!events || events.length === 0) {
      return false;
    }
    for (const event of events) {
      // Check if current time is within event time range using timezone helper
      if (
        !(0, timezoneHelper_1.isEventActive)(
          event.startDateTime,
          event.endDateTime,
          event.timezone,
        )
      ) {
        continue;
      }
      // If event has serviceAreaId, check if it matches
      if (event.serviceAreaId) {
        if (
          serviceAreaId &&
          event.serviceAreaId.toString() === serviceAreaId.toString()
        ) {
          return true;
        }
        // If event is service-area specific and doesn't match, skip
        continue;
      }
      // If event is city-wide (no serviceAreaId), it applies
      return true;
    }
    return false;
  });
exports.isEventActive = isEventActive;
/**
 * Calculate active real-time passenger demand in a Service Area
 * Counts only rides where passengers are still waiting for a driver
 * Once a driver accepts a ride, that ride no longer contributes to marketplace demand
 */
const calculateDemand = (serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const demandCount = yield ride_model_1.Ride.countDocuments({
      serviceAreaId: new mongoose_1.Types.ObjectId(serviceAreaId),
      status: {
        $in: [ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER],
      },
    });
    return demandCount;
  });
/**
 * Calculate available driver supply in a Service Area
 * Returns count of eligible online drivers (total and available)
 */
const calculateSupply = (serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const serviceArea = yield serviceArea_model_1.ServiceArea.findOne({
      _id: serviceAreaId,
      status: status_1.STATUS.ACTIVE,
    });
    if (
      !serviceArea ||
      !serviceArea.location ||
      !serviceArea.location.coordinates
    ) {
      logger_1.logger.warn(
        `Active Service Area not found or location coordinates missing: ${serviceAreaId}`,
      );
      return { totalDrivers: 0, availableDrivers: 0 };
    }
    const [centerLng, centerLat] = serviceArea.location.coordinates;
    const radiusKm =
      (_a = serviceArea.coverageRadiusKm) !== null && _a !== void 0 ? _a : 25;
    // Single optimized aggregation pipeline to fetch online, verified drivers in service area
    const onlineDrivers = yield driver_model_1.Driver.aggregate([
      {
        $match: {
          driverAvailabilityStatus: "online",
          taxVerified: true,
          taxVerificationStatus: "verified",
          serviceAreaId: new mongoose_1.Types.ObjectId(serviceAreaId),
        },
      },
      // Join users
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $match: {
          "user.role": "driver",
          "user.status": "active",
          "user.verified": true,
        },
      },
      // Join cars
      {
        $lookup: {
          from: "cars",
          localField: "_id",
          foreignField: "driverId",
          as: "cars",
        },
      },
      {
        $match: {
          "cars.isVerified": true,
        },
      },
      // Join active rides
      {
        $lookup: {
          from: "rides",
          localField: "userId",
          foreignField: "driverId",
          as: "activeRides",
        },
      },
      {
        $addFields: {
          isOnTrip: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$activeRides",
                    as: "ride",
                    cond: {
                      $in: [
                        "$$ride.status",
                        [
                          ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                          ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                          ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                          ride_constant_1.RIDE_STATUS.STARTED,
                        ],
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },
    ]);
    // Filter by actual coverage radius using Google road distance matrix
    const driversInArea = [];
    if (onlineDrivers.length > 0) {
      try {
        const origins = onlineDrivers.map((driver) => ({
          lat: driver.location.coordinates[1],
          lng: driver.location.coordinates[0],
        }));
        const destinations = [{ lat: centerLat, lng: centerLng }];
        const matrix =
          yield googleRouteService_1.GoogleRouteService.calculateDistanceMatrix(
            origins,
            destinations,
          );
        for (let i = 0; i < onlineDrivers.length; i++) {
          const result =
            (_b = matrix[i]) === null || _b === void 0 ? void 0 : _b[0];
          if (result && result.status === "OK") {
            if (result.distanceKm <= radiusKm) {
              driversInArea.push(onlineDrivers[i]);
            }
          }
        }
      } catch (err) {
        logger_1.logger.error(
          `[SurgeCalculationService] Error calculating drivers surge availability via Google: ${err}`,
        );
        throw err;
      }
    }
    const totalDrivers = driversInArea.length;
    const availableDrivers = driversInArea.filter((d) => !d.isOnTrip).length;
    return { totalDrivers, availableDrivers };
  });
/**
 * Deterministically select the applicable Surge Rule based on priorities and conditions
 */
const selectApplicableRule = (rules, serviceAreaType, date, serviceAreaId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const applicableRuleTypes = new Set();
    applicableRuleTypes.add(surgeRule_constant_1.SURGE_RULE_TYPE.DEFAULT);
    if (serviceAreaType === "airport") {
      applicableRuleTypes.add(surgeRule_constant_1.SURGE_RULE_TYPE.AIRPORT);
    }
    // Fetch active configurations from database
    const [activePeakHours, activeHolidays, activeEvents] = yield Promise.all([
      peakHour_model_1.PeakHour.find({ status: status_1.STATUS.ACTIVE }),
      holiday_model_1.Holiday.find({ status: status_1.STATUS.ACTIVE }),
      event_model_1.Event.find({ status: status_1.STATUS.ACTIVE }),
    ]);
    if (yield (0, exports.isEventActive)(date, activeEvents, serviceAreaId)) {
      applicableRuleTypes.add(surgeRule_constant_1.SURGE_RULE_TYPE.EVENT);
    }
    if (yield (0, exports.isPeakHour)(date, activePeakHours)) {
      applicableRuleTypes.add(surgeRule_constant_1.SURGE_RULE_TYPE.PEAK_HOUR);
    }
    if (yield (0, exports.isHoliday)(date, activeHolidays)) {
      applicableRuleTypes.add(surgeRule_constant_1.SURGE_RULE_TYPE.HOLIDAY);
    }
    // Follow priority order: Airport > Event > Peak Hour > Holiday > Default
    for (const ruleType of RULE_PRIORITY) {
      if (applicableRuleTypes.has(ruleType)) {
        const matchedRule = rules.find((r) => r.ruleType === ruleType);
        if (matchedRule) {
          return matchedRule;
        }
      }
    }
    return null;
  });
/**
 * Perform continuous smooth scaling mapping marketplace ratio to multipliers
 * Uses a power function for gradual Uber-style multiplier progression
 */
const getInterpolatedMultiplier = (ratio, minMultiplier, maxMultiplier) => {
  // Lower bound ratio where surge begins (multiplier = 1.0)
  const lowerBoundRatio = 0.8;
  // Upper bound ratio where multiplier reaches max
  const upperBoundRatio = 5.0;
  // Power exponent for smooth scaling (< 1 for gradual increase at low ratios)
  const smoothnessExponent = 0.7;
  // No surge below lower bound
  if (ratio <= lowerBoundRatio) {
    return 1.0;
  }
  // Cap at upper bound
  const clampedRatio = Math.min(ratio, upperBoundRatio);
  // Normalize ratio to [0, 1] range
  const normalizedRatio =
    (clampedRatio - lowerBoundRatio) / (upperBoundRatio - lowerBoundRatio);
  // Apply smooth power function for gradual scaling
  const smoothProgress = Math.pow(normalizedRatio, smoothnessExponent);
  // Calculate multiplier with smooth progression
  const calculatedVal = 1.0 + smoothProgress * (maxMultiplier - 1.0);
  // Ensure bounded by [1.0, maxMultiplier]
  const finalMultiplier = Math.min(Math.max(calculatedVal, 1.0), maxMultiplier);
  return parseFloat(finalMultiplier.toFixed(2));
};
exports.getInterpolatedMultiplier = getInterpolatedMultiplier;
/**
 * Core dynamic surge multiplier calculation method (marketplace-based)
 */
const calculateSurgeMultiplier = (serviceAreaId_1, ...args_1) =>
  __awaiter(
    void 0,
    [serviceAreaId_1, ...args_1],
    void 0,
    function* (serviceAreaId, date = new Date()) {
      // Fetch active service area details
      const serviceArea =
        yield serviceArea_model_1.ServiceArea.findById(serviceAreaId);
      if (!serviceArea || serviceArea.status !== status_1.STATUS.ACTIVE) {
        return 1.0;
      }
      // Determine active demand and supply
      const activeRequests = yield calculateDemand(serviceAreaId);
      const { availableDrivers } = yield calculateSupply(serviceAreaId);
      // Treat zero supply as maximum demand pressure
      let ratio = 5.0;
      if (availableDrivers > 0) {
        ratio = activeRequests / availableDrivers;
      }
      // Retrieve active rules
      const activeRules = yield surgeRule_model_1.SurgeRule.find({
        status: status_1.STATUS.ACTIVE,
      });
      const matchedRule = yield selectApplicableRule(
        activeRules,
        serviceArea.type,
        date,
        serviceAreaId,
      );
      if (!matchedRule) {
        return 1.0;
      }
      const { minMultiplier, maxMultiplier } = matchedRule;
      // Calculate smoothly interpolated multiplier
      return (0, exports.getInterpolatedMultiplier)(
        ratio,
        minMultiplier,
        maxMultiplier,
      );
    },
  );
/**
 * Test surge calculation with detailed breakdown
 */
const testSurgeCalculation = (serviceAreaId_1, ...args_1) =>
  __awaiter(
    void 0,
    [serviceAreaId_1, ...args_1],
    void 0,
    function* (serviceAreaId, date = new Date()) {
      const serviceArea =
        yield serviceArea_model_1.ServiceArea.findById(serviceAreaId);
      if (!serviceArea || serviceArea.status !== status_1.STATUS.ACTIVE) {
        throw new Error("Service area not found or inactive");
      }
      const activeRequests = yield calculateDemand(serviceAreaId);
      const { totalDrivers, availableDrivers } =
        yield calculateSupply(serviceAreaId);
      let ratio = 5.0;
      if (availableDrivers > 0) {
        ratio = activeRequests / availableDrivers;
      }
      const activeRules = yield surgeRule_model_1.SurgeRule.find({
        status: status_1.STATUS.ACTIVE,
      });
      const matchedRule = yield selectApplicableRule(
        activeRules,
        serviceArea.type,
        date,
        serviceAreaId,
      );
      if (!matchedRule) {
        return {
          demand: activeRequests,
          supply: { totalDrivers, availableDrivers },
          ratio,
          activeRuleType: "DEFAULT",
          activeRuleName: "No active rule",
          minMultiplier: 1.0,
          maxMultiplier: 1.0,
          finalMultiplier: 1.0,
        };
      }
      const { minMultiplier, maxMultiplier, ruleType, ruleName } = matchedRule;
      const finalMultiplier = (0, exports.getInterpolatedMultiplier)(
        ratio,
        minMultiplier,
        maxMultiplier,
      );
      return {
        demand: activeRequests,
        supply: { totalDrivers, availableDrivers },
        ratio: parseFloat(ratio.toFixed(2)),
        activeRuleType: ruleType,
        activeRuleName: ruleName,
        minMultiplier,
        maxMultiplier,
        finalMultiplier,
      };
    },
  );
exports.SurgeCalculationService = {
  calculateDemand,
  calculateSupply,
  selectApplicableRule,
  calculateSurgeMultiplier,
  testSurgeCalculation,
};
