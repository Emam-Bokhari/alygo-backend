import { Types } from "mongoose";
import { Driver } from "../app/modules/driver/driver.model";
import { User } from "../app/modules/user/user.model";
import { Car } from "../app/modules/car/car.model";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";
import { ServiceAreaServices } from "../app/modules/serviceArea/serviceArea.service";
import { RideCategory } from "../app/modules/rideCategory/rideCategory.model";
import { DriverDutyPolicy } from "../app/modules/driverDutyPolicy/driverDutyPolicy.model";
import { Ride } from "../app/modules/ride/ride.model";
import { logger } from "../shared/logger";
import { RIDE_STATUS, RIDE_TYPE } from "../app/modules/ride/ride.constant";
import { getCurrentTimeInTimezone } from "../shared/timezoneHelper";
import { GoogleRouteService } from "./googleRouteService";
import { Tier } from "../app/modules/tier/tier.model";
import { DestinationFilter } from "../app/modules/tier/destinationFilter.model";
import { calculateDriverAcceptanceRate } from "../app/modules/tier/points.service";

interface FindEligibleDriversParams {
  pickupLocation: { type: string; coordinates: [number, number] };
  radiusKm: number;
  rideCategoryId: string;
  serviceCategoryId?: string;
  excludeDriverIds?: string[];
  rideServiceAreaId?: string;
  rideDestination?: { type: string; coordinates: [number, number] };
  rideType?: string;
  scheduledAt?: Date | string;
}

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Find eligible drivers within a specific radius
 * This function extracts the driver matching logic from the ride service
 */
