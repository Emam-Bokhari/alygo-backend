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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingServices = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const tracking_model_1 = require("./tracking.model");
const ride_model_1 = require("../ride/ride.model");
const user_model_1 = require("../user/user.model");
const ride_constant_1 = require("../ride/ride.constant");
const socketHelper_1 = require("../../../helpers/socketHelper");
const locationHelper_1 = require("../../../helpers/locationHelper");
const systemConfigHelper_1 = require("../../../helpers/systemConfigHelper");
const logger_1 = require("../../../shared/logger");
const googleRouteService_1 = require("../../../services/googleRouteService");
const driver_model_1 = require("../driver/driver.model");
const car_model_1 = require("../car/car.model");
const buildRideParticipantSummary_1 = require("../ride/helpers/buildRideParticipantSummary");
const timezoneHelper_1 = require("../../../shared/timezoneHelper");
const updatePromises = new Map();
const getTrackingByRideId = (userId, rideId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    // Ensure requester is passenger, driver, or admin
    const isPassenger = ride.userId.toString() === userId;
    const isDriver = ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    const adminUser = yield user_model_1.User.findOne({
        _id: userId,
        role: { $in: ["admin", "superAdmin"] },
    });
    if (!isPassenger && !isDriver && !adminUser) {
        throw new ApiErrors_1.default(403, "You do not have permission to track this ride.");
    }
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId }).populate("userId driverId");
    if (!tracking) {
        throw new ApiErrors_1.default(404, "Tracking log not found for this ride yet.");
    }
    return tracking;
});
/**
 * Optimized driver location update with validation and ETA calculation
 */
const validateStateConsistency = (ride, tracking) => {
    var _a;
    const currentStopOrder = (_a = tracking.currentStopOrder) !== null && _a !== void 0 ? _a : -1;
    // 1. Check stops completed lockstep
    if (ride.stops && ride.stops.length > 0) {
        for (const stop of ride.stops) {
            const shouldBeCompleted = stop.order <= currentStopOrder;
            if (stop.isCompleted !== shouldBeCompleted) {
                logger_1.logger.warn(`Consistency mismatch: stop order ${stop.order} isCompleted is ${stop.isCompleted} but expected ${shouldBeCompleted}`);
                return false;
            }
        }
    }
    // 2. Check target type alignment
    if (ride.status === ride_constant_1.RIDE_STATUS.STARTED) {
        const nextStop = [...(ride.stops || [])]
            .sort((a, b) => a.order - b.order)
            .find((stop) => !stop.isCompleted);
        if (nextStop) {
            if (tracking.targetType !== "stop" ||
                tracking.targetStopOrder !== nextStop.order) {
                logger_1.logger.warn(`Consistency mismatch: expected target stop order ${nextStop.order} but got targetType ${tracking.targetType} targetStopOrder ${tracking.targetStopOrder}`);
                return false;
            }
        }
        else {
            if (tracking.targetType !== "destination") {
                logger_1.logger.warn(`Consistency mismatch: expected target destination but got targetType ${tracking.targetType}`);
                return false;
            }
        }
    }
    else {
        if (tracking.targetType !== "pickup") {
            logger_1.logger.warn(`Consistency mismatch: expected target pickup but got targetType ${tracking.targetType}`);
            return false;
        }
    }
    // 3. Check active leg is current
    if (!tracking.activeLeg || !tracking.activeLeg.isCurrent) {
        logger_1.logger.warn(`Consistency mismatch: activeLeg is missing or isCurrent is not true`);
        return false;
    }
    // 4. Check routeLegs has exactly one current leg matching activeLeg
    const routeLegs = tracking.routeLegs || [];
    const currentLegs = routeLegs.filter((leg) => leg.isCurrent);
    if (currentLegs.length !== 1) {
        logger_1.logger.warn(`Consistency mismatch: expected 1 current leg in routeLegs but found ${currentLegs.length}`);
        return false;
    }
    const currentLeg = currentLegs[0];
    if (currentLeg.from !== tracking.activeLeg.from ||
        currentLeg.to !== tracking.activeLeg.to ||
        currentLeg.distanceKm !== tracking.remainingDistanceKm ||
        currentLeg.durationMinutes !== tracking.estimatedArrivalMinutes) {
        logger_1.logger.warn(`Consistency mismatch: activeLeg details do not match the current leg in routeLegs`);
        return false;
    }
    return true;
};
/**
 * Optimized driver location update with validation and ETA calculation
 */
