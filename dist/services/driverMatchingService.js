"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findEligibleDriversInRadius = void 0;
const mongoose_1 = require("mongoose");
const driver_model_1 = require("../app/modules/driver/driver.model");
const user_model_1 = require("../app/modules/user/user.model");
const car_model_1 = require("../app/modules/car/car.model");
const serviceArea_model_1 = require("../app/modules/serviceArea/serviceArea.model");
const serviceArea_service_1 = require("../app/modules/serviceArea/serviceArea.service");
const rideCategory_model_1 = require("../app/modules/rideCategory/rideCategory.model");
const driverDutyPolicy_model_1 = require("../app/modules/driverDutyPolicy/driverDutyPolicy.model");
const ride_model_1 = require("../app/modules/ride/ride.model");
const logger_1 = require("../shared/logger");
const ride_constant_1 = require("../app/modules/ride/ride.constant");
const timezoneHelper_1 = require("../shared/timezoneHelper");
const googleRouteService_1 = require("./googleRouteService");
const tier_model_1 = require("../app/modules/tier/tier.model");
const destinationFilter_model_1 = require("../app/modules/tier/destinationFilter.model");
const points_service_1 = require("../app/modules/tier/points.service");
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
/**
 * Find eligible drivers within a specific radius
 * This function extracts the driver matching logic from the ride service
 */
