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
exports.TripReportController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tripReport_service_1 = require("./tripReport.service");
const tripReport_validation_1 = require("./tripReport.validation");
/**
 * Create a trip report for a completed ride
 * Only the passenger (user) who took the ride can submit a report
 */
const createTripReport = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const reporterId = req.user.id;
    const { rideId } = req.params;
    yield tripReport_validation_1.TripReportValidations.createTripReportValidationSchema.parseAsync(
      {
        body: req.body,
      },
    );
    const result =
      yield tripReport_service_1.TripReportService.createTripReport(
        reporterId,
        rideId,
        req.body,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.CREATED,
      success: true,
      message: result.message,
      data: result.data,
    });
  }),
);
/**
 * Get all trip reports (Admin only)
 * Supports pagination, search, filtering, and sorting
 */
const getAllTripReports = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const filters = {
      page: req.query.page ? parseInt(req.query.page) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      status: req.query.status,
      issueId: req.query.issueId,
      driverId: req.query.driverId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      ticketId: req.query.ticketId,
      search: req.query.search,
    };
    const result =
      yield tripReport_service_1.TripReportService.getAllTripReports(filters);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Trip reports retrieved successfully",
      data: result.data,
      meta: {
        pagination: result.pagination,
      },
    });
  }),
);
/**
 * Get a single trip report by ID (Admin only)
 */
const getTripReportById = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { reportId } = req.params;
    const result =
      yield tripReport_service_1.TripReportService.getTripReportById(reportId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Trip report retrieved successfully",
      data: result.data,
    });
  }),
);
/**
 * Update a trip report (Admin only)
 * Allows updating status and resolution notes
 */
const updateTripReport = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const adminId = req.user.id;
    const { reportId } = req.params;
    yield tripReport_validation_1.TripReportValidations.updateTripReportValidationSchema.parseAsync(
      {
        body: req.body,
      },
    );
    const result =
      yield tripReport_service_1.TripReportService.updateTripReport(
        adminId,
        reportId,
        req.body,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: result.message,
      data: result.data,
    });
  }),
);
exports.TripReportController = {
  createTripReport,
  getAllTripReports,
  getTripReportById,
  updateTripReport,
};
