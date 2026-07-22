"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BROADCAST_STATUS = exports.BROADCAST_TARGET = exports.BROADCAST_TYPE = exports.BROADCAST_DELIVERY_TYPE = void 0;
var BROADCAST_DELIVERY_TYPE;
(function (BROADCAST_DELIVERY_TYPE) {
    BROADCAST_DELIVERY_TYPE["IMMEDIATE"] = "immediate";
    BROADCAST_DELIVERY_TYPE["SCHEDULED"] = "scheduled";
})(BROADCAST_DELIVERY_TYPE || (exports.BROADCAST_DELIVERY_TYPE = BROADCAST_DELIVERY_TYPE = {}));
var BROADCAST_TYPE;
(function (BROADCAST_TYPE) {
    BROADCAST_TYPE["SERVICE_ALERT"] = "service_alert";
    BROADCAST_TYPE["WEATHER_ALERT"] = "weather_alert";
    BROADCAST_TYPE["SURGE_OPPORTUNITY"] = "surge_opportunity";
    BROADCAST_TYPE["MAINTENANCE"] = "maintenance";
    BROADCAST_TYPE["AIRPORT_NOTICE"] = "airport_notice";
    BROADCAST_TYPE["EMERGENCY_ALERT"] = "emergency_alert";
    BROADCAST_TYPE["PLATFORM_UPDATE"] = "platform_update";
})(BROADCAST_TYPE || (exports.BROADCAST_TYPE = BROADCAST_TYPE = {}));
var BROADCAST_TARGET;
(function (BROADCAST_TARGET) {
    BROADCAST_TARGET["ALL_DRIVERS"] = "all_drivers";
    BROADCAST_TARGET["ALL_PASSENGERS"] = "all_passengers";
    BROADCAST_TARGET["BY_CITY"] = "by_city";
    BROADCAST_TARGET["BY_STATE"] = "by_state";
    BROADCAST_TARGET["BY_TIER"] = "by_tier";
})(BROADCAST_TARGET || (exports.BROADCAST_TARGET = BROADCAST_TARGET = {}));
var BROADCAST_STATUS;
(function (BROADCAST_STATUS) {
    BROADCAST_STATUS["PENDING"] = "pending";
    BROADCAST_STATUS["SCHEDULED"] = "scheduled";
    BROADCAST_STATUS["SENT"] = "sent";
})(BROADCAST_STATUS || (exports.BROADCAST_STATUS = BROADCAST_STATUS = {}));
