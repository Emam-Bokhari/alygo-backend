import express from "express";
import { isAuthenticated, isDriver } from "../../../helpers/authHelper";
import { DriverController } from "./driver.controller";
import { ReviewController } from "../review/review.controller";
import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import validateRequest from "../../middlewares/validateRequest";
import { ReviewValidations } from "../review/review.validation";
import { DriverValidations } from "./driver.validation";

const router = express.Router();

router.get("/reservations", isDriver, DriverController.getReservations);

router
  .route("/")
  .post(
    isAuthenticated,
    fileUploadHandler([
      "profileImage",
      "liveSelfie",
      "ssnCard",
      "drivingLicense",
      "taxDocument",
    ]),
    parseFileData(
      { fieldName: "profileImage", mode: "single" },
      { fieldName: "liveSelfie", mode: "single" },
      { fieldName: "ssnCard", mode: "single" },
      { fieldName: "drivingLicense", mode: "single" },
      { fieldName: "taxDocument", mode: "single" },
    ),
    DriverController.createDriver,
  )
  .patch(
    isAuthenticated,
    fileUploadHandler([
      "profileImage",
      "liveSelfie",
      "ssnCard",
      "drivingLicense",
      "taxDocument",
    ]),
    parseFileData(
      { fieldName: "profileImage", mode: "single" },
      { fieldName: "liveSelfie", mode: "single" },
      { fieldName: "ssnCard", mode: "single" },
      { fieldName: "drivingLicense", mode: "single" },
      { fieldName: "taxDocument", mode: "single" },
    ),
    DriverController.updateDriver,
  )
  .get(isAuthenticated, DriverController.getDriverProfile);

router.get(
  "/me/availability",
  isAuthenticated,
  DriverController.getAvailability,
);

router.post(
  "/me/background-check",
  isAuthenticated,
  DriverController.initiateBackgroundCheck,
);

router.get(
  "/me/background-check/fee",
  isAuthenticated,
  DriverController.getBackgroundCheckFee,
);

router.post(
  "/me/background-check/payment-session",
  isAuthenticated,
  DriverController.createBackgroundCheckPaymentSession,
);

router.post(
  "/me/verify-selfie",
  isAuthenticated,
  fileUploadHandler(["liveSelfie"]),
  parseFileData({ fieldName: "liveSelfie", mode: "single" }),
  DriverController.verifySelfie,
);

router.get(
  "/me/performance-metrics",
  isDriver,
  DriverController.getPerformanceMetrics,
);

router.get("/me/driving-hours", isDriver, DriverController.getDrivingHours);

router.get(
  "/me/driving-hours/history",
  isDriver,
  validateRequest(DriverValidations.drivingHoursHistoryQueryValidationSchema),
  DriverController.getDrivingHoursHistory,
);

router.get(
  "/me/driving-hours/ledger",
  isDriver,
  validateRequest(DriverValidations.drivingHoursLedgerQueryValidationSchema),
  DriverController.getDrivingHoursLedger,
);

router.get(
  "/me/reviews",
  isDriver,
  validateRequest(ReviewValidations.driverReviewsQueryValidationSchema),
  ReviewController.getMyReviews,
);

router.get(
  "/me/reviews/summary",
  isDriver,
  ReviewController.getMyReviewSummary,
);

router.get(
  "/:driverId/reviews",
  isAuthenticated,
  ReviewController.getDriverReviews,
);
router.get(
  "/:driverId/review-summary",
  isAuthenticated,
  ReviewController.getDriverReviewSummary,
);

export const DriverRoutes = router;
