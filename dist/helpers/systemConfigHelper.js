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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101, _102, _103, _104, _105, _106, _107, _108, _109, _110, _111, _112, _113, _114, _115, _116, _117, _118, _119, _120, _121, _122, _123, _124, _125, _126, _127, _128, _129, _130, _131, _132, _133, _134, _135, _136, _137, _138, _139, _140, _141, _142, _143, _144, _145, _146, _147, _148, _149, _150, _151, _152, _153, _154, _155, _156, _157, _158, _159, _160, _161, _162, _163, _164, _165, _166, _167, _168, _169, _170, _171, _172, _173, _174, _175, _176, _177, _178, _179, _180, _181, _182, _183, _184, _185, _186, _187, _188, _189, _190, _191, _192, _193;
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
                    maxFiles: (_23 = (_22 = dbConfig.lostFound) === null || _22 === void 0 ? void 0 : _22.maxFiles) !== null && _23 !== void 0 ? _23 : config_1.default.lostFound.maxFiles,
                    maxFileSizeMb: (_25 = (_24 = dbConfig.lostFound) === null || _24 === void 0 ? void 0 : _24.maxFileSizeMb) !== null && _25 !== void 0 ? _25 : config_1.default.lostFound.maxFileSizeMb,
                    defaultDeliveryFee: (_27 = (_26 = dbConfig.lostFound) === null || _26 === void 0 ? void 0 : _26.defaultDeliveryFee) !== null && _27 !== void 0 ? _27 : config_1.default.lostFound.defaultDeliveryFee,
                    returnConfirmationHours: (_29 = (_28 = dbConfig.lostFound) === null || _28 === void 0 ? void 0 : _28.returnConfirmationHours) !== null && _29 !== void 0 ? _29 : config_1.default.lostFound.returnConfirmationHours,
                    autoCloseDays: (_31 = (_30 = dbConfig.lostFound) === null || _30 === void 0 ? void 0 : _30.autoCloseDays) !== null && _31 !== void 0 ? _31 : config_1.default.lostFound.autoCloseDays,
                },
                referral: {
                    passenger: {
                        enabled: (_37 = (_34 = (_33 = (_32 = dbConfig.referral) === null || _32 === void 0 ? void 0 : _32.passenger) === null || _33 === void 0 ? void 0 : _33.enabled) !== null && _34 !== void 0 ? _34 : (_36 = (_35 = config_1.default.referral) === null || _35 === void 0 ? void 0 : _35.passenger) === null || _36 === void 0 ? void 0 : _36.enabled) !== null && _37 !== void 0 ? _37 : true,
                        rewardAmount: (_43 = (_40 = (_39 = (_38 = dbConfig.referral) === null || _38 === void 0 ? void 0 : _38.passenger) === null || _39 === void 0 ? void 0 : _39.rewardAmount) !== null && _40 !== void 0 ? _40 : (_42 = (_41 = config_1.default.referral) === null || _41 === void 0 ? void 0 : _41.passenger) === null || _42 === void 0 ? void 0 : _42.rewardAmount) !== null && _43 !== void 0 ? _43 : 20,
                        rewardCurrency: (_49 = (_46 = (_45 = (_44 = dbConfig.referral) === null || _44 === void 0 ? void 0 : _44.passenger) === null || _45 === void 0 ? void 0 : _45.rewardCurrency) !== null && _46 !== void 0 ? _46 : (_48 = (_47 = config_1.default.referral) === null || _47 === void 0 ? void 0 : _47.passenger) === null || _48 === void 0 ? void 0 : _48.rewardCurrency) !== null && _49 !== void 0 ? _49 : "USD",
                        qualificationType: (_55 = (_52 = (_51 = (_50 = dbConfig.referral) === null || _50 === void 0 ? void 0 : _50.passenger) === null || _51 === void 0 ? void 0 : _51.qualificationType) !== null && _52 !== void 0 ? _52 : (_54 = (_53 = config_1.default.referral) === null || _53 === void 0 ? void 0 : _53.passenger) === null || _54 === void 0 ? void 0 : _54.qualificationType) !== null && _55 !== void 0 ? _55 : "rides",
                        requiredCompletedTrips: (_61 = (_58 = (_57 = (_56 = dbConfig.referral) === null || _56 === void 0 ? void 0 : _56.passenger) === null || _57 === void 0 ? void 0 : _57.requiredCompletedTrips) !== null && _58 !== void 0 ? _58 : (_60 = (_59 = config_1.default.referral) === null || _59 === void 0 ? void 0 : _59.passenger) === null || _60 === void 0 ? void 0 : _60.requiredCompletedTrips) !== null && _61 !== void 0 ? _61 : 1,
                        qualificationDays: (_67 = (_64 = (_63 = (_62 = dbConfig.referral) === null || _62 === void 0 ? void 0 : _62.passenger) === null || _63 === void 0 ? void 0 : _63.qualificationDays) !== null && _64 !== void 0 ? _64 : (_66 = (_65 = config_1.default.referral) === null || _65 === void 0 ? void 0 : _65.passenger) === null || _66 === void 0 ? void 0 : _66.qualificationDays) !== null && _67 !== void 0 ? _67 : 30,
                        allowMultipleRewards: (_73 = (_70 = (_69 = (_68 = dbConfig.referral) === null || _68 === void 0 ? void 0 : _68.passenger) === null || _69 === void 0 ? void 0 : _69.allowMultipleRewards) !== null && _70 !== void 0 ? _70 : (_72 = (_71 = config_1.default.referral) === null || _71 === void 0 ? void 0 : _71.passenger) === null || _72 === void 0 ? void 0 : _72.allowMultipleRewards) !== null && _73 !== void 0 ? _73 : false,
                        maximumRewardsPerUser: (_79 = (_76 = (_75 = (_74 = dbConfig.referral) === null || _74 === void 0 ? void 0 : _74.passenger) === null || _75 === void 0 ? void 0 : _75.maximumRewardsPerUser) !== null && _76 !== void 0 ? _76 : (_78 = (_77 = config_1.default.referral) === null || _77 === void 0 ? void 0 : _77.passenger) === null || _78 === void 0 ? void 0 : _78.maximumRewardsPerUser) !== null && _79 !== void 0 ? _79 : 5,
                        autoRewardEnabled: (_85 = (_82 = (_81 = (_80 = dbConfig.referral) === null || _80 === void 0 ? void 0 : _80.passenger) === null || _81 === void 0 ? void 0 : _81.autoRewardEnabled) !== null && _82 !== void 0 ? _82 : (_84 = (_83 = config_1.default.referral) === null || _83 === void 0 ? void 0 : _83.passenger) === null || _84 === void 0 ? void 0 : _84.autoRewardEnabled) !== null && _85 !== void 0 ? _85 : true,
                        shareInstructions: (_91 = (_88 = (_87 = (_86 = dbConfig.referral) === null || _86 === void 0 ? void 0 : _86.passenger) === null || _87 === void 0 ? void 0 : _87.shareInstructions) !== null && _88 !== void 0 ? _88 : (_90 = (_89 = config_1.default.referral) === null || _89 === void 0 ? void 0 : _89.passenger) === null || _90 === void 0 ? void 0 : _90.shareInstructions) !== null && _91 !== void 0 ? _91 : "",
                        rewardTerms: (_97 = (_94 = (_93 = (_92 = dbConfig.referral) === null || _92 === void 0 ? void 0 : _92.passenger) === null || _93 === void 0 ? void 0 : _93.rewardTerms) !== null && _94 !== void 0 ? _94 : (_96 = (_95 = config_1.default.referral) === null || _95 === void 0 ? void 0 : _95.passenger) === null || _96 === void 0 ? void 0 : _96.rewardTerms) !== null && _97 !== void 0 ? _97 : "",
                        generalNotes: (_103 = (_100 = (_99 = (_98 = dbConfig.referral) === null || _98 === void 0 ? void 0 : _98.passenger) === null || _99 === void 0 ? void 0 : _99.generalNotes) !== null && _100 !== void 0 ? _100 : (_102 = (_101 = config_1.default.referral) === null || _101 === void 0 ? void 0 : _101.passenger) === null || _102 === void 0 ? void 0 : _102.generalNotes) !== null && _103 !== void 0 ? _103 : "",
                    },
                    driver: {
                        enabled: (_109 = (_106 = (_105 = (_104 = dbConfig.referral) === null || _104 === void 0 ? void 0 : _104.driver) === null || _105 === void 0 ? void 0 : _105.enabled) !== null && _106 !== void 0 ? _106 : (_108 = (_107 = config_1.default.referral) === null || _107 === void 0 ? void 0 : _107.driver) === null || _108 === void 0 ? void 0 : _108.enabled) !== null && _109 !== void 0 ? _109 : true,
                        rewardAmount: (_115 = (_112 = (_111 = (_110 = dbConfig.referral) === null || _110 === void 0 ? void 0 : _110.driver) === null || _111 === void 0 ? void 0 : _111.rewardAmount) !== null && _112 !== void 0 ? _112 : (_114 = (_113 = config_1.default.referral) === null || _113 === void 0 ? void 0 : _113.driver) === null || _114 === void 0 ? void 0 : _114.rewardAmount) !== null && _115 !== void 0 ? _115 : 100,
                        rewardCurrency: (_121 = (_118 = (_117 = (_116 = dbConfig.referral) === null || _116 === void 0 ? void 0 : _116.driver) === null || _117 === void 0 ? void 0 : _117.rewardCurrency) !== null && _118 !== void 0 ? _118 : (_120 = (_119 = config_1.default.referral) === null || _119 === void 0 ? void 0 : _119.driver) === null || _120 === void 0 ? void 0 : _120.rewardCurrency) !== null && _121 !== void 0 ? _121 : "USD",
                        requiredCompletedTrips: (_127 = (_124 = (_123 = (_122 = dbConfig.referral) === null || _122 === void 0 ? void 0 : _122.driver) === null || _123 === void 0 ? void 0 : _123.requiredCompletedTrips) !== null && _124 !== void 0 ? _124 : (_126 = (_125 = config_1.default.referral) === null || _125 === void 0 ? void 0 : _125.driver) === null || _126 === void 0 ? void 0 : _126.requiredCompletedTrips) !== null && _127 !== void 0 ? _127 : 10,
                        qualificationDays: (_133 = (_130 = (_129 = (_128 = dbConfig.referral) === null || _128 === void 0 ? void 0 : _128.driver) === null || _129 === void 0 ? void 0 : _129.qualificationDays) !== null && _130 !== void 0 ? _130 : (_132 = (_131 = config_1.default.referral) === null || _131 === void 0 ? void 0 : _131.driver) === null || _132 === void 0 ? void 0 : _132.qualificationDays) !== null && _133 !== void 0 ? _133 : 30,
                        payoutDelayHours: (_139 = (_136 = (_135 = (_134 = dbConfig.referral) === null || _134 === void 0 ? void 0 : _134.driver) === null || _135 === void 0 ? void 0 : _135.payoutDelayHours) !== null && _136 !== void 0 ? _136 : (_138 = (_137 = config_1.default.referral) === null || _137 === void 0 ? void 0 : _137.driver) === null || _138 === void 0 ? void 0 : _138.payoutDelayHours) !== null && _139 !== void 0 ? _139 : 0,
                        autoRewardEnabled: (_145 = (_142 = (_141 = (_140 = dbConfig.referral) === null || _140 === void 0 ? void 0 : _140.driver) === null || _141 === void 0 ? void 0 : _141.autoRewardEnabled) !== null && _142 !== void 0 ? _142 : (_144 = (_143 = config_1.default.referral) === null || _143 === void 0 ? void 0 : _143.driver) === null || _144 === void 0 ? void 0 : _144.autoRewardEnabled) !== null && _145 !== void 0 ? _145 : true,
                        maximumRewardsPerDriver: (_151 = (_148 = (_147 = (_146 = dbConfig.referral) === null || _146 === void 0 ? void 0 : _146.driver) === null || _147 === void 0 ? void 0 : _147.maximumRewardsPerDriver) !== null && _148 !== void 0 ? _148 : (_150 = (_149 = config_1.default.referral) === null || _149 === void 0 ? void 0 : _149.driver) === null || _150 === void 0 ? void 0 : _150.maximumRewardsPerDriver) !== null && _151 !== void 0 ? _151 : 10,
                        shareInstructions: (_157 = (_154 = (_153 = (_152 = dbConfig.referral) === null || _152 === void 0 ? void 0 : _152.driver) === null || _153 === void 0 ? void 0 : _153.shareInstructions) !== null && _154 !== void 0 ? _154 : (_156 = (_155 = config_1.default.referral) === null || _155 === void 0 ? void 0 : _155.driver) === null || _156 === void 0 ? void 0 : _156.shareInstructions) !== null && _157 !== void 0 ? _157 : "",
                        termsAndConditions: (_163 = (_160 = (_159 = (_158 = dbConfig.referral) === null || _158 === void 0 ? void 0 : _158.driver) === null || _159 === void 0 ? void 0 : _159.termsAndConditions) !== null && _160 !== void 0 ? _160 : (_162 = (_161 = config_1.default.referral) === null || _161 === void 0 ? void 0 : _161.driver) === null || _162 === void 0 ? void 0 : _162.termsAndConditions) !== null && _163 !== void 0 ? _163 : "",
                        generalNotes: (_169 = (_166 = (_165 = (_164 = dbConfig.referral) === null || _164 === void 0 ? void 0 : _164.driver) === null || _165 === void 0 ? void 0 : _165.generalNotes) !== null && _166 !== void 0 ? _166 : (_168 = (_167 = config_1.default.referral) === null || _167 === void 0 ? void 0 : _167.driver) === null || _168 === void 0 ? void 0 : _168.generalNotes) !== null && _169 !== void 0 ? _169 : "",
                    },
                },
                driverRewards: {
                    enabled: (_173 = (_171 = (_170 = dbConfig.driverRewards) === null || _170 === void 0 ? void 0 : _170.enabled) !== null && _171 !== void 0 ? _171 : (_172 = config_1.default.driverRewards) === null || _172 === void 0 ? void 0 : _172.enabled) !== null && _173 !== void 0 ? _173 : true,
                    tierPromotion: (_177 = (_175 = (_174 = dbConfig.driverRewards) === null || _174 === void 0 ? void 0 : _174.tierPromotion) !== null && _175 !== void 0 ? _175 : (_176 = config_1.default.driverRewards) === null || _176 === void 0 ? void 0 : _176.tierPromotion) !== null && _177 !== void 0 ? _177 : true,
                    autoDowngrade: (_181 = (_179 = (_178 = dbConfig.driverRewards) === null || _178 === void 0 ? void 0 : _178.autoDowngrade) !== null && _179 !== void 0 ? _179 : (_180 = config_1.default.driverRewards) === null || _180 === void 0 ? void 0 : _180.autoDowngrade) !== null && _181 !== void 0 ? _181 : true,
                    dailyQuotaResetTime: (_185 = (_183 = (_182 = dbConfig.driverRewards) === null || _182 === void 0 ? void 0 : _182.dailyQuotaResetTime) !== null && _183 !== void 0 ? _183 : (_184 = config_1.default.driverRewards) === null || _184 === void 0 ? void 0 : _184.dailyQuotaResetTime) !== null && _185 !== void 0 ? _185 : "00:00",
                    timezone: (_189 = (_187 = (_186 = dbConfig.driverRewards) === null || _186 === void 0 ? void 0 : _186.timezone) !== null && _187 !== void 0 ? _187 : (_188 = config_1.default.driverRewards) === null || _188 === void 0 ? void 0 : _188.timezone) !== null && _189 !== void 0 ? _189 : "Asia/Dhaka",
                    destinationFilterRadiusDefault: (_193 = (_191 = (_190 = dbConfig.driverRewards) === null || _190 === void 0 ? void 0 : _190.destinationFilterRadiusDefault) !== null && _191 !== void 0 ? _191 : (_192 = config_1.default.driverRewards) === null || _192 === void 0 ? void 0 : _192.destinationFilterRadiusDefault) !== null && _193 !== void 0 ? _193 : 5,
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
        referral: config_1.default.referral,
        driverRewards: config_1.default.driverRewards || {
            enabled: true,
            tierPromotion: true,
            autoDowngrade: true,
            dailyQuotaResetTime: "00:00",
            timezone: "Asia/Dhaka",
            destinationFilterRadiusDefault: 5,
        },
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
