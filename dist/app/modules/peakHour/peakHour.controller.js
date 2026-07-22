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
exports.PeakHourController = void 0;
const peakHour_service_1 = require("./peakHour.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createPeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const peakHourData = req.body;
    const result =
      yield peakHour_service_1.PeakHourService.createPeakHourToDB(peakHourData);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Peak hour created successfully",
      data: result,
    });
  }),
);
const getPeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { peakHourId } = req.params;
    const result =
      yield peakHour_service_1.PeakHourService.getPeakHourFromDB(peakHourId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Peak hour retrieved successfully",
      data: result,
    });
  }),
);
const getAllPeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield peakHour_service_1.PeakHourService.getAllPeakHourFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Peak hours retrieved successfully",
      data: result,
    });
  }),
);
const getActivePeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield peakHour_service_1.PeakHourService.getActivePeakHourFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active peak hours retrieved successfully",
      data: result,
    });
  }),
);
const updatePeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { peakHourId } = req.params;
    const updateData = req.body;
    const result = yield peakHour_service_1.PeakHourService.updatePeakHourToDB(
      peakHourId,
      updateData,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Peak hour updated successfully",
      data: result,
    });
  }),
);
const updatePeakHourStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { peakHourId } = req.params;
    const { status } = req.body;
    const result =
      yield peakHour_service_1.PeakHourService.updatePeakHourStatusToDB(
        peakHourId,
        status,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Peak hour status updated successfully",
      data: result,
    });
  }),
);
const deletePeakHour = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { peakHourId } = req.params;
    const result =
      yield peakHour_service_1.PeakHourService.deletePeakHourToDB(peakHourId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Peak hour deleted successfully",
      data: result,
    });
  }),
);
exports.PeakHourController = {
  createPeakHour,
  getPeakHour,
  getAllPeakHour,
  getActivePeakHour,
  updatePeakHour,
  deletePeakHour,
  updatePeakHourStatus,
};
