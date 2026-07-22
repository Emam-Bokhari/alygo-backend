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
exports.EventService = void 0;
const http_status_codes_1 = require("http-status-codes");
const event_model_1 = require("./event.model");
const mongoose_1 = __importDefault(require("mongoose"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const status_1 = require("../../../constants/status");
const createEventToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const createEvent = yield event_model_1.Event.create(payload);
    if (!createEvent) {
        throw new ApiErrors_1.default(400, "Failed to create event");
    }
    return createEvent;
});
const getEventFromDB = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(eventId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const event = yield event_model_1.Event.findById(eventId);
    if (!event) {
        throw new ApiErrors_1.default(404, "Event not found");
    }
    return event;
});
const getAllEventFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield event_model_1.Event.find({});
});
const getActiveEventFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield event_model_1.Event.find({ status: status_1.STATUS.ACTIVE });
});
const updateEventToDB = (eventId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    if (!mongoose_1.default.Types.ObjectId.isValid(eventId)) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
    }
    const isEventExist = yield event_model_1.Event.findById(eventId);
    if (!isEventExist) {
        throw new ApiErrors_1.default(404, "Event not found");
    }
    const event = yield event_model_1.Event.findByIdAndUpdate(eventId, payload, {
        new: true,
    });
    return event;
});
const updateEventStatusToDB = (eventId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const event = yield event_model_1.Event.findById(eventId);
    if (!event) {
        throw new ApiErrors_1.default(404, "Event not found");
    }
    const result = yield event_model_1.Event.findByIdAndUpdate(eventId, { status }, { new: true });
    if (!result) {
        throw new ApiErrors_1.default(400, "Failed to update status");
    }
    return result;
});
const deleteEventToDB = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    const isEventExist = yield event_model_1.Event.findById(eventId);
    if (!isEventExist) {
        throw new ApiErrors_1.default(404, "Event not found");
    }
    const result = yield event_model_1.Event.softDeleteById(eventId);
    return result;
});
exports.EventService = {
    createEventToDB,
    getEventFromDB,
    getAllEventFromDB,
    getActiveEventFromDB,
    updateEventToDB,
    deleteEventToDB,
    updateEventStatusToDB,
};
