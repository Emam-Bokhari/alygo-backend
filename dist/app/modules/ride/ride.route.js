"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideRoutes = void 0;
const express_1 = __importDefault(require("express"));
const ride_controller_1 = require("./ride.controller");
const ride_validation_1 = require("./ride.validation");
const tripReport_controller_1 = require("../tripReport/tripReport.controller");
const tripReport_validation_1 = require("../tripReport/tripReport.validation");
const validateRequest_1 = __importDefault(
  require("../../middlewares/validateRequest"),
);
const authHelper_1 = require("../../../helpers/authHelper");
const router = express_1.default.Router();
// Fare & route estimation
router.post(
  "/estimate",
  authHelper_1.isAuthenticated,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.estimateRideZodSchema,
  ),
  ride_controller_1.RideController.estimateFareAndRoute,
);
// Get current active ride
router.get(
  "/active",
  authHelper_1.isAuthenticated,
  ride_controller_1.RideController.getActiveRide,
);
// Get driver ride history (Driver only)
router.get(
  "/driver/history",
  authHelper_1.isDriver,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.driverRideHistoryQuerySchema,
  ),
  ride_controller_1.RideController.getDriverRideHistory,
);
// Request ride (Passenger only)
router.post(
  "/",
  authHelper_1.isUser,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.requestRideZodSchema,
  ),
  ride_controller_1.RideController.requestRide,
);
// Driver accepts ride request
router.post(
  "/:id/accept",
  authHelper_1.isDriver,
  ride_controller_1.RideController.acceptRide,
);
// Driver arrives at pickup
router.post(
  "/:id/arrive",
  authHelper_1.isDriver,
  ride_controller_1.RideController.arriveAtPickup,
);
// Driver requests start verification (generates OTP for passenger)
router.post(
  "/:id/request-start-verification",
  authHelper_1.isDriver,
  ride_controller_1.RideController.requestStartVerification,
);
// Driver verifies and starts ride (using OTP or phone last 4 digits)
router.post(
  "/:id/verify-start",
  authHelper_1.isDriver,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.verifyRideSecurityZodSchema,
  ),
  ride_controller_1.RideController.verifyStart,
);
// Driver requests end verification (generates OTP for passenger)
router.post(
  "/:id/request-end-verification",
  authHelper_1.isDriver,
  ride_controller_1.RideController.requestEndVerification,
);
// Driver verifies and completes ride (using OTP or phone last 4 digits)
router.post(
  "/:id/verify-end",
  authHelper_1.isDriver,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.verifyRideSecurityZodSchema,
  ),
  ride_controller_1.RideController.verifyEnd,
);
// Driver confirms cash collection
router.post(
  "/:id/confirm-cash",
  authHelper_1.isDriver,
  ride_controller_1.RideController.confirmCashPayment,
);
// Cancel ride
router.post(
  "/:id/cancel",
  authHelper_1.isAuthenticated,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.cancelRideZodSchema,
  ),
  ride_controller_1.RideController.cancelRide,
);
// Get specific ride details
router.get(
  "/:id",
  authHelper_1.isAuthenticated,
  ride_controller_1.RideController.getRideDetails,
);
// Add stops during active trip (Passenger only)
router.post(
  "/:id/add-stops",
  authHelper_1.isUser,
  (0, validateRequest_1.default)(
    ride_validation_1.RideValidations.addStopsZodSchema,
  ),
  ride_controller_1.RideController.addStops,
);
// Report a completed trip (Passenger only)
router.post(
  "/:rideId/report",
  authHelper_1.isUser,
  (0, validateRequest_1.default)(
    tripReport_validation_1.TripReportValidations
      .createTripReportValidationSchema,
  ),
  tripReport_controller_1.TripReportController.createTripReport,
);
exports.RideRoutes = router;
