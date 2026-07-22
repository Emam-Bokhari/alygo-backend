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
exports.CancellationPolicyController = void 0;
const cancellationPolicy_service_1 = require("./cancellationPolicy.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createCancellationPolicy = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cancellationPolicyData = req.body;
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.createCancellationPolicyToDB(
        cancellationPolicyData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cancellation policy created successfully",
      data: result,
    });
  }),
);
const getCancellationPolicy = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationPolicyId } = req.params;
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.getCancellationPolicyFromDB(
        cancellationPolicyId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cancellation policy retrieved successfully",
      data: result,
    });
  }),
);
const getAllCancellationPolicy = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.getAllCancellationPolicyFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cancellation policies retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const getActiveCancellationPolicies = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.getActiveCancellationPoliciesFromDB(
        req.query,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active cancellation policies retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  }),
);
const getCancellationPolicyByActorAndTrigger = (0, catchAsync_1.default)(
  (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const { actorType, triggerType } = req.params;
      const result =
        yield cancellationPolicy_service_1.CancellationPolicyService.getCancellationPolicyByActorAndTriggerFromDB(
          actorType,
          triggerType,
        );
      (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Cancellation policy retrieved successfully",
        data: result,
      });
    }),
);
const updateCancellationPolicy = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationPolicyId } = req.params;
    const updateData = req.body;
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.updateCancellationPolicyToDB(
        cancellationPolicyId,
        updateData,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cancellation policy updated successfully",
      data: result,
    });
  }),
);
const updateCancellationPolicyStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationPolicyId } = req.params;
    const { status } = req.body;
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.updateCancellationPolicyStatusToDB(
        cancellationPolicyId,
        status,
      );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Cancellation policy status updated successfully",
      data: result,
    });
  }),
);
const deleteCancellationPolicy = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationPolicyId } = req.params;
    const result =
      yield cancellationPolicy_service_1.CancellationPolicyService.deleteCancellationPolicyToDB(
        cancellationPolicyId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Cancellation policy deleted successfully",
      data: result,
    });
  }),
);
exports.CancellationPolicyController = {
  createCancellationPolicy,
  getCancellationPolicy,
  getAllCancellationPolicy,
  getActiveCancellationPolicies,
  getCancellationPolicyByActorAndTrigger,
  updateCancellationPolicy,
  deleteCancellationPolicy,
  updateCancellationPolicyStatus,
};