const updateDriverLocation = (driverUserId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const ride = yield ride_model_1.Ride.findById(payload.rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    // Verify this is the assigned driver
    if (((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a.toString()) !== driverUserId) {
        const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId });
        if (!driverDoc ||
            ((_b = ride.driverId) === null || _b === void 0 ? void 0 : _b.toString()) !== driverDoc.userId.toString()) {
            throw new ApiErrors_1.default(403, "You are not the assigned driver for this ride.");
        }
    }
    let tracking = yield tracking_model_1.Tracking.findOne({ rideId: payload.rideId });
    const [longitude, latitude] = payload.coordinates;
    // Validate location update
    const validation = yield (0, locationHelper_1.validateLocationUpdate)({
        newLat: latitude,
        newLon: longitude,
        oldLat: (_c = tracking === null || tracking === void 0 ? void 0 : tracking.driverLocation) === null || _c === void 0 ? void 0 : _c.coordinates[1],
        oldLon: (_d = tracking === null || tracking === void 0 ? void 0 : tracking.driverLocation) === null || _d === void 0 ? void 0 : _d.coordinates[0],
        lastUpdateTime: tracking === null || tracking === void 0 ? void 0 : tracking.lastDriverLocationUpdateAt,
        rideStatus: ride.status,
    });
    if (!validation.isValid) {
        logger_1.logger.info(`Location update validation failed for ride ${payload.rideId}: ${validation.reason}`);
        if (tracking) {
            return {
                tracking,
                routeLegs: undefined,
                isValid: false,
                reason: validation.reason,
            };
        }
        const newTracking = yield tracking_model_1.Tracking.create({
            rideId: payload.rideId,
            driverId: ride.driverId,
            userId: ride.userId,
            driverLocation: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
            lastUpdatedAt: new Date(),
            lastDriverLocationUpdateAt: new Date(),
        });
        return {
            tracking: newTracking,
            routeLegs: undefined,
            isValid: false,
            reason: validation.reason,
        };
    }
    if (!tracking) {
        tracking = new tracking_model_1.Tracking({
            rideId: payload.rideId,
            driverId: ride.driverId,
            userId: ride.userId,
            currentStopOrder: -1,
        });
    }
    tracking.driverLocation = {
        type: "Point",
        coordinates: [longitude, latitude],
    };
    tracking.lastUpdatedAt = new Date();
    tracking.lastDriverLocationUpdateAt = new Date();
    const activeStatuses = [
        ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
        ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
        ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
        ride_constant_1.RIDE_STATUS.STARTED,
    ];
    let resolvedState = null;
    let transitions = [];
    const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
    const arrivalRadiusKm = (systemConfig.tracking.arrivalRadiusMeters || 30) / 1000;
    if (activeStatuses.includes(ride.status)) {
        try {
            // Resolve tracking state using resolveCurrentTrackingState()
            const resolution = yield googleRouteService_1.GoogleRouteService.resolveCurrentTrackingState({
                driverLocation: { lat: latitude, lng: longitude },
                ride,
                tracking,
                arrivalRadiusKm,
            });
            resolvedState = resolution.trackingState;
            transitions = resolution.transitions;
            // Map resolved state fields onto tracking document
            tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
            tracking.estimatedArrivalMinutes = resolvedState.estimatedArrivalMinutes;
            tracking.etaCalculatedAt = new Date();
            tracking.targetIsPickup = resolvedState.targetIsPickup;
            tracking.targetIsDestination = resolvedState.targetIsDestination;
            // Map new schema fields
            tracking.targetType = resolvedState.targetType;
            tracking.targetLocation = {
                type: "Point",
                coordinates: resolvedState.targetLocation,
            };
            tracking.targetStopOrder = resolvedState.targetStopOrder;
            tracking.activeLeg = resolvedState.activeLeg;
            tracking.totalDistanceKm = resolvedState.totalDistanceKm;
            tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
            tracking.routeLegs = resolvedState.routeLegs;
            tracking.polyline = resolvedState.polyline;
        }
        catch (err) {
            logger_1.logger.error(`[TrackingService] Error calling Tracking State Resolver: ${err.message}`);
            throw err;
        }
    }
    // 10. Save Ride document & 11. Save Tracking document
    yield ride.save();
    yield tracking.save();
    // 12. Re-resolve tracking state after any transition
    if (transitions.length > 0 &&
        activeStatuses.includes(ride.status)) {
        try {
            const resolution = yield googleRouteService_1.GoogleRouteService.resolveCurrentTrackingState({
                driverLocation: { lat: latitude, lng: longitude },
                ride,
                tracking,
                arrivalRadiusKm,
            });
            resolvedState = resolution.trackingState;
            // 13. Update remaining distance and ETA
            tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
            tracking.estimatedArrivalMinutes = resolvedState.estimatedArrivalMinutes;
            tracking.etaCalculatedAt = new Date();
            tracking.targetIsPickup = resolvedState.targetIsPickup;
            tracking.targetIsDestination = resolvedState.targetIsDestination;
            tracking.targetType = resolvedState.targetType;
            tracking.targetLocation = {
                type: "Point",
                coordinates: resolvedState.targetLocation,
            };
            tracking.targetStopOrder = resolvedState.targetStopOrder;
            tracking.activeLeg = resolvedState.activeLeg;
            tracking.totalDistanceKm = resolvedState.totalDistanceKm;
            tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
            tracking.routeLegs = resolvedState.routeLegs;
            tracking.polyline = resolvedState.polyline;
            yield ride.save();
            yield tracking.save();
        }
        catch (err) {
            logger_1.logger.error(`[TrackingService] Error in re-resolution phase: ${err.message}`);
        }
    }
    // State Consistency Validation prior to emitting
    if (resolvedState && activeStatuses.includes(ride.status)) {
        if (!validateStateConsistency(ride, tracking)) {
            logger_1.logger.warn(`[TrackingService] State inconsistency detected before socket emit. Rebuilding...`);
            try {
                const resolution = yield googleRouteService_1.GoogleRouteService.resolveCurrentTrackingState({
                    driverLocation: { lat: latitude, lng: longitude },
                    ride,
                    tracking,
                    arrivalRadiusKm,
                });
                resolvedState = resolution.trackingState;
                tracking.remainingDistanceKm = resolvedState.remainingDistanceKm;
                tracking.estimatedArrivalMinutes =
                    resolvedState.estimatedArrivalMinutes;
                tracking.etaCalculatedAt = new Date();
                tracking.targetIsPickup = resolvedState.targetIsPickup;
                tracking.targetIsDestination = resolvedState.targetIsDestination;
                tracking.targetType = resolvedState.targetType;
                tracking.targetLocation = {
                    type: "Point",
                    coordinates: resolvedState.targetLocation,
                };
                tracking.targetStopOrder = resolvedState.targetStopOrder;
                tracking.activeLeg = resolvedState.activeLeg;
                tracking.totalDistanceKm = resolvedState.totalDistanceKm;
                tracking.totalDurationMinutes = resolvedState.totalDurationMinutes;
                tracking.routeLegs = resolvedState.routeLegs;
                tracking.polyline = resolvedState.polyline;
                yield ride.save();
                yield tracking.save();
            }
            catch (err) {
                logger_1.logger.error(`[TrackingService] Error in rebuild resolution phase: ${err.message}`);
            }
        }
    }
    // Also update driver's location in Driver collection
    yield driver_model_1.Driver.findOneAndUpdate({ userId: driverUserId }, {
        $set: {
            location: {
                type: "Point",
                coordinates: [longitude, latitude],
                address: payload.address || "",
            },
        },
    }, { new: true });
    logger_1.logger.info(`[TrackingService] DB successfully synchronized for ride ${ride._id}`);
    // 14. Emit socket events once.
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId }).populate("userId", "name profileImage");
    const car = yield car_model_1.Car.findOne({ driverId: driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc._id, isVerified: true });
    const driverSummary = yield (0, buildRideParticipantSummary_1.buildDriverSummary)(driverDoc, car);
    for (const transition of transitions) {
        if (transition.type === "driver-on-the-way") {
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "driver-on-the-way", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { driver: driverSummary, pickupLocation: ride.pickup, rideCategory: ride.rideCategory, price: ride.fare.total, estimatedArrivalMinutes: transition.payload.estimatedArrivalMinutes, remainingDistanceKm: transition.payload.remainingDistanceKm }));
            logger_1.logger.info(`[TrackingService] Emitted driver-on-the-way for ride ${ride._id}`);
        }
        else if (transition.type === "driver-arrived") {
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "driver-arrived", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { automaticDetection: true, driver: driverSummary, pickupLocation: ride.pickup, rideCategory: ride.rideCategory, price: ride.fare.total, estimatedArrivalMinutes: 0, remainingDistanceKm: 0 }));
            logger_1.logger.info(`[TrackingService] Emitted driver-arrived for ride ${ride._id}`);
        }
        else if (transition.type === "stop-arrived") {
            socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "stop-arrived", Object.assign(Object.assign({ rideId: ride._id }, (0, timezoneHelper_1.getRideScheduleInfo)(ride)), { stopOrder: transition.payload.stopOrder, stopAddress: transition.payload.stopAddress, automaticDetection: true, driver: driverSummary }));
            logger_1.logger.info(`[TrackingService] Emitted stop-arrived for ride ${ride._id}, stop order ${transition.payload.stopOrder}`);
        }
    }
    // Emit final driver-location-updated event to passenger
    if (systemConfig.tracking.enableSocketOptimization &&
        ride.userId &&
        ride.status !== ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED &&
        resolvedState) {
        const driverUser = driverDoc === null || driverDoc === void 0 ? void 0 : driverDoc.userId;
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "driver-location-updated", {
            rideId: ride._id,
            driverId: ride.driverId,
            driverName: (driverUser === null || driverUser === void 0 ? void 0 : driverUser.name) || "",
            driverProfileImage: driverUser === null || driverUser === void 0 ? void 0 : driverUser.profileImage,
            driverLocation: {
                latitude,
                longitude,
            },
            remainingDistanceKm: tracking.remainingDistanceKm,
            estimatedArrivalMinutes: tracking.estimatedArrivalMinutes,
            routeLegs: resolvedState.routeLegs,
            totalDistanceKm: resolvedState.totalDistanceKm,
            totalDurationMinutes: resolvedState.totalDurationMinutes,
            updatedAt: new Date(),
        });
    }
    return { tracking, routeLegs: resolvedState, isValid: true };
});
/**
 * Handle real-time driver location updates coming from the WebSocket connection.
 * Maps concurrently arriving updates onto a sequential execution queue per rideId.
 */
