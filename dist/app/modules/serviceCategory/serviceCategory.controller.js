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
exports.ServiceCategoryController = void 0;
const serviceCategory_service_1 = require("./serviceCategory.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createServiceCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const serviceCategoryData = req.body;
    const result = yield serviceCategory_service_1.ServiceCategoryService.createServiceCategoryToDB(serviceCategoryData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Service category created successfully",
        data: result,
    });
}));
const getServiceCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceCategoryId } = req.params;
    const result = yield serviceCategory_service_1.ServiceCategoryService.getServiceCategoryFromDB(serviceCategoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Service category retrieved successfully",
        data: result,
    });
}));
const getAllServiceCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield serviceCategory_service_1.ServiceCategoryService.getAllServiceCategoryFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Service categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getActiveServiceCategories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield serviceCategory_service_1.ServiceCategoryService.getActiveServiceCategoriesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Active service categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateServiceCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceCategoryId } = req.params;
    const updateData = req.body;
    const result = yield serviceCategory_service_1.ServiceCategoryService.updateServiceCategoryToDB(serviceCategoryId, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Service category updated successfully",
        data: result,
    });
}));
const updateServiceCategoryStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceCategoryId } = req.params;
    const { status } = req.body;
    const result = yield serviceCategory_service_1.ServiceCategoryService.updateServiceCategoryStatusToDB(serviceCategoryId, status);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Service category status updated successfully",
        data: result,
    });
}));
const deleteServiceCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceCategoryId } = req.params;
    const result = yield serviceCategory_service_1.ServiceCategoryService.deleteServiceCategoryToDB(serviceCategoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Service category deleted successfully",
        data: result,
    });
}));
exports.ServiceCategoryController = {
    createServiceCategory,
    getServiceCategory,
    getAllServiceCategory,
    getActiveServiceCategories,
    updateServiceCategory,
    deleteServiceCategory,
    updateServiceCategoryStatus,
};
