import express from "express";
import { CarController } from "./car.controller";
import { isDriver } from "../../../helpers/authHelper";
import fileUploadHandler from "../../middlewares/flieUploadHandler";
import { parseFileData } from "../../middlewares/parseFileData";

const router = express.Router();

/* ---------------------------- CAR ROUTES ---------------------------- */
router
  .route("/")
  .post(
    isDriver,
    fileUploadHandler(),
    parseFileData(
      {
        fieldName: "vehicleLicense",
        mode: "single",
      },
      {
        fieldName: "personalAutoInsurance",
        mode: "single",
      },
      {
        fieldName: "insuranceHub",
        mode: "multiple",
      },
    ),
    CarController.createCar,
  )
  .get(isDriver, CarController.getCarByDriver);

router
  .route("/:carId")
  .get(isDriver, CarController.getCar)
  .patch(
    isDriver,
    fileUploadHandler(),
    parseFileData(
      {
        fieldName: "vehicleLicense",
        mode: "single",
      },
      {
        fieldName: "personalAutoInsurance",
        mode: "single",
      },
      {
        fieldName: "insuranceHub",
        mode: "multiple",
      },
    ),
    CarController.updateCar,
  )
  .delete(isDriver, CarController.deleteCar);

export const CarRoutes = router;
