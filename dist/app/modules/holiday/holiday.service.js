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
exports.HolidayService = void 0;
const http_status_codes_1 = require("http-status-codes");
const holiday_model_1 = require("./holiday.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const status_1 = require("../../../constants/status");
const createHolidayToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createHoliday = yield holiday_model_1.Holiday.create(payload);
    if (!createHoliday) {
        throw new ApiErrors_1.default(400, "Failed to create holiday");
    }
    return createHoliday;
});
const getHolidayFromDB = (holidayId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(holidayId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const holiday = yield holiday_model_1.Holiday.findById(holidayId);
    if (!holiday) {
        throw new ApiErrors_1.default(404, "Holiday not found");
    }
    return holiday;
});
const getAllHolidayFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield holiday_model_1.Holiday.find({});
});
const getActiveHolidayFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield holiday_model_1.Holiday.find({ status: status_1.STATUS.ACTIVE });
});
const updateHolidayToDB = (holidayId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(holidayId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isHolidayExist = yield holiday_model_1.Holiday.findById(holidayId);
    if (!isHolidayExist) {
        throw new ApiErrors_1.default(404, "Holiday not found");
    }
    const holiday = yield holiday_model_1.Holiday.findByIdAndUpdate(holidayId, payload, {
        new: true,
    });
    return holiday;
});
const updateHolidayStatusToDB = (holidayId, status) => __awaiter(void 0, void 0, void 0, function* () {
    if (!Object.values(status_1.STATUS).includes(status)) {
        throw new Error("Invalid status value");
    }
    const holiday = yield holiday_model_1.Holiday.findById(holidayId);
    if (!holiday) {
        throw new ApiErrors_1.default(404, "Holiday not found");
    }
    const result = yield holiday_model_1.Holiday.findByIdAndUpdate(holidayId, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
});
const deleteHolidayToDB = (holidayId) => __awaiter(void 0, void 0, void 0, function* () {
    const isHolidayExist = yield holiday_model_1.Holiday.findById(holidayId);
    if (!isHolidayExist) {
        throw new ApiErrors_1.default(404, "Holiday not found");
    }
    const result = yield holiday_model_1.Holiday.softDeleteById(holidayId);
    return result;
});
exports.HolidayService = {
    createHolidayToDB,
    getHolidayFromDB,
    getAllHolidayFromDB,
    getActiveHolidayFromDB,
    updateHolidayToDB,
    deleteHolidayToDB,
    updateHolidayStatusToDB,
};
