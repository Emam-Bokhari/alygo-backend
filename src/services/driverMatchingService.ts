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
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
}: FindEligibleDriversParams) => {
  const searchRadiusMeters = radiusKm * 1000;

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

  // Get ride category for vehicle requirements
  const category = await RideCategory.findById(rideCategoryId);
  if (!category) {
    throw new Error("Ride category not found");
  }

  // Use GeoNear to query drivers within search radius that belong to the correct service area
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
    taxVerified: true,
    taxVerificationStatus: "verified",
    serviceAreaId: new Types.ObjectId(resolvedRideServiceAreaId),
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

    // 2. Verify driver's assigned service area matches the ride's service area
    if (
      driverDoc.serviceAreaId.toString() !==
      resolvedRideServiceAreaId.toString()
    ) {
      logger.info(
        `Driver ${driverDoc.userId} excluded because their service area ${driverDoc.serviceAreaId} does not match ride service area ${resolvedRideServiceAreaId}.`,
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
      isVerified: true,
    });

    if (!car) continue;

    const { vehicleTypes, minimumSeats } = category.vehicleRequirements;
    const isCarTypeMatched = vehicleTypes.some(
      (type) => type.toLowerCase() === car.carType.toLowerCase(),
    );
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
      const activeTier = await Tier.findById(driverDoc.currentTier);
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
      if (!rideServiceArea.location || !rideServiceArea.location.coordinates) {
        logger.warn(
          `Service area ${resolvedRideServiceAreaId} location coordinates missing.`,
        );
        return [];
      }
      const destinations = [
        {
          lat: pickupLocation.coordinates[1],
          lng: pickupLocation.coordinates[0],
        },
        {
          lat: rideServiceArea.location.coordinates[1],
          lng: rideServiceArea.location.coordinates[0],
        },
      ];

      const matrix = await GoogleRouteService.calculateDistanceMatrix(
        origins,
        destinations,
      );

      for (let i = 0; i < candidates.length; i++) {
        const driverDoc = candidates[i];
        const pickupResult = matrix[i]?.[0];
        const serviceAreaCenterResult = matrix[i]?.[1];

        if (
          pickupResult &&
          pickupResult.status === "OK" &&
          serviceAreaCenterResult &&
          serviceAreaCenterResult.status === "OK"
        ) {
          const distanceToPickup = pickupResult.distanceKm;
          const distanceToServiceAreaCenter =
            serviceAreaCenterResult.distanceKm;

          if (
            distanceToServiceAreaCenter >
            (rideServiceArea.coverageRadiusKm || 25)
          ) {
            logger.info(
              `Driver ${driverDoc.userId} excluded: GPS location is outside assigned service area coverage road distance (${distanceToServiceAreaCenter.toFixed(2)} km > ${rideServiceArea.coverageRadiusKm} km).`,
            );
            continue;
          }

          if (distanceToPickup > radiusKm) {
            logger.info(
              `Driver ${driverDoc.userId} excluded: GPS location is outside ride search road distance (${distanceToPickup.toFixed(2)} km > ${radiusKm} km).`,
            );
            continue;
          }

          // Compute Dispatch Score
          const distanceScore = Math.max(0, 100 - distanceToPickup * 10);
          const ratingScore = (driverDoc.averageRating || 0) * 10;
          
          const acceptanceRate = await calculateDriverAcceptanceRate(driverDoc.userId);
          const acceptanceScore = acceptanceRate * 0.5;

          // Tier priority & Priority Dispatch
          let tierPriorityScore = 0;
          const activeTier = await Tier.findById(driverDoc.currentTier);
          if (activeTier) {
            tierPriorityScore += activeTier.level * 15;
            if (activeTier.benefits?.priorityDispatch?.enabled) {
              tierPriorityScore += (activeTier.benefits.priorityDispatch.boostMultiplier || 1.0) * 20;
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
              const vecPF = [filterDest[0] - pickup[0], filterDest[1] - pickup[1]];

              const magPR = Math.sqrt(vecPR[0]**2 + vecPR[1]**2);
              const magPF = Math.sqrt(vecPF[0]**2 + vecPF[1]**2);

              if (magPR > 0 && magPF > 0) {
                const dotProduct = vecPR[0] * vecPF[0] + vecPR[1] * vecPF[1];
                const cosSim = dotProduct / (magPR * magPF);

                if (cosSim > 0) {
                  const distDestToFilter = calculateDistance(rideDest[1], rideDest[0], filterDest[1], filterDest[0]);
                  const distPickupToFilter = calculateDistance(pickup[1], pickup[0], filterDest[1], filterDest[0]);

                  if (distDestToFilter < distPickupToFilter) {
                    destMatchScore = cosSim * 50;
                    if (distDestToFilter <= filter.radiusKm) {
                      destMatchScore += (1 - distDestToFilter / filter.radiusKm) * 50;
                    }
                  }
                }
              }
            }
          }

          // Airport Queue Priority
          let airportPriorityScore = 0;
          if (rideServiceArea.type === "airport" && activeTier?.benefits?.airportQueuePriority?.enabled) {
            airportPriorityScore = 50;
          }

          const dispatchScore = distanceScore + ratingScore + acceptanceScore + tierPriorityScore + destMatchScore + airportPriorityScore;

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
    eligibleDrivers.sort((a, b) => (b.dispatchScore || 0) - (a.dispatchScore || 0));
  }

  return eligibleDrivers;
};
