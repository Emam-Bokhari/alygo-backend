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
exports.TierService = void 0;
const http_status_codes_1 = require("http-status-codes");
const tier_model_1 = require("./tier.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const queryBuilder_1 = __importDefault(
  require("../../../app/builder/queryBuilder"),
);
const createTierToDB = (payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Check if tier with same name, code, or level already exists
    const existingTier = yield tier_model_1.Tier.findOne({
      $or: [
        { name: payload.name },
        { code: payload.code },
        { level: payload.level },
      ],
    });
    if (existingTier) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.CONFLICT,
        "Tier with this name, code, or level already exists",
      );
    }
    const createTier = yield tier_model_1.Tier.create(payload);
    if (!createTier) {
      throw new ApiErrors_1.default(400, "Failed to create tier");
    }
    return createTier;
  });
const getAllTiersFromDB = (query) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name", "code"];
    const tiersQuery = new queryBuilder_1.default(
      tier_model_1.Tier.find({ isDeleted: false }),
      query,
    )
      .search(searchableFields)
      .filter()
      .sort()
      .paginate()
      .fields();
    const data = yield tiersQuery.modelQuery;
    const meta = yield tiersQuery.countTotal();
    return { data, meta };
  });
const getTierByIdFromDB = (tierId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(tierId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const tier = yield tier_model_1.Tier.findOne({
      _id: tierId,
      isDeleted: false,
    });
    if (!tier) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Tier not found",
      );
    }
    return tier;
  });
const updateTierToDB = (tierId, payload) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(tierId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isTierExist = yield tier_model_1.Tier.findOne({
      _id: tierId,
      isDeleted: false,
    });
    if (!isTierExist) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Tier not found",
      );
    }
    // Check if updating name, code, or level to a value that already exists
    const orConditions = [];
    if (payload.name) orConditions.push({ name: payload.name });
    if (payload.code) orConditions.push({ code: payload.code });
    if (payload.level) orConditions.push({ level: payload.level });
    if (orConditions.length > 0) {
      const existingTier = yield tier_model_1.Tier.findOne({
        _id: { $ne: tierId },
        $or: orConditions,
      });
      if (existingTier) {
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.CONFLICT,
          "Tier with this name, code, or level already exists",
        );
      }
    }
    const tier = yield tier_model_1.Tier.findByIdAndUpdate(tierId, payload, {
      new: true,
    });
    return tier;
  });
const deleteTierToDB = (tierId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(tierId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const isTierExist = yield tier_model_1.Tier.findOne({
      _id: tierId,
      isDeleted: false,
    });
    if (!isTierExist) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Tier not found",
      );
    }
    // Soft delete
    const tier = yield tier_model_1.Tier.softDeleteById(tierId);
    return tier;
  });
const updateTierStatusToDB = (tierId, status) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(tierId)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_ACCEPTABLE,
        "Invalid ID",
      );
    }
    const tier = yield tier_model_1.Tier.findOne({
      _id: tierId,
      isDeleted: false,
    });
    if (!tier) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        "Tier not found",
      );
    }
    const result = yield tier_model_1.Tier.findByIdAndUpdate(
      tierId,
      { status },
      { new: true },
    );
    if (!result) {
      throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
  });
exports.TierService = {
  createTierToDB,
  getAllTiersFromDB,
  getTierByIdFromDB,
  updateTierToDB,
  deleteTierToDB,
  updateTierStatusToDB,
};
