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
exports.ReportIssueCategoryService = void 0;
const http_status_codes_1 = require("http-status-codes");
const reportIssueCategory_model_1 = require("./reportIssueCategory.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const queryBuilder_1 = __importDefault(require("../../builder/queryBuilder"));
const status_1 = require("../../../constants/status");
const createReportIssueCategoryToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createCategory = yield reportIssueCategory_model_1.ReportIssueCategory.create(payload);
    if (!createCategory) {
        throw new ApiErrors_1.default(400, "Failed to create report issue category");
    }
    return createCategory;
});
const getAllReportIssueCategoriesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["issueName", "description"];
    const reportIssueCategoryQuery = new queryBuilder_1.default(reportIssueCategory_model_1.ReportIssueCategory.find(), query)
        .search(searchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield reportIssueCategoryQuery.modelQuery;
    const meta = yield reportIssueCategoryQuery.countTotal();
    return { data, meta };
});
const getActiveReportIssueCategoriesFromDB = (query) => __awaiter(void 0, void 0, void 0, function* () {
    const searchableFields = ["issueName", "description"];
    const reportIssueCategoryQuery = new queryBuilder_1.default(reportIssueCategory_model_1.ReportIssueCategory.find({ status: status_1.STATUS.ACTIVE }), query)
        .search(searchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const data = yield reportIssueCategoryQuery.modelQuery;
    const meta = yield reportIssueCategoryQuery.countTotal();
    return { data, meta };
});
const getReportIssueCategoryById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const category = yield reportIssueCategory_model_1.ReportIssueCategory.findById(id);
    if (!category) {
        throw new ApiErrors_1.default(404, "Report issue category not found");
    }
    return category;
});
const updateReportIssueCategoryToDB = (id, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isCategoryExist = yield reportIssueCategory_model_1.ReportIssueCategory.findById(id);
    if (!isCategoryExist) {
        throw new ApiErrors_1.default(404, "Report issue category not found");
    }
    const category = yield reportIssueCategory_model_1.ReportIssueCategory.findByIdAndUpdate(id, payload, {
        new: true,
    });
    return category;
});
const deleteReportIssueCategoryFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isCategoryExist = yield reportIssueCategory_model_1.ReportIssueCategory.findById(id);
    if (!isCategoryExist) {
        throw new ApiErrors_1.default(404, "Report issue category not found");
    }
    const result = yield reportIssueCategory_model_1.ReportIssueCategory.softDeleteById(id);
    return result;
});
const updateReportIssueCategoryStatusToDB = (id, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    // Validate status value
    if (!Object.values(status_1.STATUS).includes(status)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Invalid status value. Must be one of: ${Object.values(status_1.STATUS).join(", ")}`);
    }
    const isCategoryExist = yield reportIssueCategory_model_1.ReportIssueCategory.findById(id);
    if (!isCategoryExist) {
        throw new ApiErrors_1.default(404, "Report issue category not found");
    }
    const category = yield reportIssueCategory_model_1.ReportIssueCategory.findByIdAndUpdate(id, { status }, {
        new: true,
    });
    return category;
});
exports.ReportIssueCategoryService = {
    createReportIssueCategoryToDB,
    getAllReportIssueCategoriesFromDB,
    getActiveReportIssueCategoriesFromDB,
    getReportIssueCategoryById,
    updateReportIssueCategoryToDB,
    deleteReportIssueCategoryFromDB,
    updateReportIssueCategoryStatusToDB,
};
