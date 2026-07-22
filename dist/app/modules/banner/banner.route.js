"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannerRoutes = void 0;
const express_1 = __importDefault(require("express"));
const banner_controller_1 = require("./banner.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const banner_validation_1 = require("./banner.validation");
const authHelper_1 = require("../../../helpers/authHelper");
const parseFileData_1 = require("../../middlewares/parseFileData");
const flieUploadHandler_1 = __importDefault(require("../../middlewares/flieUploadHandler"));
const router = express_1.default.Router();
router
    .route("/")
    .post(authHelper_1.isAdmin, (0, flieUploadHandler_1.default)(), (0, parseFileData_1.parseFileData)({
    fieldName: "image",
    mode: "single",
}), (0, validateRequest_1.default)(banner_validation_1.BannerZodValidation.createBannerValidationSchema), banner_controller_1.BannerController.createBanner)
    .get(banner_controller_1.BannerController.getBannersFromDB);
router.patch("/status/:id", authHelper_1.isAdmin, banner_controller_1.BannerController.updateBannerStatus);
router
    .route("/:id")
    .patch(authHelper_1.isAdmin, (0, flieUploadHandler_1.default)(), (0, parseFileData_1.parseFileData)({ fieldName: "image", mode: "single" }), banner_controller_1.BannerController.updateBanner)
    .delete(authHelper_1.isAdmin, banner_controller_1.BannerController.deleteBanner);
router.get("/all", authHelper_1.isAdmin, banner_controller_1.BannerController.getAllBanner);
exports.BannerRoutes = router;
