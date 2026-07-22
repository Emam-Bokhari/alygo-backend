"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYOUT_METHOD = exports.PAYOUT_STATUS = void 0;
var PAYOUT_STATUS;
(function (PAYOUT_STATUS) {
    PAYOUT_STATUS["PENDING"] = "pending";
    PAYOUT_STATUS["PROCESSING"] = "processing";
    PAYOUT_STATUS["COMPLETED"] = "completed";
    PAYOUT_STATUS["FAILED"] = "failed";
    PAYOUT_STATUS["REJECTED"] = "rejected";
})(PAYOUT_STATUS || (exports.PAYOUT_STATUS = PAYOUT_STATUS = {}));
var PAYOUT_METHOD;
(function (PAYOUT_METHOD) {
    PAYOUT_METHOD["STRIPE"] = "stripe";
    PAYOUT_METHOD["BANK_TRANSFER"] = "bank_transfer";
})(PAYOUT_METHOD || (exports.PAYOUT_METHOD = PAYOUT_METHOD = {}));
