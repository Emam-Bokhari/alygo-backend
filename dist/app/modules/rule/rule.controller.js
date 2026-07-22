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
exports.RuleControllers = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const rule_service_1 = require("./rule.service");
const upsertRule = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type, content } = req.body;
    const { message, result } = yield rule_service_1.RuleServices.upsertRule(
      type,
      content,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message,
      data: result,
    });
  }),
);
const getRule = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const result = yield rule_service_1.RuleServices.getRuleByType(type);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} retrieved successfully`,
      data: result,
    });
  }),
);
const updateRule = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const { content } = req.body;
    const { message, result } = yield rule_service_1.RuleServices.updateRule(
      type,
      content,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message,
      data: result,
    });
  }),
);
const deleteRule = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { type } = req.params;
    const result = yield rule_service_1.RuleServices.deleteRule(type);
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: http_status_codes_1.StatusCodes.OK,
      message: "Successfully deleted",
      data: result,
    });
  }),
);
exports.RuleControllers = {
  upsertRule,
  getRule,
  updateRule,
  deleteRule,
};
