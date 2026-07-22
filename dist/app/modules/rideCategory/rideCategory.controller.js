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
exports.RideCategoryController = void 0;
const rideCategory_service_1 = require("./rideCategory.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createRideCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const rideCategoryData = req.body;
    const result = yield rideCategory_service_1.RideCategoryService.createRideCategoryToDB(rideCategoryData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride category created successfully",
        data: result,
    });
}));
const getRideCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideCategoryId } = req.params;
    const result = yield rideCategory_service_1.RideCategoryService.getRideCategoryFromDB(rideCategoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride category retrieved successfully",
        data: result,
    });
}));
const getAllRideCategories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield rideCategory_service_1.RideCategoryService.getAllRideCategoriesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getActiveRideCategories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield rideCategory_service_1.RideCategoryService.getActiveRideCategoriesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Active ride categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateRideCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideCategoryId } = req.params;
    const updateData = req.body;
    const result = yield rideCategory_service_1.RideCategoryService.updateRideCategoryToDB(rideCategoryId, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride category updated successfully",
        data: result,
    });
}));
const updateRideCategoryStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideCategoryId } = req.params;
    const { status } = req.body;
    const result = yield rideCategory_service_1.RideCategoryService.updateRideCategoryStatusToDB(rideCategoryId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride category status updated successfully",
        data: result,
    });
}));
const deleteRideCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { rideCategoryId } = req.params;
    const result = yield rideCategory_service_1.RideCategoryService.deleteRideCategoryToDB(rideCategoryId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Ride category deleted successfully",
        data: result,
    });
}));
exports.RideCategoryController = {
    createRideCategory,
    getRideCategory,
    getAllRideCategories,
    getActiveRideCategories,
    updateRideCategory,
    deleteRideCategory,
    updateRideCategoryStatus,
};
