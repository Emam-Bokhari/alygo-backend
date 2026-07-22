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
exports.RideController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const ride_service_1 = require("./ride.service");
const pendingPayment_model_1 = require("../pendingPayment/pendingPayment.model");
const config_1 = __importDefault(require("../../../config"));
const estimateFareAndRoute = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield ride_service_1.RideServices.estimateFareAndRoute(
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Fare and route estimation calculated successfully",
      data: result,
    });
  }),
);
const requestRide = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield ride_service_1.RideServices.requestRide(
      userId,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.CREATED,
      success: true,
      message: "Ride request initiated successfully",
      data: result,
    });
  }),
);
const acceptRide = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.acceptRide(
      driverUserId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Ride request accepted successfully",
      data: result,
    });
  }),
);
const arriveAtPickup = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.arriveAtPickup(
      driverUserId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Driver arrival confirmed",
      data: result,
    });
  }),
);
const requestStartVerification = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.requestStartVerification(
      driverUserId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Start verification OTP sent to passenger",
      data: result,
    });
  }),
);
const verifyStart = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const result = yield ride_service_1.RideServices.startRide(
      driverUserId,
      rideId,
      req.body,
      ipAddress,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Ride started successfully",
      data: result,
    });
  }),
);
const requestEndVerification = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.requestEndVerification(
      driverUserId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "End verification OTP sent to passenger",
      data: result,
    });
  }),
);
const verifyEnd = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
    const result = yield ride_service_1.RideServices.completeRide(
      driverUserId,
      rideId,
      req.body,
      ipAddress,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Ride completed successfully",
      data: result,
    });
  }),
);
const confirmCashPayment = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.confirmCashPayment(
      driverUserId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cash payment confirmation registered successfully",
      data: result,
    });
  }),
);
const cancelRide = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = req.user.id;
    const role = req.user.role;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.cancelRide(
      userId,
      role,
      rideId,
      req.body,
    );
    const cancellation = result.cancellation;
    if (
      cancellation &&
      typeof cancellation.cancellationFee === "number" &&
      cancellation.cancellationFee > 0
    ) {
      const pendingPayment =
        yield pendingPayment_model_1.PendingPayment.findOne({
          rideId: result._id,
          status: "pending",
        });
      if (pendingPayment) {
        return (0, sendResponse_1.default)(res, {
          statusCode: http_status_codes_1.StatusCodes.OK,
          success: true,
          message: "Ride cancelled successfully",
          data: {
            ride: result,
            payment: {
              required: true,
              status: "pending",
              pendingPaymentId: pendingPayment._id.toString(),
              amount: pendingPayment.amount,
              currency:
                ((_a = config_1.default.stripe.currency) === null ||
                _a === void 0
                  ? void 0
                  : _a.toUpperCase()) || "USD",
              options: ["pay_now", "pay_later"],
            },
          },
        });
      }
    }
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Ride cancelled successfully",
      data: result,
    });
  }),
);
const getRideDetails = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.getRideDetails(
      userId,
      rideId,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Ride details retrieved successfully",
      data: result,
    });
  }),
);
const getActiveRide = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const role = req.user.role;
    const result = yield ride_service_1.RideServices.getActiveRide(
      userId,
      role,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: result ? "Active ride found" : "No active ride found",
      data: result,
    });
  }),
);
const addStops = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { id: rideId } = req.params;
    const result = yield ride_service_1.RideServices.addStopsDuringTrip(
      userId,
      rideId,
      req.body,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Stops added successfully. Route and fare have been updated.",
      data: result,
    });
  }),
);
const getDriverRideHistory = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driverUserId = req.user.id;
    const result = yield ride_service_1.RideServices.getDriverRideHistory(
      driverUserId,
      req.query,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Driver ride history retrieved successfully",
      pagination: result.pagination,
      data: result.data,
    });
  }),
);
exports.RideController = {
  estimateFareAndRoute,
  requestRide,
  acceptRide,
  arriveAtPickup,
  requestStartVerification,
  verifyStart,
  requestEndVerification,
  verifyEnd,
  confirmCashPayment,
  cancelRide,
  getRideDetails,
  getActiveRide,
  addStops,
  getDriverRideHistory,
};
