"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RETURN_METHOD =
  exports.ITEM_NOT_FOUND_REASON =
  exports.LOST_AND_FOUND_STATUS =
    void 0;
var LOST_AND_FOUND_STATUS;
(function (LOST_AND_FOUND_STATUS) {
  LOST_AND_FOUND_STATUS["REPORTED"] = "reported";
  LOST_AND_FOUND_STATUS["DRIVER_REVIEWING"] = "driver_reviewing";
  LOST_AND_FOUND_STATUS["NOT_FOUND"] = "not_found";
  LOST_AND_FOUND_STATUS["FOUND"] = "found";
  LOST_AND_FOUND_STATUS["RETURN_SCHEDULED"] = "return_scheduled";
  LOST_AND_FOUND_STATUS["RETURN_CONFIRMED"] = "return_confirmed";
  LOST_AND_FOUND_STATUS["RETURNED"] = "returned";
})(
  LOST_AND_FOUND_STATUS ||
    (exports.LOST_AND_FOUND_STATUS = LOST_AND_FOUND_STATUS = {}),
);
var ITEM_NOT_FOUND_REASON;
(function (ITEM_NOT_FOUND_REASON) {
  ITEM_NOT_FOUND_REASON["NOT_IN_VEHICLE"] = "not_in_vehicle";
  ITEM_NOT_FOUND_REASON["ALREADY_TAKEN"] = "already_taken";
  ITEM_NOT_FOUND_REASON["OTHER"] = "other";
})(
  ITEM_NOT_FOUND_REASON ||
    (exports.ITEM_NOT_FOUND_REASON = ITEM_NOT_FOUND_REASON = {}),
);
var RETURN_METHOD;
(function (RETURN_METHOD) {
  RETURN_METHOD["PASSENGER_PICKUP"] = "passenger_pickup";
  RETURN_METHOD["DRIVER_DELIVERY"] = "driver_delivery";
})(RETURN_METHOD || (exports.RETURN_METHOD = RETURN_METHOD = {}));
