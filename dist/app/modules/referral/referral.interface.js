"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REWARD_STATUS = exports.REFERRAL_STATUS = void 0;
var REFERRAL_STATUS;
(function (REFERRAL_STATUS) {
    REFERRAL_STATUS["JOINED"] = "joined";
    REFERRAL_STATUS["IN_PROGRESS"] = "in_progress";
    REFERRAL_STATUS["COMPLETED"] = "completed";
})(REFERRAL_STATUS || (exports.REFERRAL_STATUS = REFERRAL_STATUS = {}));
var REWARD_STATUS;
(function (REWARD_STATUS) {
    REWARD_STATUS["PENDING"] = "pending";
    REWARD_STATUS["PAID"] = "paid";
})(REWARD_STATUS || (exports.REWARD_STATUS = REWARD_STATUS = {}));
