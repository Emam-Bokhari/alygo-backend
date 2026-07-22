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
exports.FareConfigurationService = void 0;
const http_status_codes_1 = require("http-status-codes");
const fareConfiguration_model_1 = require("./fareConfiguration.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const queryBuilder_1 = __importDefault(
  require("../../../app/builder/queryBuilder"),
);
const status_1 = require("../../../constants/status");
const createFareConfigurationToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const createFareConfiguration =
      yield fareConfiguration_model_1.FareConfiguration.create(payload);
    if (!createFareConfiguration) {
      throw new ApiErrors_1.default(400, "Failed to create fare configuration");
    }
    return createFareConfiguration;
  });
const getFareConfigurationFromDB = (fareConfigurationId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(fareConfigurationId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const result =
      yield fareConfiguration_model_1.FareConfiguration.findById(
        fareConfigurationId,
      );
    return result;
  });
const getAllFareConfigurationFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const fareConfigQuery = new queryBuilder_1.default(
      fareConfiguration_model_1.FareConfiguration.find().populate(
        "serviceAreaId serviceCategoryId rideCategoryId createdBy",
      ),
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield fareConfigQuery.modelQuery;
    const meta = yield fareConfigQuery.countTotal();
    return {
      meta,
      result,
    };
  });
const getActiveFareConfigurationsFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const fareConfigQuery = new queryBuilder_1.default(
      fareConfiguration_model_1.FareConfiguration.find({
        status: status_1.STATUS.ACTIVE,
      }).populate("serviceAreaId serviceCategoryId rideCategoryId"),
      query,
    )
      .search([])
      .filter()
      .sort()
      .paginate()
      .fields();
    const result = yield fareConfigQuery.modelQuery;
    const meta = yield fareConfigQuery.countTotal();
    return {
      meta,
      result,
    };
  });
const getFareConfigurationByCategoryFromDB = (
  serviceCategoryId,
  rideCategoryId,
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (
      !mongoose_1.default.Types.ObjectId.isValid(serviceCategoryId) ||
      !mongoose_1.default.Types.ObjectId.isValid(rideCategoryId)
    ) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const result = yield fareConfiguration_model_1.FareConfiguration.findOne({
      serviceCategoryId,
      rideCategoryId,
      status: status_1.STATUS.ACTIVE,
    }).populate("serviceAreaId serviceCategoryId rideCategoryId");
    return result;
  });
const updateFareConfigurationToDB = (fareConfigurationId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(fareConfigurationId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isFareConfigurationExist =
      yield fareConfiguration_model_1.FareConfiguration.findById(
        fareConfigurationId,
      );
    if (!isFareConfigurationExist) {
      throw new ApiErrors_1.default(404, "Fare configuration not found");
    }
    const fareConfiguration =
      yield fareConfiguration_model_1.FareConfiguration.findByIdAndUpdate(
        fareConfigurationId,
        payload,
        {
          new: true,
        },
      );
    return fareConfiguration;
  });
const updateFareConfigurationStatusToDB = (fareConfigurationId, status) =>
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
    const fareConfiguration =
      yield fareConfiguration_model_1.FareConfiguration.findById(
        fareConfigurationId,
      );
    if (!fareConfiguration) {
      throw new ApiErrors_1.default(
        404,
        "No fare configuration found in the database",
      );
    }
    const result =
      yield fareConfiguration_model_1.FareConfiguration.findByIdAndUpdate(
        fareConfigurationId,
        { status },
        { new: true },
      );
    if (!result) {
      throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
  });
const deleteFareConfigurationToDB = (fareConfigurationId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isFareConfigurationExist =
      yield fareConfiguration_model_1.FareConfiguration.findById({
        _id: fareConfigurationId,
      });
    if (!isFareConfigurationExist) {
      throw new ApiErrors_1.default(404, "Fare configuration not found");
    }
    const result =
      yield fareConfiguration_model_1.FareConfiguration.softDeleteById(
        fareConfigurationId,
      );
    return result;
  });
exports.FareConfigurationService = {
  createFareConfigurationToDB,
  getFareConfigurationFromDB,
  getAllFareConfigurationFromDB,
  getActiveFareConfigurationsFromDB,
  getFareConfigurationByCategoryFromDB,
  updateFareConfigurationToDB,
  deleteFareConfigurationToDB,
  updateFareConfigurationStatusToDB,
};
