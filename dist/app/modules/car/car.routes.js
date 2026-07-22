"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarRoutes = void 0;
const express_1 = __importDefault(require("express"));
const car_controller_1 = require("./car.controller");
const authHelper_1 = require("../../../helpers/authHelper");
const flieUploadHandler_1 = __importDefault(
  require("../../middlewares/flieUploadHandler"),
);
const parseFileData_1 = require("../../middlewares/parseFileData");
const router = express_1.default.Router();
/* ---------------------------- CAR ROUTES ---------------------------- */
router
  .route("/")
  .post(
    authHelper_1.isDriver,
    (0, flieUploadHandler_1.default)(),
    (0, parseFileData_1.parseFileData)(
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
    car_controller_1.CarController.createCar,
  )
  .get(authHelper_1.isDriver, car_controller_1.CarController.getCarByDriver);
router
  .route("/:carId")
  .get(authHelper_1.isDriver, car_controller_1.CarController.getCar)
  .patch(
    authHelper_1.isDriver,
    (0, flieUploadHandler_1.default)(),
    (0, parseFileData_1.parseFileData)(
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
    car_controller_1.CarController.updateCar,
  )
  .delete(authHelper_1.isDriver, car_controller_1.CarController.deleteCar);
exports.CarRoutes = router;
