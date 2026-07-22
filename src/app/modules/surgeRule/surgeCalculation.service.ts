import { Types } from "mongoose";
import { SurgeRule } from "./surgeRule.model";
import { ISurgeRule } from "./surgeRule.interface";
import { SURGE_RULE_TYPE } from "./surgeRule.constant";
import { STATUS } from "../../../constants/status";
import { Ride } from "../ride/ride.model";
import { RIDE_STATUS } from "../ride/ride.constant";
import { Driver } from "../driver/driver.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { ServiceAreaServices } from "../serviceArea/serviceArea.service";
import { GoogleRouteService } from "../../../services/googleRouteService";
import { logger } from "../../../shared/logger";
import { PeakHour } from "../peakHour/peakHour.model";
import { Holiday } from "../holiday/holiday.model";
import { Event } from "../event/event.model";
import { IPeakHour } from "../peakHour/peakHour.interface";
import { IHoliday } from "../holiday/holiday.interface";
import { IEvent } from "../event/event.interface";
import {
  isPeakHourActive,
  isHolidayActive,
  isEventActive as isEventTimeActive,
} from "../../../shared/timezoneHelper";

// Deterministic priority order for Surge Rules (highest to lowest)
const RULE_PRIORITY = [
  SURGE_RULE_TYPE.AIRPORT,
  SURGE_RULE_TYPE.EVENT,
  SURGE_RULE_TYPE.PEAK_HOUR,
  SURGE_RULE_TYPE.HOLIDAY,
  SURGE_RULE_TYPE.DEFAULT,
];

interface ControlPoint {
  ratio: number;
  val: number;
}

/**
 * Check if current time falls within any active Peak Hour configuration
 * Uses timezone-aware helper for accurate time comparison
 */
