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
exports.RecentDestinationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const recentDestination_service_1 = require("./recentDestination.service");
const getRecentDestinations = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result =
      yield recentDestination_service_1.RecentDestinationServices.getRecentDestinations(
        userId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Recent destinations retrieved successfully",
      data: result,
    });
  }),
);
const deleteRecentDestination = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { id } = req.params;
    yield recentDestination_service_1.RecentDestinationServices.deleteRecentDestination(
      userId,
      id,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Recent destination deleted successfully",
      data: null,
    });
  }),
);
const clearAllRecentDestinations = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    yield recentDestination_service_1.RecentDestinationServices.clearAllRecentDestinations(
      userId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "All recent destinations cleared successfully",
      data: null,
    });
  }),
);
exports.RecentDestinationController = {
  getRecentDestinations,
  deleteRecentDestination,
  clearAllRecentDestinations,
};
