"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DRIVER_STATUS = exports.STATUS = exports.GENDER = exports.USER_ROLES = void 0;
var USER_ROLES;
(function (USER_ROLES) {
    USER_ROLES["ADMIN"] = "admin";
    USER_ROLES["SUPER_ADMIN"] = "superAdmin";
    USER_ROLES["USER"] = "user";
    USER_ROLES["DRIVER"] = "driver";
})(USER_ROLES || (exports.USER_ROLES = USER_ROLES = {}));
var GENDER;
(function (GENDER) {
    GENDER["MALE"] = "male";
    GENDER["FEMALE"] = "female";
})(GENDER || (exports.GENDER = GENDER = {}));
var STATUS;
(function (STATUS) {
    STATUS["ACTIVE"] = "active";
    STATUS["INACTIVE"] = "inactive";
})(STATUS || (exports.STATUS = STATUS = {}));
var DRIVER_STATUS;
(function (DRIVER_STATUS) {
    DRIVER_STATUS["NONE"] = "none";
    DRIVER_STATUS["PENDING"] = "pending";
    DRIVER_STATUS["APPROVED"] = "approved";
    DRIVER_STATUS["REJECTED"] = "rejected";
})(DRIVER_STATUS || (exports.DRIVER_STATUS = DRIVER_STATUS = {}));
