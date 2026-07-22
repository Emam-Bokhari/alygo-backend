"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIER_BENEFITS = exports.SUPPORT_LEVEL = void 0;
var SUPPORT_LEVEL;
(function (SUPPORT_LEVEL) {
    SUPPORT_LEVEL["BASIC"] = "basic";
    SUPPORT_LEVEL["PREMIUM"] = "premium";
    SUPPORT_LEVEL["VIP"] = "vip";
})(SUPPORT_LEVEL || (exports.SUPPORT_LEVEL = SUPPORT_LEVEL = {}));
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