const processDriverLocationUpdate = (driverUserId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const [longitude, latitude] = payload.coordinates;
    const driverDoc = yield driver_model_1.Driver.findOne({ userId: driverUserId });
    if (!driverDoc) {
        logger_1.logger.warn(`[TrackingService] Driver not found for user: ${driverUserId}`);
        return;
    }
    // Check if driver has an active on-trip ride
    const now = new Date();
    const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
    const activeRide = yield ride_model_1.Ride.findOne({
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
    if (!activeRide) {
        // If no active ride, just update driver location in the Driver collection
        yield driver_model_1.Driver.findOneAndUpdate({ userId: driverUserId }, {
            $set: {
                location: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                    address: payload.address || "",
                },
            },
        }, { new: true });
        logger_1.logger.info(`[TrackingService] Driver ${driverUserId} location updated in DB (no active ride)`);
        return;
    }
    const rideId = activeRide._id.toString();
    const currentPromise = updatePromises.get(rideId) || Promise.resolve();
    // Chain updates sequentially to avoid concurrent execution overlapping on the same rideId
    const nextPromise = currentPromise
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield updateDriverLocation(driverUserId, {
            rideId,
            coordinates: payload.coordinates,
            address: payload.address,
        });
    }))
        .catch((err) => {
        logger_1.logger.error(`[TrackingService] Error in serialized tracking update for ride ${rideId}: ${err.message}`, err);
    });
    updatePromises.set(rideId, nextPromise);
    nextPromise.finally(() => {
        if (updatePromises.get(rideId) === nextPromise) {
            updatePromises.delete(rideId);
        }
    });
    yield nextPromise;
});
/**
 * Check and handle automatic driver arrival detection (deprecated: now atomic inside updateDriverLocation)
 */