const findEligibleDriversInRadius = (_a) => __awaiter(void 0, [_a], void 0, function* ({ pickupLocation, radiusKm, rideCategoryId, serviceCategoryId, excludeDriverIds = [], rideServiceAreaId, rideDestination, rideType, scheduledAt, }) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const searchRadiusMeters = radiusKm * 1000;
    const tierCache = new Map();
    const getTier = (tierId) => __awaiter(void 0, void 0, void 0, function* () {
        if (!tierId)
            return null;
        const key = tierId.toString();
        if (!tierCache.has(key)) {
            const tierDoc = yield tier_model_1.Tier.findById(tierId);
            tierCache.set(key, tierDoc);
        }
        return tierCache.get(key);
    });
    // Resolve the ride's Service Area ID
    let resolvedRideServiceAreaId = rideServiceAreaId;
    if (!resolvedRideServiceAreaId) {
        const resolvedArea = yield serviceArea_service_1.ServiceAreaServices.findServiceAreaByCoordinates(pickupLocation.coordinates[0], pickupLocation.coordinates[1]);
        resolvedRideServiceAreaId = (_b = resolvedArea === null || resolvedArea === void 0 ? void 0 : resolvedArea._id) === null || _b === void 0 ? void 0 : _b.toString();
    }
    if (!resolvedRideServiceAreaId) {
        logger_1.logger.warn(`Could not determine service area for pickup location coordinates: ${pickupLocation.coordinates}`);
        return [];
    }
    // Fetch the ride's service area to make sure it's active
    const rideServiceArea = yield serviceArea_model_1.ServiceArea.findOne({
        _id: resolvedRideServiceAreaId,
        status: "active",
    });
    if (!rideServiceArea) {
        logger_1.logger.warn(`Ride service area ${resolvedRideServiceAreaId} is not found or inactive`);
        return [];
    }
    // Get ride category for vehicle requirements
    const category = yield rideCategory_model_1.RideCategory.findById(rideCategoryId);
    if (!category) {
        throw new Error("Ride category not found");
    }
    // Use GeoNear to query drivers within search radius that belong to the correct service area
    const nearbyDrivers = yield driver_model_1.Driver.find({
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
        serviceAreaId: new mongoose_1.Types.ObjectId(resolvedRideServiceAreaId),
    });
    const eligibleDrivers = [];
    const candidates = [];
    for (const driverDoc of nearbyDrivers) {
        // Skip if driver is in exclusion list (already notified)
        if (excludeDriverIds.includes(driverDoc.userId.toString())) {
            continue;
        }
        // 1. Verify driver belongs to an assigned service area
        if (!driverDoc.serviceAreaId) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because they do not belong to any service area.`);
            continue;
        }
        // 2. Verify driver's assigned service area matches the ride's service area
        if (driverDoc.serviceAreaId.toString() !==
            resolvedRideServiceAreaId.toString()) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because their service area ${driverDoc.serviceAreaId} does not match ride service area ${resolvedRideServiceAreaId}.`);
            continue;
        }
        // 3. Verify driver's assigned service area is active
        const driverServiceArea = yield serviceArea_model_1.ServiceArea.findOne({
            _id: driverDoc.serviceAreaId,
            status: "active",
        });
        if (!driverServiceArea) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because their assigned service area ${driverDoc.serviceAreaId} is not found or inactive.`);
            continue;
        }
        // 4. Verify driver's current GPS location is inside their assigned Service Area coverage
        if (!driverDoc.location || !driverDoc.location.coordinates) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because they have no location coordinates.`);
            continue;
        }
        const [driverLng, driverLat] = driverDoc.location.coordinates;
        if (!driverServiceArea.location ||
            !driverServiceArea.location.coordinates ||
            driverServiceArea.coverageRadiusKm === undefined) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because their service area ${driverServiceArea._id} has invalid location or coverage radius.`);
            continue;
        }
        // Distance checks will be performed in batch via Google Distance Matrix after the loop
        // 6. Verify driver is online, available, and eligible
        if (driverDoc.driverAvailabilityStatus !== "online") {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because status is ${driverDoc.driverAvailabilityStatus}, not online.`);
            continue;
        }
        // 7. Check driver availability based on duty limits
        if (!((_c = driverDoc.availability) === null || _c === void 0 ? void 0 : _c.canReceiveRide)) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because availability.canReceiveRide is false. Reason: ${driverDoc.availability.blockedReason}`);
            continue;
        }
        // Verify driver is not currently assigned to another active ride
        const now = new Date();
        const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
        const activeRideForDriver = yield ride_model_1.Ride.findOne({
            driverId: driverDoc.userId,
            $or: [
                {
                    rideType: { $ne: ride_constant_1.RIDE_TYPE.SCHEDULED },
                    status: {
                        $in: [
                            ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                            ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                            ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                            ride_constant_1.RIDE_STATUS.STARTED,
                        ],
                    },
                },
                {
                    rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                    status: {
                        $in: [
                            ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                            ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                            ride_constant_1.RIDE_STATUS.STARTED,
                        ],
                    },
                },
                {
                    rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                    status: ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                    scheduledAt: { $lte: imminentWindowEnd },
                },
            ],
        });
        if (activeRideForDriver) {
            logger_1.logger.info(`Driver ${driverDoc.userId} excluded because they are already on another active ride ${activeRideForDriver._id}.`);
            continue;
        }
        // A. Check user status
        const driverUser = yield user_model_1.User.findOne({
            _id: driverDoc.userId,
            role: "driver",
            status: "active",
            verified: true,
        });
        if (!driverUser)
            continue;
        // B. Check verified car
        const car = yield car_model_1.Car.findOne({
            driverId: driverDoc._id,
            isVerified: true,
        });
        if (!car)
            continue;
        const { vehicleTypes, minimumSeats } = category.vehicleRequirements;
        const isCarTypeMatched = vehicleTypes.some((type) => type.toLowerCase() === car.carType.toLowerCase());
        const isSeatsSufficient = car.seatNumber >= minimumSeats;
        if (!isCarTypeMatched || !isSeatsSufficient)
            continue;
        // Check Premium Ride Access
        const isPremiumCategory = (catName) => {
            const name = catName.toLowerCase();
            return (name.includes("premium") ||
                name.includes("luxury") ||
                name.includes("vip") ||
                name.includes("elite") ||
                name.includes("business"));
        };
        if (isPremiumCategory(category.name)) {
            const activeTier = yield getTier(driverDoc.currentTier);
            if (!activeTier || !((_e = (_d = activeTier.benefits) === null || _d === void 0 ? void 0 : _d.premiumRideAccess) === null || _e === void 0 ? void 0 : _e.enabled)) {
                logger_1.logger.info(`Driver ${driverDoc.userId} excluded: does not have premium ride access.`);
                continue;
            }
            const allowedCategories = activeTier.benefits.premiumRideAccess.allowedCategories || [];
            const isAllowed = allowedCategories.some((catIdOrName) => catIdOrName === category._id.toString() ||
                catIdOrName.toLowerCase() === category.name.toLowerCase());
            if (!isAllowed) {
                logger_1.logger.info(`Driver ${driverDoc.userId} excluded: category ${category.name} is not in allowed premium categories for tier ${activeTier.name}.`);
                continue;
            }
        }
        // Check Scheduled Reservation Access
        if (rideType === ride_constant_1.RIDE_TYPE.SCHEDULED) {
            const activeTier = yield getTier(driverDoc.currentTier);
            if (!activeTier || !((_g = (_f = activeTier.benefits) === null || _f === void 0 ? void 0 : _f.reservationAccess) === null || _g === void 0 ? void 0 : _g.enabled)) {
                logger_1.logger.info(`Driver ${driverDoc.userId} excluded: current tier does not support accepting scheduled reservations.`);
                continue;
            }
            const maxAdvanceHours = activeTier.benefits.reservationAccess.maxAdvanceHours || 0;
            if (maxAdvanceHours > 0 && scheduledAt) {
                const scheduledTime = new Date(scheduledAt).getTime();
                const advanceHours = (scheduledTime - Date.now()) / (1000 * 60 * 60);
                if (advanceHours > maxAdvanceHours) {
                    logger_1.logger.info(`Driver ${driverDoc.userId} excluded: tier only supports reservation bookings up to ${maxAdvanceHours} hours in advance.`);
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
                yield serviceArea_service_1.ServiceAreaServices.findServiceAreaByCoordinates(driverLongitude, driverLatitude);
            if (driverLocServiceArea) {
                // Use coordinate-based matching for policy lookup
                const query = { status: "active" };
                // For backward compatibility, still check type-based IDs if they exist
                if (driverLocServiceArea.type === "city" && driverLocServiceArea._id) {
                    query.cityId = driverLocServiceArea._id;
                }
                else if (driverLocServiceArea.type === "zone" &&
                    driverLocServiceArea._id) {
                    query.zoneId = driverLocServiceArea._id;
                }
                else if (driverLocServiceArea.type === "airport" &&
                    driverLocServiceArea._id) {
                    query.airportId = driverLocServiceArea._id;
                }
                else if (driverLocServiceArea.type === "state" &&
                    driverLocServiceArea._id) {
                    query.stateId = driverLocServiceArea._id;
                }
                else if (driverLocServiceArea.type === "country" &&
                    driverLocServiceArea._id) {
                    query.countryId = driverLocServiceArea._id;
                }
                policy = yield driverDutyPolicy_model_1.DriverDutyPolicy.findOne(query);
            }
        }
        if (policy) {
            // Get timezone from service area (default to UTC if not set)
            const timezone = (driverLocServiceArea === null || driverLocServiceArea === void 0 ? void 0 : driverLocServiceArea.timezone) || "UTC";
            // Get start of day in the driver's timezone
            const startOfDay = (0, timezoneHelper_1.getCurrentTimeInTimezone)(timezone)
                .startOf("day")
                .toUTC()
                .toJSDate();
            // Sum today's driving time for the driver
            const completedRides = yield ride_model_1.Ride.find({
                driverId: driverDoc.userId,
                status: "completed",
                completedAt: { $gte: startOfDay },
            });
            let totalDrivingHoursToday = 0;
            for (const ride of completedRides) {
                if (ride.startedAt && ride.completedAt) {
                    const durationHrs = (ride.completedAt.getTime() - ride.startedAt.getTime()) /
                        (1000 * 60 * 60);
                    totalDrivingHoursToday += durationHrs;
                }
            }
            if (totalDrivingHoursToday >= policy.maxDrivingHoursPerDay) {
                logger_1.logger.info(`Driver ${driverDoc.userId} excluded due to daily driving hours policy.`);
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
                logger_1.logger.warn(`Service area ${resolvedRideServiceAreaId} location coordinates missing.`);
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
            const matrix = yield googleRouteService_1.GoogleRouteService.calculateDistanceMatrix(origins, destinations);
            for (let i = 0; i < candidates.length; i++) {
                const driverDoc = candidates[i];
                const pickupResult = (_h = matrix[i]) === null || _h === void 0 ? void 0 : _h[0];
                const serviceAreaCenterResult = (_j = matrix[i]) === null || _j === void 0 ? void 0 : _j[1];
                if (pickupResult &&
                    pickupResult.status === "OK" &&
                    serviceAreaCenterResult &&
                    serviceAreaCenterResult.status === "OK") {
                    const distanceToPickup = pickupResult.distanceKm;
                    const distanceToServiceAreaCenter = serviceAreaCenterResult.distanceKm;
                    if (distanceToServiceAreaCenter >
                        (rideServiceArea.coverageRadiusKm || 25)) {
                        logger_1.logger.info(`Driver ${driverDoc.userId} excluded: GPS location is outside assigned service area coverage road distance (${distanceToServiceAreaCenter.toFixed(2)} km > ${rideServiceArea.coverageRadiusKm} km).`);
                        continue;
                    }
                    if (distanceToPickup > radiusKm) {
                        logger_1.logger.info(`Driver ${driverDoc.userId} excluded: GPS location is outside ride search road distance (${distanceToPickup.toFixed(2)} km > ${radiusKm} km).`);
                        continue;
                    }
                    // Compute Dispatch Score
                    const distanceScore = Math.max(0, 100 - distanceToPickup * 10);
                    const ratingScore = (driverDoc.averageRating || 0) * 10;
                    const acceptanceRate = yield (0, points_service_1.calculateDriverAcceptanceRate)(driverDoc.userId);
                    const acceptanceScore = acceptanceRate * 0.5;
                    // Tier priority & Priority Dispatch
                    let tierPriorityScore = 0;
                    const activeTier = yield getTier(driverDoc.currentTier);
                    if (activeTier) {
                        tierPriorityScore += activeTier.level * 15;
                        if ((_l = (_k = activeTier.benefits) === null || _k === void 0 ? void 0 : _k.priorityDispatch) === null || _l === void 0 ? void 0 : _l.enabled) {
                            tierPriorityScore += (activeTier.benefits.priorityDispatch.boostMultiplier || 1.0) * 20;
                        }
                    }
                    // Destination Filter Score
                    let destMatchScore = 0;
                    if (rideDestination && rideDestination.coordinates) {
                        const filter = yield destinationFilter_model_1.DestinationFilter.findOne({
                            driverId: driverDoc.userId,
                            status: "ACTIVE",
                        });
                        if (filter) {
                            const pickup = pickupLocation.coordinates;
                            const rideDest = rideDestination.coordinates;
                            const filterDest = filter.coordinates;
                            const vecPR = [rideDest[0] - pickup[0], rideDest[1] - pickup[1]];
                            const vecPF = [filterDest[0] - pickup[0], filterDest[1] - pickup[1]];
                            const magPR = Math.sqrt(vecPR[0] ** 2 + vecPR[1] ** 2);
                            const magPF = Math.sqrt(vecPF[0] ** 2 + vecPF[1] ** 2);
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
                    if (rideServiceArea.type === "airport" && ((_o = (_m = activeTier === null || activeTier === void 0 ? void 0 : activeTier.benefits) === null || _m === void 0 ? void 0 : _m.airportQueuePriority) === null || _o === void 0 ? void 0 : _o.enabled)) {
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
        }
        catch (err) {
            logger_1.logger.error(`[DriverMatching] Error calculating distance matrix for matching: ${err}`);
            throw err;
        }
        // Sort eligible drivers by dispatchScore descending (highest score first)
        eligibleDrivers.sort((a, b) => (b.dispatchScore || 0) - (a.dispatchScore || 0));
    }
    return eligibleDrivers;
});
exports.findEligibleDriversInRadius = findEligibleDriversInRadius;
