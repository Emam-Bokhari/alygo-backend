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
})(TRANSACTION_TYPE || (exports.TRANSACTION_TYPE = TRANSACTION_TYPE = {}));