const checkDriverArrival = (rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId });
    return { arrived: false, tracking: tracking || undefined };
});
/**
 * Check and handle automatic DRIVER_ON_THE_WAY status transition (deprecated: now atomic inside updateDriverLocation)
 */
const checkDriverOnTheWay = (rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId });
    return { onTheWay: false, tracking: tracking || undefined };
});
/**
 * Check and handle automatic stop arrival detection (deprecated: now atomic inside updateDriverLocation)
 */
const checkStopArrival = (rideId) => __awaiter(void 0, void 0, void 0, function* () {
    const tracking = yield tracking_model_1.Tracking.findOne({ rideId });
    return { stopArrived: false, tracking: tracking || undefined };
});
const createOrUpdateTracking = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const ride = yield ride_model_1.Ride.findById(payload.rideId);
    if (!ride) {
        throw new ApiErrors_1.default(404, "Ride not found");
    }
    const isPassenger = ride.userId.toString() === userId;
    const isDriver = ((_a = ride.driverId) === null || _a === void 0 ? void 0 : _a.toString()) === userId;
    if (!isPassenger && !isDriver) {
        throw new ApiErrors_1.default(403, "You do not have permission to update tracking for this ride.");
    }
    const updateObj = {
        rideId: payload.rideId,
        driverId: ride.driverId,
        userId: ride.userId,
        lastUpdatedAt: new Date(),
    };
    if (payload.driverLocation) {
        updateObj.driverLocation = {
            type: "Point",
            coordinates: payload.driverLocation.coordinates,
        };
    }
    if (payload.userLocation) {
        updateObj.userLocation = {
            type: "Point",
            coordinates: payload.userLocation.coordinates,
        };
    }
    const tracking = yield tracking_model_1.Tracking.findOneAndUpdate({ rideId: payload.rideId }, { $set: updateObj }, { upsert: true, new: true });
    // Sync to counterpart via Socket
    if (payload.driverLocation && ride.userId) {
        socketHelper_1.socketHelper.sendToUser(ride.userId.toString(), "driver-location-updated", {
            rideId: ride._id,
            driverId: ride.driverId,
            coordinates: payload.driverLocation.coordinates,
            updatedAt: new Date(),
        });
    }
    if (payload.userLocation && ride.driverId) {
        socketHelper_1.socketHelper.sendToUser(ride.driverId.toString(), "user-location-updated", {
            rideId: ride._id,
            userId: ride.userId,
            coordinates: payload.userLocation.coordinates,
            updatedAt: new Date(),
        });
    }
    return tracking;
});
exports.TrackingServices = {
    getTrackingByRideId,
    createOrUpdateTracking,
    updateDriverLocation,
    processDriverLocationUpdate,
    checkDriverArrival,
    checkDriverOnTheWay,
    checkStopArrival,
};
