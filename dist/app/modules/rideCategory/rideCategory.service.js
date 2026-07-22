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
exports.RideCategoryService = void 0;
const http_status_codes_1 = require("http-status-codes");
const rideCategory_model_1 = require("./rideCategory.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const status_1 = require("../../../constants/status");
const createRideCategoryToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const createRideCategory =
      yield rideCategory_model_1.RideCategory.create(payload);
    if (!createRideCategory) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Failed to create ride category",
      );
    }
    return createRideCategory;
  });
const getRideCategoryFromDB = (rideCategoryId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(rideCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const result =
      yield rideCategory_model_1.RideCategory.findById(rideCategoryId).populate(
        "serviceCategoryId",
      );
    if (!result) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Ride category not found",
      );
    }
    return result;
  });
const getAllRideCategoriesFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name", "description"];
    const rideCategoryQuery = new queryBuilder_1.default(
      rideCategory_model_1.RideCategory.find().populate("serviceCategoryId"),
      query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();
    const data = yield rideCategoryQuery.modelQuery;
    const meta = yield rideCategoryQuery.countTotal();
    return { data, meta };
  });
const getActiveRideCategoriesFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name", "description"];
    const rideCategoryQuery = new queryBuilder_1.default(
      rideCategory_model_1.RideCategory.find({
        status: status_1.STATUS.ACTIVE,
      }).populate("serviceCategoryId"),
      query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();
    const data = yield rideCategoryQuery.modelQuery;
    const meta = yield rideCategoryQuery.countTotal();
    return { data, meta };
  });
const updateRideCategoryToDB = (rideCategoryId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(rideCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isRideCategoryExist =
      yield rideCategory_model_1.RideCategory.findById(rideCategoryId);
    if (!isRideCategoryExist) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Ride category not found",
      );
    }
    const rideCategory =
      yield rideCategory_model_1.RideCategory.findByIdAndUpdate(
        rideCategoryId,
        payload,
        {
          new: true,
          runValidators: true,
        },
      );
    if (!rideCategory) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Failed to update ride category",
      );
    }
    return rideCategory;
  });
const updateRideCategoryStatusToDB = (rideCategoryId, status) =>
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
    if (!mongoose_1.default.Types.ObjectId.isValid(rideCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const rideCategory =
      yield rideCategory_model_1.RideCategory.findById(rideCategoryId);
    if (!rideCategory) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "No ride category found in the database",
      );
    }
    const result = yield rideCategory_model_1.RideCategory.findByIdAndUpdate(
      rideCategoryId,
      { status },
      { new: true, runValidators: true },
    );
    if (!result) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "Failed to update status",
      );
    }
    return result;
  });
const deleteRideCategoryToDB = (rideCategoryId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(rideCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isRideCategoryExist =
      yield rideCategory_model_1.RideCategory.findById(rideCategoryId);
    if (!isRideCategoryExist) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Ride category not found",
      );
    }
    const result =
      yield rideCategory_model_1.RideCategory.softDeleteById(rideCategoryId);
    return result;
  });
exports.RideCategoryService = {
  createRideCategoryToDB,
  getRideCategoryFromDB,
  getAllRideCategoriesFromDB,
  getActiveRideCategoriesFromDB,
  updateRideCategoryToDB,
  deleteRideCategoryToDB,
  updateRideCategoryStatusToDB,
};
