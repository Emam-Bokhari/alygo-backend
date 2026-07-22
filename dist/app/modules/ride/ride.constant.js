"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RIDE_TYPE = exports.CANCELLED_BY = exports.PAYMENT_STATUS = exports.PAYMENT_METHOD = exports.VERIFICATION_METHOD = exports.DRIVER_MATCHING_STATUS = exports.RIDE_STATUS = void 0;
var RIDE_STATUS;
(function (RIDE_STATUS) {
    RIDE_STATUS["SEARCHING_DRIVER"] = "searching_driver";
    RIDE_STATUS["DRIVER_ACCEPTED"] = "driver_accepted";
    RIDE_STATUS["WAITING_USER_APPROVAL"] = "waiting_user_approval";
    RIDE_STATUS["DRIVER_ON_THE_WAY"] = "driver_on_the_way";
    RIDE_STATUS["DRIVER_ARRIVED"] = "driver_arrived";
    RIDE_STATUS["STARTED"] = "started";
    RIDE_STATUS["COMPLETED"] = "completed";
    RIDE_STATUS["CANCELLED"] = "cancelled";
    RIDE_STATUS["CANCELLED_BY_USER"] = "cancelled_by_user";
    RIDE_STATUS["CANCELLED_BY_DRIVER"] = "cancelled_by_driver";
    RIDE_STATUS["EXPIRED"] = "expired";
})(RIDE_STATUS || (exports.RIDE_STATUS = RIDE_STATUS = {}));
var DRIVER_MATCHING_STATUS;
(function (DRIVER_MATCHING_STATUS) {
    DRIVER_MATCHING_STATUS["SENT"] = "sent";
    DRIVER_MATCHING_STATUS["ACCEPTED"] = "accepted";
    DRIVER_MATCHING_STATUS["REJECTED"] = "rejected";
    DRIVER_MATCHING_STATUS["EXPIRED"] = "expired";
})(DRIVER_MATCHING_STATUS || (exports.DRIVER_MATCHING_STATUS = DRIVER_MATCHING_STATUS = {}));
var VERIFICATION_METHOD;
(function (VERIFICATION_METHOD) {
    VERIFICATION_METHOD["OTP"] = "otp";
    VERIFICATION_METHOD["PHONE_LAST_4_DIGITS"] = "phone_last_4_digits";
})(VERIFICATION_METHOD || (exports.VERIFICATION_METHOD = VERIFICATION_METHOD = {}));
var PAYMENT_METHOD;
(function (PAYMENT_METHOD) {
    PAYMENT_METHOD["STRIPE"] = "stripe";
    PAYMENT_METHOD["WALLET"] = "wallet";
    PAYMENT_METHOD["APPLE_PAY"] = "apple_pay";
    PAYMENT_METHOD["GOOGLE_PAY"] = "google_pay";
    PAYMENT_METHOD["CARD"] = "card";
})(PAYMENT_METHOD || (exports.PAYMENT_METHOD = PAYMENT_METHOD = {}));
var PAYMENT_STATUS;
(function (PAYMENT_STATUS) {
    PAYMENT_STATUS["PENDING"] = "pending";
    PAYMENT_STATUS["PAID"] = "paid";
    PAYMENT_STATUS["FAILED"] = "failed";
    PAYMENT_STATUS["REFUNDED"] = "refunded";
})(PAYMENT_STATUS || (exports.PAYMENT_STATUS = PAYMENT_STATUS = {}));
var CANCELLED_BY;
(function (CANCELLED_BY) {
    CANCELLED_BY["USER"] = "user";
    CANCELLED_BY["DRIVER"] = "driver";
    CANCELLED_BY["ADMIN"] = "admin";
})(CANCELLED_BY || (exports.CANCELLED_BY = CANCELLED_BY = {}));
var RIDE_TYPE;
(function (RIDE_TYPE) {
    RIDE_TYPE["INSTANT"] = "instant";
    RIDE_TYPE["SCHEDULED"] = "scheduled";
})(RIDE_TYPE || (exports.RIDE_TYPE = RIDE_TYPE = {}));
