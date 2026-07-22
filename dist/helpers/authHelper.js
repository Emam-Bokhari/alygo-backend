"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = exports.isSuperAdmin = exports.isAdmin = exports.isDriver = exports.isUser = void 0;
const auth_1 = __importDefault(require("../app/middlewares/auth"));
const user_1 = require("../enums/user");
exports.isUser = (0, auth_1.default)(user_1.USER_ROLES.USER);
exports.isDriver = (0, auth_1.default)(user_1.USER_ROLES.DRIVER);
exports.isAdmin = (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN);
exports.isSuperAdmin = (0, auth_1.default)(user_1.USER_ROLES.SUPER_ADMIN);
exports.isAuthenticated = (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.DRIVER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN);
