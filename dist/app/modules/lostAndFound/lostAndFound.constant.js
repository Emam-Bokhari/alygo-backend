"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_NOT_FOUND_REASON = exports.PAYMENT_STATUS = exports.FOUND_STATUS = exports.RECOVERY_METHOD = exports.REPORT_STATUS = void 0;
var REPORT_STATUS;
(function (REPORT_STATUS) {
    REPORT_STATUS["REPORTED"] = "reported";
    REPORT_STATUS["UNDER_REVIEW"] = "under_review";
    REPORT_STATUS["FOUND"] = "found";
    REPORT_STATUS["NOT_FOUND"] = "not_found";
    REPORT_STATUS["WAITING_PAYMENT"] = "waiting_payment";
    REPORT_STATUS["PAYMENT_COMPLETED"] = "payment_completed";
    REPORT_STATUS["RETURN_SCHEDULED"] = "return_scheduled";
    REPORT_STATUS["RETURN_IN_PROGRESS"] = "return_in_progress";
    REPORT_STATUS["RETURN_COMPLETED"] = "return_completed";
    REPORT_STATUS["RECEIVED"] = "received";
    REPORT_STATUS["CLOSED"] = "closed";
    REPORT_STATUS["CANCELLED"] = "cancelled";
})(REPORT_STATUS || (exports.REPORT_STATUS = REPORT_STATUS = {}));
var RECOVERY_METHOD;
(function (RECOVERY_METHOD) {
    RECOVERY_METHOD["PASSENGER_PICKUP"] = "passenger_pickup";
    RECOVERY_METHOD["DRIVER_DELIVERY"] = "driver_delivery";
})(RECOVERY_METHOD || (exports.RECOVERY_METHOD = RECOVERY_METHOD = {}));
var FOUND_STATUS;
(function (FOUND_STATUS) {
    FOUND_STATUS["PENDING"] = "pending";
    FOUND_STATUS["FOUND"] = "found";
    FOUND_STATUS["NOT_FOUND"] = "not_found";
})(FOUND_STATUS || (exports.FOUND_STATUS = FOUND_STATUS = {}));
var PAYMENT_STATUS;
(function (PAYMENT_STATUS) {
    PAYMENT_STATUS["NOT_REQUIRED"] = "not_required";
    PAYMENT_STATUS["PENDING"] = "pending";
    PAYMENT_STATUS["PAID"] = "paid";
    PAYMENT_STATUS["FAILED"] = "failed";
    PAYMENT_STATUS["REFUNDED"] = "refunded";
})(PAYMENT_STATUS || (exports.PAYMENT_STATUS = PAYMENT_STATUS = {}));
var ITEM_NOT_FOUND_REASON;
(function (ITEM_NOT_FOUND_REASON) {
    ITEM_NOT_FOUND_REASON["NOT_IN_VEHICLE"] = "not_in_vehicle";
    ITEM_NOT_FOUND_REASON["ALREADY_TAKEN"] = "already_taken";
    ITEM_NOT_FOUND_REASON["OTHER"] = "other";
})(ITEM_NOT_FOUND_REASON || (exports.ITEM_NOT_FOUND_REASON = ITEM_NOT_FOUND_REASON = {}));
