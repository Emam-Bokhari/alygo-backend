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
exports.PeakHourService = void 0;
const http_status_codes_1 = require("http-status-codes");
const peakHour_model_1 = require("./peakHour.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const status_1 = require("../../../constants/status");
const createPeakHourToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createPeakHour = yield peakHour_model_1.PeakHour.create(payload);
    if (!createPeakHour) {
        throw new ApiErrors_1.default(400, "Failed to create peak hour");
    }
    return createPeakHour;
});
const getPeakHourFromDB = (peakHourId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(peakHourId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const peakHour = yield peakHour_model_1.PeakHour.findById(peakHourId);
    if (!peakHour) {
        throw new ApiErrors_1.default(404, "Peak hour not found");
    }
    return peakHour;
});
const getAllPeakHourFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield peakHour_model_1.PeakHour.find({});
});
const getActivePeakHourFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield peakHour_model_1.PeakHour.find({ status: status_1.STATUS.ACTIVE });
});
const updatePeakHourToDB = (peakHourId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(peakHourId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isPeakHourExist = yield peakHour_model_1.PeakHour.findById(peakHourId);
    if (!isPeakHourExist) {
        throw new ApiErrors_1.default(404, "Peak hour not found");
    }
    const peakHour = yield peakHour_model_1.PeakHour.findByIdAndUpdate(peakHourId, payload, {
        new: true,
    });
    return peakHour;
});
const updatePeakHourStatusToDB = (peakHourId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const peakHour = yield peakHour_model_1.PeakHour.findById(peakHourId);
    if (!peakHour) {
        throw new ApiErrors_1.default(404, "Peak hour not found");
    }
    const result = yield peakHour_model_1.PeakHour.findByIdAndUpdate(peakHourId, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
});
const deletePeakHourToDB = (peakHourId) => __awaiter(void 0, void 0, void 0, function* () {
    const isPeakHourExist = yield peakHour_model_1.PeakHour.findById(peakHourId);
    if (!isPeakHourExist) {
        throw new ApiErrors_1.default(404, "Peak hour not found");
    }
    const result = yield peakHour_model_1.PeakHour.softDeleteById(peakHourId);
    return result;
});
exports.PeakHourService = {
    createPeakHourToDB,
    getPeakHourFromDB,
    getAllPeakHourFromDB,
    getActivePeakHourFromDB,
    updatePeakHourToDB,
    deletePeakHourToDB,
    updatePeakHourStatusToDB,
};
