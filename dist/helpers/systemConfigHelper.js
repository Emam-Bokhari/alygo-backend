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
exports.clearSystemConfigCache = exports.getSystemConfig = void 0;
const config_1 = __importDefault(require("../config"));
const systemConfiguration_service_1 = require("../app/modules/systemConfiguration/systemConfiguration.service");
let cachedConfig = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Get system configuration with database values
 * Falls back to .env values if database is unavailable
 */
const getSystemConfig = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35;
    const now = Date.now();
    // Return cached config if still valid
    if (cachedConfig && now < cacheExpiry) {
        return cachedConfig;
    }
    try {
        const dbConfig = yield systemConfiguration_service_1.SystemConfigurationService.getSystemConfig();
        if (dbConfig) {
            cachedConfig = {
                driverMatching: {
                    initialSearchRadiusKm: (_b = (_a = dbConfig.driverMatching) === null || _a === void 0 ? void 0 : _a.initialSearchRadiusKm) !== null && _b !== void 0 ? _b : config_1.default.driverMatching.initialSearchRadiusKm,
                    radiusExpansionDistanceKm: (_d = (_c = dbConfig.driverMatching) === null || _c === void 0 ? void 0 : _c.radiusExpansionDistanceKm) !== null && _d !== void 0 ? _d : config_1.default.driverMatching.radiusExpansionDistanceKm,
                    driverVisibilityDurationSeconds: (_f = (_e = dbConfig.driverMatching) === null || _e === void 0 ? void 0 : _e.driverVisibilityDurationSeconds) !== null && _f !== void 0 ? _f : config_1.default.driverMatching.driverVisibilityDurationSeconds,
                    rideRequestLifetimeSeconds: (_h = (_g = dbConfig.driverMatching) === null || _g === void 0 ? void 0 : _g.rideRequestLifetimeSeconds) !== null && _h !== void 0 ? _h : config_1.default.driverMatching.rideRequestLifetimeSeconds,
                    maxSearchRadiusKm: (_k = (_j = dbConfig.driverMatching) === null || _j === void 0 ? void 0 : _j.maxSearchRadiusKm) !== null && _k !== void 0 ? _k : config_1.default.driverMatching.maxSearchRadiusKm,
                },
                tracking: {
                    minLocationUpdateIntervalSeconds: (_m = (_l = dbConfig.tracking) === null || _l === void 0 ? void 0 : _l.minLocationUpdateIntervalSeconds) !== null && _m !== void 0 ? _m : config_1.default.tracking.minLocationUpdateIntervalSeconds,
                    minMovementDistanceMeters: (_p = (_o = dbConfig.tracking) === null || _o === void 0 ? void 0 : _o.minMovementDistanceMeters) !== null && _p !== void 0 ? _p : config_1.default.tracking.minMovementDistanceMeters,
                    maxGpsAccuracyToleranceMeters: (_r = (_q = dbConfig.tracking) === null || _q === void 0 ? void 0 : _q.maxGpsAccuracyToleranceMeters) !== null && _r !== void 0 ? _r : config_1.default.tracking.maxGpsAccuracyToleranceMeters,
                    arrivalRadiusMeters: (_t = (_s = dbConfig.tracking) === null || _s === void 0 ? void 0 : _s.arrivalRadiusMeters) !== null && _t !== void 0 ? _t : config_1.default.tracking.arrivalRadiusMeters,
                    etaRefreshIntervalSeconds: (_v = (_u = dbConfig.tracking) === null || _u === void 0 ? void 0 : _u.etaRefreshIntervalSeconds) !== null && _v !== void 0 ? _v : config_1.default.tracking.etaRefreshIntervalSeconds,
                    averageSpeedKmh: (_x = (_w = dbConfig.tracking) === null || _w === void 0 ? void 0 : _w.averageSpeedKmh) !== null && _x !== void 0 ? _x : config_1.default.tracking.averageSpeedKmh,
                    enableSocketOptimization: (_z = (_y = dbConfig.tracking) === null || _y === void 0 ? void 0 : _y.enableSocketOptimization) !== null && _z !== void 0 ? _z : config_1.default.tracking.enableSocketOptimization,
                },
                reservation: {
                    enabled: (_1 = (_0 = dbConfig.reservation) === null || _0 === void 0 ? void 0 : _0.enabled) !== null && _1 !== void 0 ? _1 : config_1.default.reservation.enabled,
                    minAdvanceMinutes: (_3 = (_2 = dbConfig.reservation) === null || _2 === void 0 ? void 0 : _2.minAdvanceMinutes) !== null && _3 !== void 0 ? _3 : config_1.default.reservation.minAdvanceMinutes,
                    maxAdvanceDays: (_5 = (_4 = dbConfig.reservation) === null || _4 === void 0 ? void 0 : _4.maxAdvanceDays) !== null && _5 !== void 0 ? _5 : config_1.default.reservation.maxAdvanceDays,
                    driverVisibleBeforeMinutes: (_7 = (_6 = dbConfig.reservation) === null || _6 === void 0 ? void 0 : _6.driverVisibleBeforeMinutes) !== null && _7 !== void 0 ? _7 : config_1.default.reservation.driverVisibleBeforeMinutes,
                    driverAssignmentTimeoutMinutes: (_9 = (_8 = dbConfig.reservation) === null || _8 === void 0 ? void 0 : _8.driverAssignmentTimeoutMinutes) !== null && _9 !== void 0 ? _9 : config_1.default.reservation.driverAssignmentTimeoutMinutes,
                    reminder24h: (_11 = (_10 = dbConfig.reservation) === null || _10 === void 0 ? void 0 : _10.reminder24h) !== null && _11 !== void 0 ? _11 : config_1.default.reservation.reminder24h,
                    reminder1h: (_13 = (_12 = dbConfig.reservation) === null || _12 === void 0 ? void 0 : _12.reminder1h) !== null && _13 !== void 0 ? _13 : config_1.default.reservation.reminder1h,
                    reminder30m: (_15 = (_14 = dbConfig.reservation) === null || _14 === void 0 ? void 0 : _14.reminder30m) !== null && _15 !== void 0 ? _15 : config_1.default.reservation.reminder30m,
                    reminder15m: (_17 = (_16 = dbConfig.reservation) === null || _16 === void 0 ? void 0 : _16.reminder15m) !== null && _17 !== void 0 ? _17 : config_1.default.reservation.reminder15m,
                },
                lostFound: {
                    enabled: (_19 = (_18 = dbConfig.lostFound) === null || _18 === void 0 ? void 0 : _18.enabled) !== null && _19 !== void 0 ? _19 : config_1.default.lostFound.enabled,
                    reportWindowDays: (_21 = (_20 = dbConfig.lostFound) === null || _20 === void 0 ? void 0 : _20.reportWindowDays) !== null && _21 !== void 0 ? _21 : config_1.default.lostFound.reportWindowDays,
                    maxImages: (_23 = (_22 = dbConfig.lostFound) === null || _22 === void 0 ? void 0 : _22.maxImages) !== null && _23 !== void 0 ? _23 : config_1.default.lostFound.maxImages,
                    maxVideos: (_25 = (_24 = dbConfig.lostFound) === null || _24 === void 0 ? void 0 : _24.maxVideos) !== null && _25 !== void 0 ? _25 : config_1.default.lostFound.maxVideos,
                    maxImageSizeMb: (_27 = (_26 = dbConfig.lostFound) === null || _26 === void 0 ? void 0 : _26.maxImageSizeMb) !== null && _27 !== void 0 ? _27 : config_1.default.lostFound.maxImageSizeMb,
                    maxVideoSizeMb: (_29 = (_28 = dbConfig.lostFound) === null || _28 === void 0 ? void 0 : _28.maxVideoSizeMb) !== null && _29 !== void 0 ? _29 : config_1.default.lostFound.maxVideoSizeMb,
                    defaultDeliveryFee: (_31 = (_30 = dbConfig.lostFound) === null || _30 === void 0 ? void 0 : _30.defaultDeliveryFee) !== null && _31 !== void 0 ? _31 : config_1.default.lostFound.defaultDeliveryFee,
                    returnConfirmationHours: (_33 = (_32 = dbConfig.lostFound) === null || _32 === void 0 ? void 0 : _32.returnConfirmationHours) !== null && _33 !== void 0 ? _33 : config_1.default.lostFound.returnConfirmationHours,
                    autoCloseDays: (_35 = (_34 = dbConfig.lostFound) === null || _34 === void 0 ? void 0 : _34.autoCloseDays) !== null && _35 !== void 0 ? _35 : config_1.default.lostFound.autoCloseDays,
                },
            };
            cacheExpiry = now + CACHE_DURATION_MS;
            return cachedConfig;
        }
    }
    catch (error) {
        console.warn("Failed to fetch system config from database, using .env fallback:", error);
    }
    // Fallback to .env values
    cachedConfig = {
        driverMatching: config_1.default.driverMatching,
        tracking: config_1.default.tracking,
        reservation: config_1.default.reservation,
        lostFound: config_1.default.lostFound,
    };
    cacheExpiry = now + CACHE_DURATION_MS;
    return cachedConfig;
});
exports.getSystemConfig = getSystemConfig;
/**
 * Clear the configuration cache (call after updating config)
 */
const clearSystemConfigCache = () => {
    cachedConfig = null;
    cacheExpiry = 0;
};
exports.clearSystemConfigCache = clearSystemConfigCache;
