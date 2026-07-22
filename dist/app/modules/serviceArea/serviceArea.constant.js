"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_AREA_STATUS = exports.SERVICE_AREA_TYPE = void 0;
var SERVICE_AREA_TYPE;
(function (SERVICE_AREA_TYPE) {
    SERVICE_AREA_TYPE["STATE"] = "state";
    SERVICE_AREA_TYPE["CITY"] = "city";
    SERVICE_AREA_TYPE["ZONE"] = "zone";
    SERVICE_AREA_TYPE["AIRPORT"] = "airport";
    SERVICE_AREA_TYPE["COUNTRY"] = "country";
})(SERVICE_AREA_TYPE || (exports.SERVICE_AREA_TYPE = SERVICE_AREA_TYPE = {}));
var SERVICE_AREA_STATUS;
(function (SERVICE_AREA_STATUS) {
    SERVICE_AREA_STATUS["ACTIVE"] = "active";
    SERVICE_AREA_STATUS["INACTIVE"] = "inactive";
})(SERVICE_AREA_STATUS || (exports.SERVICE_AREA_STATUS = SERVICE_AREA_STATUS = {}));
