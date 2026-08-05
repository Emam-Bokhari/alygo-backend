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
    fileUploadHandler(["drivingLicense", "liveSelfie", "taxDocuments"]),
    parseFileData(
      {
        fieldName: "drivingLicense",
        mode: "single",
      },
      {
        fieldName: "liveSelfie",
        mode: "single",
      },
      {
        fieldName: "taxDocuments",
        mode: "multiple",
      },
    ),
    DriverController.createDriver,
  )
  .patch(
    isAuthenticated,
    fileUploadHandler(["drivingLicense", "liveSelfie", "taxDocuments"]),
    parseFileData(
      {
        fieldName: "drivingLicense",
        mode: "single",
      },
      {
        fieldName: "liveSelfie",
        mode: "single",
      },
      {
        fieldName: "taxDocuments",
        mode: "multiple",
      },
    ),
    DriverController.updateDriver,
  )
  .get(isAuthenticated, DriverController.getDriverProfile);

router.get(
  "/me/availability",
  isAuthenticated,
  DriverController.getAvailability,
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
