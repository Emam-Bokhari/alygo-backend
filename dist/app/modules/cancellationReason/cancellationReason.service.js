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
exports.CancellationReasonServices = void 0;
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const cancellationReason_model_1 = require("./cancellationReason.model");
const status_1 = require("../../../constants/status");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const createCancellationReasonToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cancellationReason =
      yield cancellationReason_model_1.CancellationReason.create(payload);
    return cancellationReason;
  });
const getCancellationReasonFromDB = (cancellationReasonId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cancellationReason =
      yield cancellationReason_model_1.CancellationReason.findById(
        cancellationReasonId,
      );
    if (!cancellationReason) {
      throw new ApiErrors_1.default(404, "Cancellation reason not found");
    }
    return cancellationReason;
  });
const getAllCancellationReasonsFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cancellationReasonQuery = new queryBuilder_1.default(
      cancellationReason_model_1.CancellationReason.find(),
      query,
    )
      .search(["reasonName", "description"])
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield cancellationReasonQuery.modelQuery;
    const meta = yield cancellationReasonQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const getActiveCancellationReasonsFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const cancellationReasonQuery = new queryBuilder_1.default(
      cancellationReason_model_1.CancellationReason.find({
        status: status_1.STATUS.ACTIVE,
      }),
      query,
    )
      .search(["reasonName", "description"])
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield cancellationReasonQuery.modelQuery;
    const meta = yield cancellationReasonQuery.countTotal();
    return {
      data: result,
      meta,
    };
  });
const updateCancellationReasonFromDB = (cancellationReasonId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const updatedCancellationReason =
      yield cancellationReason_model_1.CancellationReason.findByIdAndUpdate(
        cancellationReasonId,
        payload,
        { new: true, runValidators: true },
      );
    if (!updatedCancellationReason) {
      throw new ApiErrors_1.default(404, "Cancellation reason not found");
    }
    return updatedCancellationReason;
  });
const deleteCancellationReasonFromDB = (cancellationReasonId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const deletedCancellationReason =
      yield cancellationReason_model_1.CancellationReason.softDeleteById(
        cancellationReasonId,
      );
    if (!deletedCancellationReason) {
      throw new ApiErrors_1.default(404, "Cancellation reason not found");
    }
    return deletedCancellationReason;
  });
const updateCancellationReasonStatusFromDB = (cancellationReasonId, status) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (
      status !== status_1.STATUS.ACTIVE &&
      status !== status_1.STATUS.INACTIVE
    ) {
      throw new ApiErrors_1.default(
        400,
        "Status must be either 'ACTIVE' or 'INACTIVE'",
      );
    }
    const updatedCancellationReason =
      yield cancellationReason_model_1.CancellationReason.findByIdAndUpdate(
        cancellationReasonId,
        { status },
        { new: true, runValidators: true },
      );
    if (!updatedCancellationReason) {
      throw new ApiErrors_1.default(404, "Cancellation reason not found");
    }
    return updatedCancellationReason;
  });
exports.CancellationReasonServices = {
  createCancellationReasonToDB,
  getCancellationReasonFromDB,
  getAllCancellationReasonsFromDB,
  getActiveCancellationReasonsFromDB,
  updateCancellationReasonFromDB,
  deleteCancellationReasonFromDB,
  updateCancellationReasonStatusFromDB,
};
