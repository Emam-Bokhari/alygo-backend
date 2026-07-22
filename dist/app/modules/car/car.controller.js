"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarController = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const car_service_1 = require("./car.service");
const createCar = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
      throw new ApiErrors_1.default(401, "User not authenticated");
    }
    const { id } = req.user;
    const result = yield car_service_1.CarServices.createCarToDB(id, req.body);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 201,
      message: "Car created successfully",
      data: result,
    });
  }),
);
const getCar = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { carId } = req.params;
    const result = yield car_service_1.CarServices.getCarFromDB(carId);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Car retrieved successfully",
      data: result,
    });
  }),
);
const getCarByDriver = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
      throw new ApiErrors_1.default(401, "User not authenticated");
    }
    const { id } = req.user;
    const result = yield car_service_1.CarServices.getCarByDriverFromDB(id);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Driver car retrieved successfully",
      data: result,
    });
  }),
);
const updateCar = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { carId } = req.params;
    const result = yield car_service_1.CarServices.updateCarFromDB(
      carId,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Car updated successfully",
      data: result,
    });
  }),
);
const deleteCar = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { carId } = req.params;
    const result = yield car_service_1.CarServices.deleteCarFromDB(carId);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Car deleted successfully",
      data: result,
    });
  }),
);
exports.CarController = {
  createCar,
  getCar,
  getCarByDriver,
  updateCar,
  deleteCar,
};
