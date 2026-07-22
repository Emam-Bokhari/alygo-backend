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
exports.ServiceCategoryService = void 0;
const http_status_codes_1 = require("http-status-codes");
const serviceCategory_model_1 = require("./serviceCategory.model");
const unlinkFile_1 = __importDefault(require("../../../shared/unlinkFile"));
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const status_1 = require("../../../constants/status");
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const createServiceCategoryToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const createServiceCategory =
      yield serviceCategory_model_1.ServiceCategory.create(payload);
    if (!createServiceCategory) {
      if (payload.image) {
        (0, unlinkFile_1.default)(payload.image);
      }
      throw new ApiErrors_1.default(400, "Failed to create service category");
    }
    return createServiceCategory;
  });
const getServiceCategoryFromDB = (serviceCategoryId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(serviceCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const result =
      yield serviceCategory_model_1.ServiceCategory.findById(serviceCategoryId);
    return result;
  });
const getAllServiceCategoryFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name", "description"];
    const serviceCategoryQuery = new queryBuilder_1.default(
      serviceCategory_model_1.ServiceCategory.find(),
      query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();
    const data = yield serviceCategoryQuery.modelQuery;
    const meta = yield serviceCategoryQuery.countTotal();
    return { data, meta };
  });
const getActiveServiceCategoriesFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name", "description"];
    const serviceCategoryQuery = new queryBuilder_1.default(
      serviceCategory_model_1.ServiceCategory.find({
        status: status_1.STATUS.ACTIVE,
      }),
      query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();
    const data = yield serviceCategoryQuery.modelQuery;
    const meta = yield serviceCategoryQuery.countTotal();
    return { data, meta };
  });
const updateServiceCategoryToDB = (serviceCategoryId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(serviceCategoryId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isServiceCategoryExist =
      yield serviceCategory_model_1.ServiceCategory.findById(serviceCategoryId);
    if (!isServiceCategoryExist) {
      throw new ApiErrors_1.default(404, "Service category not found");
    }
    if (payload.image && isServiceCategoryExist.image) {
      (0, unlinkFile_1.default)(isServiceCategoryExist.image);
    }
    const serviceCategory =
      yield serviceCategory_model_1.ServiceCategory.findByIdAndUpdate(
        serviceCategoryId,
        payload,
        {
          new: true,
        },
      );
    return serviceCategory;
  });
const updateServiceCategoryStatusToDB = (serviceCategoryId, status) =>
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
    const serviceCategory =
      yield serviceCategory_model_1.ServiceCategory.findById(serviceCategoryId);
    if (!serviceCategory) {
      throw new ApiErrors_1.default(
        404,
        "No service category found in the database",
      );
    }
    const result =
      yield serviceCategory_model_1.ServiceCategory.findByIdAndUpdate(
        serviceCategoryId,
        { status },
        { new: true },
      );
    if (!result) {
      throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
  });
const deleteServiceCategoryToDB = (serviceCategoryId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isServiceCategoryExist =
      yield serviceCategory_model_1.ServiceCategory.findById({
        _id: serviceCategoryId,
      });
    if (isServiceCategoryExist) {
      (0, unlinkFile_1.default)(
        isServiceCategoryExist === null || isServiceCategoryExist === void 0
          ? void 0
          : isServiceCategoryExist.image,
      );
    }
    const result =
      yield serviceCategory_model_1.ServiceCategory.softDeleteById(
        serviceCategoryId,
      );
    return result;
  });
exports.ServiceCategoryService = {
  createServiceCategoryToDB,
  getServiceCategoryFromDB,
  getAllServiceCategoryFromDB,
  getActiveServiceCategoriesFromDB,
  updateServiceCategoryToDB,
  deleteServiceCategoryToDB,
  updateServiceCategoryStatusToDB,
};
