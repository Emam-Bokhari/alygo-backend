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
exports.HolidayController = void 0;
const holiday_service_1 = require("./holiday.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const holidayData = req.body;
    const result =
      yield holiday_service_1.HolidayService.createHolidayToDB(holidayData);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Holiday created successfully",
      data: result,
    });
  }),
);
const getHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { holidayId } = req.params;
    const result =
      yield holiday_service_1.HolidayService.getHolidayFromDB(holidayId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Holiday retrieved successfully",
      data: result,
    });
  }),
);
const getAllHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield holiday_service_1.HolidayService.getAllHolidayFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Holidays retrieved successfully",
      data: result,
    });
  }),
);
const getActiveHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield holiday_service_1.HolidayService.getActiveHolidayFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active holidays retrieved successfully",
      data: result,
    });
  }),
);
const updateHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const holidayId = req.params.holidayId;
    const updateData = req.body;
    const result = yield holiday_service_1.HolidayService.updateHolidayToDB(
      holidayId,
      updateData,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Holiday updated successfully",
      data: result,
    });
  }),
);
const updateHolidayStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { holidayId } = req.params;
    const { status } = req.body;
    const result =
      yield holiday_service_1.HolidayService.updateHolidayStatusToDB(
        holidayId,
        status,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Holiday status updated successfully",
      data: result,
    });
  }),
);
const deleteHoliday = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const holidayId = req.params.holidayId;
    const result =
      yield holiday_service_1.HolidayService.deleteHolidayToDB(holidayId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Holiday deleted successfully",
      data: result,
    });
  }),
);
exports.HolidayController = {
  createHoliday,
  getHoliday,
  getAllHoliday,
  getActiveHoliday,
  updateHoliday,
  deleteHoliday,
  updateHolidayStatus,
};
