"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostAndFoundItemCategoryService = void 0;
const http_status_codes_1 = require("http-status-codes");
const lostAndFoundItemCategory_model_1 = require("./lostAndFoundItemCategory.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const status_1 = require("../../../constants/status");
const createLostAndFoundItemCategoryToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createLostAndFoundItemCategory = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.create(payload);
    if (!createLostAndFoundItemCategory) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to create lost and found item category");
    }
    return createLostAndFoundItemCategory;
});
const getLostAndFoundItemCategoryFromDB = (lostAndFoundItemCategoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const result = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
    if (!result) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Lost and found item category not found");
    }
    return result;
});
const getAllLostAndFoundItemCategoriesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name"];
    const lostAndFoundItemCategoryQuery = new queryBuilder_1.default(lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.find(), query)
        .search(searchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield lostAndFoundItemCategoryQuery.modelQuery;
    const meta = yield lostAndFoundItemCategoryQuery.countTotal();
    return { data, meta };
});
const getActiveLostAndFoundItemCategoriesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["name"];
    const lostAndFoundItemCategoryQuery = new queryBuilder_1.default(lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.find({ status: status_1.STATUS.ACTIVE }), query)
        .search(searchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield lostAndFoundItemCategoryQuery.modelQuery;
    const meta = yield lostAndFoundItemCategoryQuery.countTotal();
    return { data, meta };
});
const updateLostAndFoundItemCategoryToDB = (lostAndFoundItemCategoryId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isLostAndFoundItemCategoryExist = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
    if (!isLostAndFoundItemCategoryExist) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Lost and found item category not found");
    }
    const lostAndFoundItemCategory = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findByIdAndUpdate(lostAndFoundItemCategoryId, payload, {
        new: true,
        runValidators: true,
    });
    if (!lostAndFoundItemCategory) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to update lost and found item category");
    }
    return lostAndFoundItemCategory;
});
const updateLostAndFoundItemCategoryStatusToDB = (lostAndFoundItemCategoryId, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (status !== status_1.STATUS.ACTIVE && status !== status_1.STATUS.INACTIVE) {
        throw new ApiErrors_1.default(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const lostAndFoundItemCategory = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
    if (!lostAndFoundItemCategory) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "No lost and found item category found in the database");
    }
    const result = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findByIdAndUpdate(lostAndFoundItemCategoryId, { status }, { new: true, runValidators: true });
    if (!result) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to update status");
    }
    return result;
});
const deleteLostAndFoundItemCategoryToDB = (lostAndFoundItemCategoryId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isLostAndFoundItemCategoryExist = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
    if (!isLostAndFoundItemCategoryExist) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Lost and found item category not found");
    }
    const result = yield lostAndFoundItemCategory_model_1.LostAndFoundItemCategory.softDeleteById(lostAndFoundItemCategoryId);
    return result;
});
exports.LostAndFoundItemCategoryService = {
    createLostAndFoundItemCategoryToDB,
    getLostAndFoundItemCategoryFromDB,
    getAllLostAndFoundItemCategoriesFromDB,
    getActiveLostAndFoundItemCategoriesFromDB,
    updateLostAndFoundItemCategoryToDB,
    deleteLostAndFoundItemCategoryToDB,
    updateLostAndFoundItemCategoryStatusToDB,
};