export const findEligibleDriversInRadius = async ({
  pickupLocation,
  radiusKm,
  rideCategoryId,
  serviceCategoryId,
  excludeDriverIds = [],
  rideServiceAreaId,
  rideDestination,
  rideType,
  scheduledAt,
}: FindEligibleDriversParams) => {
  const searchRadiusMeters = radiusKm * 1000;

  const tierCache = new Map<string, any>();
  const getTier = async (tierId: string | Types.ObjectId | undefined) => {
    if (!tierId) {
      const defaultTierKey = "level_1_default";
      if (!tierCache.has(defaultTierKey)) {
        const defaultTier = await Tier.findOne({ level: 1 });
        tierCache.set(defaultTierKey, defaultTier);
      }
      return tierCache.get(defaultTierKey);
    }
    const key = tierId.toString();
    if (!tierCache.has(key)) {
      const tierDoc = await Tier.findById(tierId);
      tierCache.set(key, tierDoc);
    }
    return tierCache.get(key);
  };

  // Resolve the ride's Service Area ID
  let resolvedRideServiceAreaId = rideServiceAreaId;
  if (!resolvedRideServiceAreaId) {
    const resolvedArea = await ServiceAreaServices.findServiceAreaByCoordinates(
      pickupLocation.coordinates[0],
      pickupLocation.coordinates[1],
    );
    resolvedRideServiceAreaId = resolvedArea?._id?.toString();
  }

  if (!resolvedRideServiceAreaId) {
    logger.warn(
      `Could not determine service area for pickup location coordinates: ${pickupLocation.coordinates}`,
    );
    return [];
  }

  // Fetch the ride's service area to make sure it's active
  const rideServiceArea = await ServiceArea.findOne({
    _id: resolvedRideServiceAreaId,
    status: "active",
  });
  if (!rideServiceArea) {
    logger.warn(
      `Ride service area ${resolvedRideServiceAreaId} is not found or inactive`,
    );
    return [];
  }

  // Find all active ancestors of the ride service area (for hierarchical matching)
  const activeServiceAreaIds: Types.ObjectId[] = [rideServiceArea._id];
  const visited = new Set<string>([rideServiceArea._id.toString()]);
  let currentId: Types.ObjectId | null = null;

  if (rideServiceArea.cityId) {
    currentId = rideServiceArea.cityId;
  } else if (rideServiceArea.stateId) {
    currentId = rideServiceArea.stateId;
  } else if (rideServiceArea.countryId) {
    currentId = rideServiceArea.countryId;
  }

  while (currentId && !visited.has(currentId.toString())) {
    const currentIdStr = currentId.toString();
    visited.add(currentIdStr);

    const area = await ServiceArea.findOne({
      _id: currentId,
      status: "active",
    });
    if (!area) break;

    activeServiceAreaIds.push(area._id);

    // Follow the hierarchy up
    if (area.cityId) {
      currentId = area.cityId;
    } else if (area.stateId) {
      currentId = area.stateId;
    } else if (area.countryId) {
      currentId = area.countryId;
    } else {
      currentId = null;
    }
  }

  // Get ride category for vehicle requirements
  const category = await RideCategory.findById(rideCategoryId);
  if (!category) {
    throw new Error("Ride category not found");
  }

  // Use GeoNear to query drivers within search radius that belong to any covering service area (itself or ancestors)
  const nearbyDrivers = await Driver.find({
    location: {
      $nearSphere: {
        $geometry: {
          type: "Point",
          coordinates: [
            pickupLocation.coordinates[0],
            pickupLocation.coordinates[1],
          ],
        },
        $maxDistance: searchRadiusMeters,
      },
    },
    driverAvailabilityStatus: "online",
    approvalStatus: "approved",
    "suspension.isSuspended": { $ne: true },
    serviceAreaId: { $in: activeServiceAreaIds },
  });

  const eligibleDrivers: any[] = [];
  const candidates: any[] = [];

  for (const driverDoc of nearbyDrivers) {
    // Skip if driver is in exclusion list (already notified)
    if (excludeDriverIds.includes(driverDoc.userId.toString())) {
      continue;
    }

    // 1. Verify driver belongs to an assigned service area
    if (!driverDoc.serviceAreaId) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because they do not belong to any service area.`,
      );
      continue;
    }

    // 2. Verify driver's assigned service area matches or covers the ride's service area
    const isMatchingServiceArea = activeServiceAreaIds.some(
      (id) => id.toString() === driverDoc.serviceAreaId!.toString(),
    );
    if (!isMatchingServiceArea) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because their service area ${driverDoc.serviceAreaId} does not cover ride service area ${resolvedRideServiceAreaId}.`,
      );
      continue;
    }

    // 3. Verify driver's assigned service area is active
    const driverServiceArea = await ServiceArea.findOne({
      _id: driverDoc.serviceAreaId,
      status: "active",
    });
    if (!driverServiceArea) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because their assigned service area ${driverDoc.serviceAreaId} is not found or inactive.`,
      );
      continue;
    }

    // 4. Verify driver's current GPS location is inside their assigned Service Area coverage
    if (!driverDoc.location || !driverDoc.location.coordinates) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because they have no location coordinates.`,
      );
      continue;
    }
    const [driverLng, driverLat] = driverDoc.location.coordinates;
    if (
      !driverServiceArea.location ||
      !driverServiceArea.location.coordinates ||
      driverServiceArea.coverageRadiusKm === undefined
    ) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because their service area ${driverServiceArea._id} has invalid location or coverage radius.`,
      );
      continue;
    }

    // Geofence check: Verify driver's current GPS location is inside their assigned Service Area coverage using straight-line distance
    const straightLineDistanceToServiceArea = calculateDistance(
      driverLat,
      driverLng,
      driverServiceArea.location.coordinates[1],
      driverServiceArea.location.coordinates[0],
    );

    if (
      straightLineDistanceToServiceArea >
      (driverServiceArea.coverageRadiusKm || 25)
    ) {
      logger.info(
        `Driver ${driverDoc.userId} excluded: GPS location is outside assigned service area coverage straight-line distance (${straightLineDistanceToServiceArea.toFixed(2)} km > ${driverServiceArea.coverageRadiusKm} km).`,
      );
      continue;
    }

    // Distance checks will be performed in batch via Google Distance Matrix after the loop

    // 6. Verify driver is online, available, and eligible
    if (driverDoc.driverAvailabilityStatus !== "online") {
      logger.info(
        `Driver ${driverDoc.userId} excluded because status is ${driverDoc.driverAvailabilityStatus}, not online.`,
      );
      continue;
    }

    // 7. Check driver availability based on duty limits
    if (!driverDoc.availability?.canReceiveRide) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because availability.canReceiveRide is false. Reason: ${driverDoc.availability.blockedReason}`,
      );
      continue;
    }

    // Verify driver is not currently assigned to another active ride
    const now = new Date();
    const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);

    const activeRideForDriver = await Ride.findOne({
      driverId: driverDoc.userId,
      $or: [
        {
          rideType: { $ne: RIDE_TYPE.SCHEDULED },
          status: {
            $in: [
              RIDE_STATUS.DRIVER_ACCEPTED,
              RIDE_STATUS.DRIVER_ON_THE_WAY,
              RIDE_STATUS.DRIVER_ARRIVED,
              RIDE_STATUS.STARTED,
            ],
          },
        },
        {
          rideType: RIDE_TYPE.SCHEDULED,
          status: {
            $in: [
              RIDE_STATUS.DRIVER_ON_THE_WAY,
              RIDE_STATUS.DRIVER_ARRIVED,
              RIDE_STATUS.STARTED,
            ],
          },
        },
        {
          rideType: RIDE_TYPE.SCHEDULED,
          status: RIDE_STATUS.DRIVER_ACCEPTED,
          scheduledAt: { $lte: imminentWindowEnd },
        },
      ],
    });
    if (activeRideForDriver) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because they are already on another active ride ${activeRideForDriver._id}.`,
      );
      continue;
    }

    // A. Check user status
    const driverUser = await User.findOne({
      _id: driverDoc.userId,
      role: "driver",
      status: "active",
      verified: true,
    });
    if (!driverUser) continue;

    // B. Check verified car
    const car = await Car.findOne({
      driverId: driverDoc._id,
    });

    if (!car) continue;

    const vehicleType =
      category.vehicleRequirements.vehicleType ||
      (category.vehicleRequirements as any).vehicleTypes?.[0];
    const minimumSeats = category.vehicleRequirements.minimumSeats;
    const isCarTypeMatched =
      vehicleType &&
      car.carType &&
      vehicleType.toLowerCase() === car.carType.toLowerCase();
    const isSeatsSufficient = car.seatNumber >= minimumSeats;

    if (!isCarTypeMatched || !isSeatsSufficient) continue;

    // Check Premium Ride Access
    const isPremiumCategory = (catName: string): boolean => {
      const name = catName.toLowerCase();
      return (
        name.includes("premium") ||
        name.includes("luxury") ||
        name.includes("vip") ||
        name.includes("elite") ||
        name.includes("business")
      );
    };

    if (isPremiumCategory(category.name)) {
      const activeTier = await getTier(driverDoc.currentTier);
      if (!activeTier || !activeTier.benefits?.premiumRideAccess?.enabled) {
        logger.info(
          `Driver ${driverDoc.userId} excluded: does not have premium ride access.`,
        );
        continue;
      }
      const allowedCategories =
        activeTier.benefits.premiumRideAccess.allowedCategories || [];
      const isAllowed = allowedCategories.some(
        (catIdOrName: string) =>
          catIdOrName === category._id.toString() ||
          catIdOrName.toLowerCase() === category.name.toLowerCase(),
      );
      if (!isAllowed) {
        logger.info(
          `Driver ${driverDoc.userId} excluded: category ${category.name} is not in allowed premium categories for tier ${activeTier.name}.`,
        );
        continue;
      }
    }

    // Check Scheduled Reservation Access
    if (rideType === RIDE_TYPE.SCHEDULED) {
      const activeTier = await getTier(driverDoc.currentTier);
      if (!activeTier || !activeTier.benefits?.reservationAccess?.enabled) {
        logger.info(
          `Driver ${driverDoc.userId} excluded: current tier does not support accepting scheduled reservations.`,
        );
        continue;
      }
      const maxAdvanceHours =
        activeTier.benefits.reservationAccess.maxAdvanceHours || 0;
      if (maxAdvanceHours > 0 && scheduledAt) {
        const scheduledTime = new Date(scheduledAt).getTime();
        const advanceHours = (scheduledTime - Date.now()) / (1000 * 60 * 60);
        if (advanceHours > maxAdvanceHours) {
          logger.info(
            `Driver ${driverDoc.userId} excluded: tier only supports reservation bookings up to ${maxAdvanceHours} hours in advance.`,
          );
          continue;
        }
      }
    }

    // C. Check driver duty policy limits based on driver's current location
    let policy = null;
    let driverLocServiceArea = null;
    if (driverDoc.location && driverDoc.location.coordinates) {
      const [driverLongitude, driverLatitude] = driverDoc.location.coordinates;

      // Find service area for driver's current location
      driverLocServiceArea =
        await ServiceAreaServices.findServiceAreaByCoordinates(
          driverLongitude,
          driverLatitude,
        );

      if (driverLocServiceArea) {
        // Use coordinate-based matching for policy lookup
        const query: any = { status: "active" };

        // For backward compatibility, still check type-based IDs if they exist
        if (driverLocServiceArea.type === "city" && driverLocServiceArea._id) {
          query.cityId = driverLocServiceArea._id;
        } else if (
          driverLocServiceArea.type === "zone" &&
          driverLocServiceArea._id
        ) {
          query.zoneId = driverLocServiceArea._id;
        } else if (
          driverLocServiceArea.type === "airport" &&
          driverLocServiceArea._id
        ) {
          query.airportId = driverLocServiceArea._id;
        } else if (
          driverLocServiceArea.type === "state" &&
          driverLocServiceArea._id
        ) {
          query.stateId = driverLocServiceArea._id;
        } else if (
          driverLocServiceArea.type === "country" &&
          driverLocServiceArea._id
        ) {
          query.countryId = driverLocServiceArea._id;
        }

        policy = await DriverDutyPolicy.findOne(query);
      }
    }

    if (policy) {
      // Get timezone from service area (default to UTC if not set)
      const timezone = driverLocServiceArea?.timezone || "UTC";

      // Get start of day in the driver's timezone
      const startOfDay = getCurrentTimeInTimezone(timezone)
        .startOf("day")
        .toUTC()
        .toJSDate();

      // Sum today's driving time for the driver
      const completedRides = await Ride.find({
        driverId: driverDoc.userId,
        status: "completed",
        completedAt: { $gte: startOfDay },
      });

      let totalDrivingHoursToday = 0;
      for (const ride of completedRides) {
        if (ride.startedAt && ride.completedAt) {
          const durationHrs =
            (ride.completedAt.getTime() - ride.startedAt.getTime()) /
            (1000 * 60 * 60);
          totalDrivingHoursToday += durationHrs;
        }
      }

      if (totalDrivingHoursToday >= policy.maxDrivingHoursPerDay) {
        logger.info(
          `Driver ${driverDoc.userId} excluded due to daily driving hours policy.`,
        );
        continue;
      }
    }

    candidates.push(driverDoc);
  }

  if (candidates.length > 0) {
    try {
      const origins = candidates.map((driver) => ({
        lat: driver.location.coordinates[1],
        lng: driver.location.coordinates[0],
      }));
      const destinations = [
        {
          lat: pickupLocation.coordinates[1],
          lng: pickupLocation.coordinates[0],
        },
      ];

      const matrix = await GoogleRouteService.calculateDistanceMatrix(
        origins,
        destinations,
      );

      for (let i = 0; i < candidates.length; i++) {
        const driverDoc = candidates[i];
        const pickupResult = matrix[i]?.[0];

        if (pickupResult && pickupResult.status === "OK") {
          const distanceToPickup = pickupResult.distanceKm;

          if (distanceToPickup > radiusKm) {
            logger.info(
              `Driver ${driverDoc.userId} excluded: GPS location is outside ride search road distance (${distanceToPickup.toFixed(2)} km > ${radiusKm} km).`,
            );
            continue;
          }

          // Compute Dispatch Score
          const distanceScore = Math.max(0, 100 - distanceToPickup * 10);
          const ratingScore = (driverDoc.averageRating || 0) * 10;

          const acceptanceRate = await calculateDriverAcceptanceRate(
            driverDoc.userId,
          );
          const acceptanceScore = acceptanceRate * 0.5;

          // Tier priority & Priority Dispatch
          let tierPriorityScore = 0;
          const activeTier = await getTier(driverDoc.currentTier);
          if (activeTier) {
            tierPriorityScore += activeTier.level * 15;
            if (activeTier.benefits?.priorityDispatch?.enabled) {
              tierPriorityScore +=
                (activeTier.benefits.priorityDispatch.boostMultiplier || 1.0) *
                20;
            }
          }

          // Destination Filter Score
          let destMatchScore = 0;
          if (rideDestination && rideDestination.coordinates) {
            const filter = await DestinationFilter.findOne({
              driverId: driverDoc.userId,
              status: "ACTIVE",
            });
            if (filter) {
              const pickup = pickupLocation.coordinates;
              const rideDest = rideDestination.coordinates;
              const filterDest = filter.coordinates;

              const vecPR = [rideDest[0] - pickup[0], rideDest[1] - pickup[1]];
              const vecPF = [
                filterDest[0] - pickup[0],
                filterDest[1] - pickup[1],
              ];

              const magPR = Math.sqrt(vecPR[0] ** 2 + vecPR[1] ** 2);
              const magPF = Math.sqrt(vecPF[0] ** 2 + vecPF[1] ** 2);

              if (magPR > 0 && magPF > 0) {
                const dotProduct = vecPR[0] * vecPF[0] + vecPR[1] * vecPF[1];
                const cosSim = dotProduct / (magPR * magPF);

                if (cosSim > 0) {
                  const distDestToFilter = calculateDistance(
                    rideDest[1],
                    rideDest[0],
                    filterDest[1],
                    filterDest[0],
                  );
                  const distPickupToFilter = calculateDistance(
                    pickup[1],
                    pickup[0],
                    filterDest[1],
                    filterDest[0],
                  );

                  if (distDestToFilter < distPickupToFilter) {
                    destMatchScore = cosSim * 50;
                    if (distDestToFilter <= filter.radiusKm) {
                      destMatchScore +=
                        (1 - distDestToFilter / filter.radiusKm) * 50;
                    }
                  }
                }
              }
            }
          }

          // Airport Queue Priority
          let airportPriorityScore = 0;
          if (
            rideServiceArea.type === "airport" &&
            activeTier?.benefits?.airportQueuePriority?.enabled
          ) {
            airportPriorityScore = 50;
          }

          const dispatchScore =
            distanceScore +
            ratingScore +
            acceptanceScore +
            tierPriorityScore +
            destMatchScore +
            airportPriorityScore;

          eligibleDrivers.push({
            driverId: driverDoc.userId,
            distance: distanceToPickup,
            dispatchScore,
          });
        }
      }
    } catch (err) {
      logger.error(
        `[DriverMatching] Error calculating distance matrix for matching: ${err}`,
      );
      throw err;
    }

    // Sort eligible drivers by dispatchScore descending (highest score first)
    eligibleDrivers.sort(
      (a, b) => (b.dispatchScore || 0) - (a.dispatchScore || 0),
    );
  }

  return eligibleDrivers;
};
