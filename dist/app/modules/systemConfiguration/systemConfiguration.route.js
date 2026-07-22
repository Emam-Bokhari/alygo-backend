"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemConfigurationRoutes = void 0;
const express_1 = __importDefault(require("express"));
const systemConfiguration_controller_1 = require("./systemConfiguration.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
router
    .route("/")
    .get(authHelper_1.isAuthenticated, systemConfiguration_controller_1.SystemConfigurationController.getSystemConfiguration)
    .patch(authHelper_1.isAdmin, systemConfiguration_controller_1.SystemConfigurationController.createOrUpdateSystemConfiguration);
exports.SystemConfigurationRoutes = router;
