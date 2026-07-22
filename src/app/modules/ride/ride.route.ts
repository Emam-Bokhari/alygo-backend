import express from "express";
import { RideController } from "./ride.controller";
import { RideValidations } from "./ride.validation";
import { TripReportController } from "../tripReport/tripReport.controller";
import { TripReportValidations } from "../tripReport/tripReport.validation";
import validateRequest from "../../middlewares/validateRequest";
import { isUser, isDriver, isAuthenticated } from "../../../helpers/authHelper";

const router = express.Router();

// Fare & route estimation
router.post(
  "/estimate",
  isAuthenticated,
  validateRequest(RideValidations.estimateRideZodSchema),
  RideController.estimateFareAndRoute,
);

// Get current active ride
router.get("/active", isAuthenticated, RideController.getActiveRide);

// Get driver ride history (Driver only)
router.get(
  "/driver/history",
  isDriver,
  validateRequest(RideValidations.driverRideHistoryQuerySchema),
  RideController.getDriverRideHistory,
);

// Get driver ride history details by ID (Driver only)
router.get(
  "/driver/history/:id",
  isDriver,
  RideController.getDriverRideHistoryDetails,
);

// Get user ride history (Passenger/User only)
router.get(
  "/user/history",
  isUser,
  validateRequest(RideValidations.userRideHistoryQuerySchema),
  RideController.getUserRideHistory,
);

// Get user ride history details by ID (Passenger/User only)
router.get(
  "/user/history/:id",
  isUser,
  RideController.getUserRideHistoryDetails,
);

// Get user reservation list (Passenger/User only)
router.get(
  "/user/reservations",
  isUser,
  validateRequest(RideValidations.getMyReservationsQuerySchema),
  RideController.getMyReservations,
);

// Get user reservation details by ID (Passenger/User only)
router.get(
  "/user/reservations/:id",
  isUser,
  RideController.getReservationDetails,
);

// Request ride (Passenger only)
router.post(
  "/",
  isUser,
  validateRequest(RideValidations.requestRideZodSchema),
  RideController.requestRide,
);

// Driver accepts ride request
router.post("/:id/accept", isDriver, RideController.acceptRide);

// Driver arrives at pickup
router.post("/:id/arrive", isDriver, RideController.arriveAtPickup);

// Driver requests start verification (generates OTP for passenger)
router.post(
  "/:id/request-start-verification",
  isDriver,
  RideController.requestStartVerification,
);

// Driver verifies and starts ride (using OTP or phone last 4 digits)
router.post(
  "/:id/verify-start",
  isDriver,
  validateRequest(RideValidations.verifyRideSecurityZodSchema),
  RideController.verifyStart,
);

// Driver requests end verification (generates OTP for passenger)
router.post(
  "/:id/request-end-verification",
  isDriver,
  RideController.requestEndVerification,
);

// Driver verifies and completes ride (using OTP or phone last 4 digits)
router.post(
  "/:id/verify-end",
  isDriver,
  validateRequest(RideValidations.verifyRideSecurityZodSchema),
  RideController.verifyEnd,
);

// Driver confirms cash collection
router.post("/:id/confirm-cash", isDriver, RideController.confirmCashPayment);

// Cancel ride
router.post(
  "/:id/cancel",
  isAuthenticated,
  validateRequest(RideValidations.cancelRideZodSchema),
  RideController.cancelRide,
);

// Get specific ride details
router.get("/:id", isAuthenticated, RideController.getRideDetails);

// Add stops during active trip (Passenger only)
router.post(
  "/:id/add-stops",
  isUser,
  validateRequest(RideValidations.addStopsZodSchema),
  RideController.addStops,
);

// Report a completed trip (Passenger only)
router.post(
  "/:rideId/report",
  isUser,
  validateRequest(TripReportValidations.createTripReportValidationSchema),
  TripReportController.createTripReport,
);

export const RideRoutes = router;
