"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSACTION_TYPE = void 0;
var TRANSACTION_TYPE;
(function (TRANSACTION_TYPE) {
    TRANSACTION_TYPE["BOOKING_PAYMENT"] = "booking_payment";
    TRANSACTION_TYPE["WALLET_TOPUP"] = "wallet_topup";
    TRANSACTION_TYPE["REFUND"] = "refund";
    TRANSACTION_TYPE["CANCELLATION_FEE"] = "cancellation_fee";
    TRANSACTION_TYPE["CANCELLATION_COMPENSATION"] = "cancellation_compensation";
    TRANSACTION_TYPE["PAYOUT"] = "payout";
    TRANSACTION_TYPE["DRIVER_APPRECIATION"] = "driver_appreciation";
    TRANSACTION_TYPE["LOST_FOUND_DELIVERY"] = "lost_found_delivery";
    TRANSACTION_TYPE["USER_REFERRAL_REWARD"] = "user_referral_reward";
    TRANSACTION_TYPE["DRIVER_REFERRAL_REWARD"] = "driver_referral_reward";
})(TRANSACTION_TYPE || (exports.TRANSACTION_TYPE = TRANSACTION_TYPE = {}));
