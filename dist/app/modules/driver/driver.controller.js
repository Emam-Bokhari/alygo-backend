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
exports.DriverController = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const driver_service_1 = require("./driver.service");
const createDriver = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
      throw new ApiErrors_1.default(401, "User not authenticated");
    }
    const { id } = req.user;
    const result = yield driver_service_1.DriverServices.createDriverToDB(
      id,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 201,
      message: "Driver created successfully",
      data: result,
    });
  }),
);
const getDriverProfile = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driver_service_1.DriverServices.getDriverProfileFromDB(
      req.user.id,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Driver profile retrieved successfully",
      data: result,
    });
  }),
);
const updateDriver = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
      throw new ApiErrors_1.default(401, "User not authenticated");
    }
    const { id } = req.user;
    const result = yield driver_service_1.DriverServices.updateDriverFromDB(
      id,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Driver profile updated successfully",
      data: result,
    });
  }),
);
const getAvailability = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driver_service_1.DriverServices.getDriverAvailability(
      req.user.id,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Driver availability retrieved successfully",
      data: result,
    });
  }),
);
const getReservations = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield driver_service_1.DriverServices.getDriverReservationsFromDB(
        req.user.id,
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Driver reservations retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  }),
);
exports.DriverController = {
  createDriver,
  getDriverProfile,
  updateDriver,
  getAvailability,
  getReservations,
};
