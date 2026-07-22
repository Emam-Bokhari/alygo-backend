"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverRoutes = void 0;
const express_1 = __importDefault(require("express"));
const authHelper_1 = require("../../../helpers/authHelper");
const driver_controller_1 = require("./driver.controller");
const review_controller_1 = require("../review/review.controller");
const parseFileData_1 = require("../../middlewares/parseFileData");
const flieUploadHandler_1 = __importDefault(require("../../middlewares/flieUploadHandler"));
const router = express_1.default.Router();
router.get("/reservations", authHelper_1.isDriver, driver_controller_1.DriverController.getReservations);
router
    .route("/")
    .post(authHelper_1.isAuthenticated, (0, flieUploadHandler_1.default)(["drivingLicense", "liveSelfie", "taxDocuments"]), (0, parseFileData_1.parseFileData)({
    fieldName: "drivingLicense",
    mode: "single",
}, {
    fieldName: "liveSelfie",
    mode: "single",
}, {
    fieldName: "taxDocuments",
    mode: "multiple",
}), driver_controller_1.DriverController.createDriver)
    .patch(authHelper_1.isAuthenticated, (0, flieUploadHandler_1.default)(["drivingLicense", "liveSelfie", "taxDocuments"]), (0, parseFileData_1.parseFileData)({
    fieldName: "drivingLicense",
    mode: "single",
}, {
    fieldName: "liveSelfie",
    mode: "single",
}, {
    fieldName: "taxDocuments",
    mode: "multiple",
}), driver_controller_1.DriverController.updateDriver)
    .get(authHelper_1.isAuthenticated, driver_controller_1.DriverController.getDriverProfile);
router.get("/me/availability", authHelper_1.isAuthenticated, driver_controller_1.DriverController.getAvailability);
router.get("/:driverId/reviews", authHelper_1.isAuthenticated, review_controller_1.ReviewController.getDriverReviews);
router.get("/:driverId/review-summary", authHelper_1.isAuthenticated, review_controller_1.ReviewController.getDriverReviewSummary);
exports.DriverRoutes = router;
