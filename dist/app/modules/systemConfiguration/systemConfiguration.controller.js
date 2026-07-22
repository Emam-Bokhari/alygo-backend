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
exports.SystemConfigurationController = void 0;
const systemConfiguration_service_1 = require("./systemConfiguration.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const systemConfigurationData = req.body;
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.createSystemConfigurationToDB(
        systemConfigurationData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "System configuration created successfully",
      data: result,
    });
  }),
);
const getSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { systemConfigurationId } = req.params;
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.getSystemConfigurationFromDB(
        systemConfigurationId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "System configuration retrieved successfully",
      data: result,
    });
  }),
);
const getAllSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.getAllSystemConfigurationFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "System configurations retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const getActiveSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.getActiveSystemConfigurationFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active system configuration retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const updateSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { systemConfigurationId } = req.params;
    const updateData = req.body;
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.updateSystemConfigurationToDB(
        systemConfigurationId,
        updateData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "System configuration updated successfully",
      data: result,
    });
  }),
);
const deleteSystemConfiguration = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { systemConfigurationId } = req.params;
    const result =
      yield systemConfiguration_service_1.SystemConfigurationService.deleteSystemConfigurationToDB(
        systemConfigurationId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "System configuration deleted successfully",
      data: result,
    });
  }),
);
exports.SystemConfigurationController = {
  createSystemConfiguration,
  getSystemConfiguration,
  getAllSystemConfiguration,
  getActiveSystemConfiguration,
  updateSystemConfiguration,
  deleteSystemConfiguration,
};
