"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIER_BENEFITS = exports.POINT_EVENT_TYPE = exports.SUPPORT_LEVEL = void 0;
var SUPPORT_LEVEL;
(function (SUPPORT_LEVEL) {
    SUPPORT_LEVEL["BASIC"] = "basic";
    SUPPORT_LEVEL["PREMIUM"] = "premium";
    SUPPORT_LEVEL["VIP"] = "vip";
})(SUPPORT_LEVEL || (exports.SUPPORT_LEVEL = SUPPORT_LEVEL = {}));
var POINT_EVENT_TYPE;
(function (POINT_EVENT_TYPE) {
    POINT_EVENT_TYPE["RIDE_COMPLETED"] = "ride_completed";
    POINT_EVENT_TYPE["FIVE_STAR_RATING"] = "five_star_rating";
    POINT_EVENT_TYPE["AIRPORT_RIDE"] = "airport_ride";
    POINT_EVENT_TYPE["SCHEDULED_RIDE"] = "scheduled_ride";
    POINT_EVENT_TYPE["PEAK_HOUR_RIDE"] = "peak_hour_ride";
    POINT_EVENT_TYPE["REFERRAL_COMPLETED"] = "referral_completed";
    POINT_EVENT_TYPE["ACCEPTED_RIDE_CANCELLED"] = "accepted_ride_cancelled";
    POINT_EVENT_TYPE["POLICY_VIOLATION"] = "policy_violation";
    POINT_EVENT_TYPE["ADMIN_OVERRIDE"] = "admin_override";
})(POINT_EVENT_TYPE || (exports.POINT_EVENT_TYPE = POINT_EVENT_TYPE = {}));
exports.DEFAULT_TIER_BENEFITS = {
    destinationFilter: {
        enabled: false,
        dailyLimit: 0,
    },
    priorityDispatch: {
        enabled: false,
        boostMultiplier: 1.0,
    },
    reservationAccess: {
        enabled: false,
        maxAdvanceHours: 0,
    },
    premiumRideAccess: {
        enabled: false,
        allowedCategories: [],
    },
    airportQueuePriority: {
        enabled: false,
        priorityPosition: 0,
    },
    bonusMultiplier: {
        enabled: false,
        multiplierValue: 1.0,
    },
    vipSupport: {
        enabled: false,
        supportLevel: SUPPORT_LEVEL.BASIC,
    },
};
