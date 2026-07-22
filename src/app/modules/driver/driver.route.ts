import express from "express";
import { isAuthenticated, isDriver } from "../../../helpers/authHelper";
import { DriverController } from "./driver.controller";
import { ReviewController } from "../review/review.controller";

import { parseFileData } from "../../middlewares/parseFileData";
import fileUploadHandler from "../../middlewares/flieUploadHandler";

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
