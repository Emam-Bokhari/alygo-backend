"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSettingsRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const platformSettings_controller_1 = require("./platformSettings.controller");
const router = express_1.default.Router();
router
    .route("/")
    .get(platformSettings_controller_1.PlatformSettingsController.getPlatformSettings)
    .patch(authHelper_1.isAdmin, platformSettings_controller_1.PlatformSettingsController.createOrUpdatePlatformSettings);
exports.PlatformSettingsRoutes = router;
