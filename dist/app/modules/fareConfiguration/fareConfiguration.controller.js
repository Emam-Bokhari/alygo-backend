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
exports.FareConfigurationController = void 0;
const fareConfiguration_service_1 = require("./fareConfiguration.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createFareConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const fareConfigurationData = req.body;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.createFareConfigurationToDB(
        fareConfigurationData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configuration created successfully",
      data: result,
    });
  }),
);
const getFareConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { fareConfigurationId } = req.params;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.getFareConfigurationFromDB(
        fareConfigurationId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configuration retrieved successfully",
      data: result,
    });
  }),
);
const getAllFareConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.getAllFareConfigurationFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configurations retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const getActiveFareConfigurations = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.getActiveFareConfigurationsFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active fare configurations retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const getFareConfigurationByCategory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { serviceCategoryId, rideCategoryId } = req.params;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.getFareConfigurationByCategoryFromDB(
        serviceCategoryId,
        rideCategoryId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configuration retrieved successfully",
      data: result,
    });
  }),
);
const updateFareConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { fareConfigurationId } = req.params;
    const updateData = req.body;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.updateFareConfigurationToDB(
        fareConfigurationId,
        updateData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configuration updated successfully",
      data: result,
    });
  }),
);
const updateFareConfigurationStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { fareConfigurationId } = req.params;
    const { status } = req.body;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.updateFareConfigurationStatusToDB(
        fareConfigurationId,
        status,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Fare configuration status updated successfully",
      data: result,
    });
  }),
);
const deleteFareConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { fareConfigurationId } = req.params;
    const result =
      yield fareConfiguration_service_1.FareConfigurationService.deleteFareConfigurationToDB(
        fareConfigurationId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare configuration deleted successfully",
      data: result,
    });
  }),
);
exports.FareConfigurationController = {
  createFareConfiguration,
  getFareConfiguration,
  getAllFareConfiguration,
  getActiveFareConfigurations,
  getFareConfigurationByCategory,
  updateFareConfiguration,
  deleteFareConfiguration,
  updateFareConfigurationStatus,
};
