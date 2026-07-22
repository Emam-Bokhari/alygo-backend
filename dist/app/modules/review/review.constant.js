"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_STATUS =
  exports.DRIVER_REVIEW_TAG =
  exports.PASSENGER_REVIEW_TAG =
    void 0;
var PASSENGER_REVIEW_TAG;
(function (PASSENGER_REVIEW_TAG) {
  PASSENGER_REVIEW_TAG["POLITE"] = "polite";
  PASSENGER_REVIEW_TAG["RESPECTFUL"] = "respectful";
  PASSENGER_REVIEW_TAG["FRIENDLY"] = "friendly";
  PASSENGER_REVIEW_TAG["SAFE_DRIVING"] = "safe_driving";
  PASSENGER_REVIEW_TAG["CLEAN_CAR"] = "clean_car";
  PASSENGER_REVIEW_TAG["COMFORTABLE_RIDE"] = "comfortable_ride";
  PASSENGER_REVIEW_TAG["PROFESSIONAL"] = "professional";
  PASSENGER_REVIEW_TAG["ON_TIME"] = "on_time";
})(
  PASSENGER_REVIEW_TAG ||
    (exports.PASSENGER_REVIEW_TAG = PASSENGER_REVIEW_TAG = {}),
);
var DRIVER_REVIEW_TAG;
(function (DRIVER_REVIEW_TAG) {
  DRIVER_REVIEW_TAG["POLITE"] = "polite";
  DRIVER_REVIEW_TAG["RESPECTFUL"] = "respectful";
  DRIVER_REVIEW_TAG["FRIENDLY"] = "friendly";
  DRIVER_REVIEW_TAG["ON_TIME"] = "on_time";
  DRIVER_REVIEW_TAG["EASY_COMMUNICATION"] = "easy_communication";
  DRIVER_REVIEW_TAG["GOOD_PASSENGER"] = "good_passenger";
})(DRIVER_REVIEW_TAG || (exports.DRIVER_REVIEW_TAG = DRIVER_REVIEW_TAG = {}));
var REVIEW_STATUS;
(function (REVIEW_STATUS) {
  REVIEW_STATUS["ACTIVE"] = "active";
  REVIEW_STATUS["HIDDEN"] = "hidden";
  REVIEW_STATUS["REPORTED"] = "reported";
})(REVIEW_STATUS || (exports.REVIEW_STATUS = REVIEW_STATUS = {}));