export const isPeakHour = async (
  date: Date,
  peakHours: IPeakHour[],
): Promise<boolean> => {
  if (!peakHours || peakHours.length === 0) {
    return false;
  }

  for (const peakHour of peakHours) {
    if (
      isPeakHourActive(
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
};

/**
 * Check if current date falls within any active Holiday configuration
 * Uses timezone-aware helper for accurate date comparison
 */
export const isHoliday = async (
  date: Date,
  holidays: IHoliday[],
): Promise<boolean> => {
  if (!holidays || holidays.length === 0) {
    return false;
  }

  for (const holiday of holidays) {
    if (isHolidayActive(holiday.startDate, holiday.endDate, holiday.timezone)) {
      return true;
    }
  }

  return false;
};

/**
 * Check if current date/time falls within any active Event configuration
 * Supports both city-wide events and location-specific events
 * Uses timezone-aware helper for accurate datetime comparison
 */
export const isEventActive = async (
  date: Date,
  events: IEvent[],
  serviceAreaId?: string,
): Promise<boolean> => {
  if (!events || events.length === 0) {
    return false;
  }

  for (const event of events) {
    // Check if current time is within event time range using timezone helper
    if (
      !isEventTimeActive(event.startDateTime, event.endDateTime, event.timezone)
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
};

/**
 * Calculate active real-time passenger demand in a Service Area
 * Counts only rides where passengers are still waiting for a driver
 * Once a driver accepts a ride, that ride no longer contributes to marketplace demand
 */
const calculateDemand = async (serviceAreaId: string): Promise<number> => {
  const demandCount = await Ride.countDocuments({
    serviceAreaId: new Types.ObjectId(serviceAreaId),
    status: {
      $in: [RIDE_STATUS.SEARCHING_DRIVER],
    },
  });
  return demandCount;
};

/**
 * Calculate available driver supply in a Service Area
 * Returns count of eligible online drivers (total and available)
 */
const calculateSupply = async (
  serviceAreaId: string,
): Promise<{ totalDrivers: number; availableDrivers: number }> => {
  const serviceArea = await ServiceArea.findOne({
    _id: serviceAreaId,
    status: STATUS.ACTIVE,
  });

  if (
    !serviceArea ||
    !serviceArea.location ||
    !serviceArea.location.coordinates
  ) {
    logger.warn(
      `Active Service Area not found or location coordinates missing: ${serviceAreaId}`,
    );
    return { totalDrivers: 0, availableDrivers: 0 };
  }

  const [centerLng, centerLat] = serviceArea.location.coordinates;
  const radiusKm = serviceArea.coverageRadiusKm ?? 25;

  // Single optimized aggregation pipeline to fetch online, verified drivers in service area
  const onlineDrivers = await Driver.aggregate([
    {
      $match: {
        driverAvailabilityStatus: "online",
        taxVerified: true,
        taxVerificationStatus: "verified",
        serviceAreaId: new Types.ObjectId(serviceAreaId),
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
                        RIDE_STATUS.DRIVER_ACCEPTED,
                        RIDE_STATUS.DRIVER_ON_THE_WAY,
                        RIDE_STATUS.DRIVER_ARRIVED,
                        RIDE_STATUS.STARTED,
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

      const matrix = await GoogleRouteService.calculateDistanceMatrix(
        origins,
        destinations,
      );

      for (let i = 0; i < onlineDrivers.length; i++) {
        const result = matrix[i]?.[0];
        if (result && result.status === "OK") {
          if (result.distanceKm <= radiusKm) {
            driversInArea.push(onlineDrivers[i]);
          }
        }
      }
    } catch (err) {
      logger.error(
        `[SurgeCalculationService] Error calculating drivers surge availability via Google: ${err}`,
      );
      throw err;
    }
  }

  const totalDrivers = driversInArea.length;
  const availableDrivers = driversInArea.filter((d) => !d.isOnTrip).length;

  return { totalDrivers, availableDrivers };
};

/**
 * Deterministically select the applicable Surge Rule based on priorities and conditions
 */
const selectApplicableRule = async (
  rules: ISurgeRule[],
  serviceAreaType: string | undefined,
  date: Date,
  serviceAreaId?: string,
): Promise<ISurgeRule | null> => {
  const applicableRuleTypes = new Set<SURGE_RULE_TYPE>();
  applicableRuleTypes.add(SURGE_RULE_TYPE.DEFAULT);

  if (serviceAreaType === "airport") {
    applicableRuleTypes.add(SURGE_RULE_TYPE.AIRPORT);
  }

  // Fetch active configurations from database
  const [activePeakHours, activeHolidays, activeEvents] = await Promise.all([
    PeakHour.find({ status: STATUS.ACTIVE }),
    Holiday.find({ status: STATUS.ACTIVE }),
    Event.find({ status: STATUS.ACTIVE }),
  ]);

  if (await isEventActive(date, activeEvents, serviceAreaId)) {
    applicableRuleTypes.add(SURGE_RULE_TYPE.EVENT);
  }
  if (await isPeakHour(date, activePeakHours)) {
    applicableRuleTypes.add(SURGE_RULE_TYPE.PEAK_HOUR);
  }
  if (await isHoliday(date, activeHolidays)) {
    applicableRuleTypes.add(SURGE_RULE_TYPE.HOLIDAY);
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
};

/**
 * Perform continuous smooth scaling mapping marketplace ratio to multipliers
 * Uses a power function for gradual Uber-style multiplier progression
 */
export const getInterpolatedMultiplier = (
  ratio: number,
  minMultiplier: number,
  maxMultiplier: number,
): number => {
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

/**
 * Core dynamic surge multiplier calculation method (marketplace-based)
 */
const calculateSurgeMultiplier = async (
  serviceAreaId: string,
  date: Date = new Date(),
): Promise<number> => {
  // Fetch active service area details
  const serviceArea = await ServiceArea.findById(serviceAreaId);
  if (!serviceArea || serviceArea.status !== STATUS.ACTIVE) {
    return 1.0;
  }

  // Determine active demand and supply
  const activeRequests = await calculateDemand(serviceAreaId);
  const { availableDrivers } = await calculateSupply(serviceAreaId);

  // Treat zero supply as maximum demand pressure
  let ratio = 5.0;
  if (availableDrivers > 0) {
    ratio = activeRequests / availableDrivers;
  }

  // Retrieve active rules
  const activeRules = await SurgeRule.find({ status: STATUS.ACTIVE });
  const matchedRule = await selectApplicableRule(
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
  return getInterpolatedMultiplier(ratio, minMultiplier, maxMultiplier);
};

/**
 * Test surge calculation with detailed breakdown
 */
const testSurgeCalculation = async (
  serviceAreaId: string,
  date: Date = new Date(),
): Promise<{
  demand: number;
  supply: { totalDrivers: number; availableDrivers: number };
  ratio: number;
  activeRuleType: string | null;
  activeRuleName: string | null;
  minMultiplier: number;
  maxMultiplier: number;
  finalMultiplier: number;
}> => {
  const serviceArea = await ServiceArea.findById(serviceAreaId);
  if (!serviceArea || serviceArea.status !== STATUS.ACTIVE) {
    throw new Error("Service area not found or inactive");
  }

  const activeRequests = await calculateDemand(serviceAreaId);
  const { totalDrivers, availableDrivers } =
    await calculateSupply(serviceAreaId);

  let ratio = 5.0;
  if (availableDrivers > 0) {
    ratio = activeRequests / availableDrivers;
  }

  const activeRules = await SurgeRule.find({ status: STATUS.ACTIVE });
  const matchedRule = await selectApplicableRule(
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
  const finalMultiplier = getInterpolatedMultiplier(
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
};

export const SurgeCalculationService = {
  calculateDemand,
  calculateSupply,
  selectApplicableRule,
  calculateSurgeMultiplier,
  testSurgeCalculation,
};
