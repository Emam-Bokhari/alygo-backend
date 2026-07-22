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
exports.shouldRefreshETA = exports.validateLocationUpdate = exports.hasMovedMinimumDistance = exports.hasMinimumIntervalElapsed = exports.areCoordinatesDuplicate = exports.isValidCoordinates = void 0;
const systemConfigHelper_1 = require("./systemConfigHelper");
/**
 * Validate GPS coordinates
 */
const isValidCoordinates = (latitude, longitude) => {
    return (latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180 &&
        !isNaN(latitude) &&
        !isNaN(longitude));
};
exports.isValidCoordinates = isValidCoordinates;
/**
 * Check if coordinates are duplicates (exactly matching)
 */
const areCoordinatesDuplicate = (lat1, lon1, lat2, lon2) => {
    return lat1 === lat2 && lon1 === lon2;
};
exports.areCoordinatesDuplicate = areCoordinatesDuplicate;
/**
 * Check if enough time has passed since last update
 */
const hasMinimumIntervalElapsed = (lastUpdateTime, minIntervalSeconds) => __awaiter(void 0, void 0, void 0, function* () {
    const now = new Date();
    const elapsedMs = now.getTime() - lastUpdateTime.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const interval = minIntervalSeconds !== null && minIntervalSeconds !== void 0 ? minIntervalSeconds : (yield (0, systemConfigHelper_1.getSystemConfig)()).tracking.minLocationUpdateIntervalSeconds;
    return elapsedSeconds >= interval;
});
exports.hasMinimumIntervalElapsed = hasMinimumIntervalElapsed;
/**
 * Check if driver has moved minimum distance (using simple bounding box to filter GPS jitter)
 */
const hasMovedMinimumDistance = (lat1, lon1, lat2, lon2) => __awaiter(void 0, void 0, void 0, function* () {
    // 0.0001 degrees is approximately 11 meters
    const minDelta = 0.0001;
    return Math.abs(lat1 - lat2) >= minDelta || Math.abs(lon1 - lon2) >= minDelta;
});
exports.hasMovedMinimumDistance = hasMovedMinimumDistance;
/**
 * Validate location update before processing
 */
const validateLocationUpdate = (params) => __awaiter(void 0, void 0, void 0, function* () {
    const { newLat, newLon, oldLat, oldLon, lastUpdateTime, rideStatus } = params;
    // Validate coordinates
    if (!(0, exports.isValidCoordinates)(newLat, newLon)) {
        return { isValid: false, reason: "Invalid GPS coordinates" };
    }
    // Check for inactive ride status
    const inactiveStatuses = [
        "completed",
        "cancelled",
        "cancelled_by_user",
        "cancelled_by_driver",
        "expired",
    ];
    if (rideStatus && inactiveStatuses.includes(rideStatus.toLowerCase())) {
        return { isValid: false, reason: "Ride is not active" };
    }
    // If no previous location, this is valid (first update)
    if (oldLat === undefined || oldLon === undefined) {
        return { isValid: true };
    }
    // Check for duplicate coordinates
    if ((0, exports.areCoordinatesDuplicate)(newLat, newLon, oldLat, oldLon)) {
        return { isValid: false, reason: "Duplicate coordinates" };
    }
    // Check minimum movement distance
    if (!(yield (0, exports.hasMovedMinimumDistance)(newLat, newLon, oldLat, oldLon))) {
        return {
            isValid: false,
            reason: "Movement below minimum distance threshold",
        };
    }
    // Check minimum update interval
    if (lastUpdateTime && !(yield (0, exports.hasMinimumIntervalElapsed)(lastUpdateTime))) {
        return { isValid: false, reason: "Update interval too short" };
    }
    return { isValid: true };
});
exports.validateLocationUpdate = validateLocationUpdate;
/**
 * Check if ETA should be refreshed based on time interval
 */
const shouldRefreshETA = (lastETACalculatedAt, refreshIntervalSeconds) => __awaiter(void 0, void 0, void 0, function* () {
    if (!lastETACalculatedAt) {
        return true;
    }
    const now = new Date();
    const elapsedMs = now.getTime() - lastETACalculatedAt.getTime();
    const elapsedSeconds = elapsedMs / 1000;
    const interval = refreshIntervalSeconds !== null && refreshIntervalSeconds !== void 0 ? refreshIntervalSeconds : (yield (0, systemConfigHelper_1.getSystemConfig)()).tracking.etaRefreshIntervalSeconds;
    return elapsedSeconds >= interval;
});
exports.shouldRefreshETA = shouldRefreshETA;
