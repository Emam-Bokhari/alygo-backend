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
exports.EventController = void 0;
const event_service_1 = require("./event.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const eventData = req.body;
    const result =
      yield event_service_1.EventService.createEventToDB(eventData);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Event created successfully",
      data: result,
    });
  }),
);
const getEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.params;
    const result = yield event_service_1.EventService.getEventFromDB(eventId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Event retrieved successfully",
      data: result,
    });
  }),
);
const getAllEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield event_service_1.EventService.getAllEventFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Events retrieved successfully",
      data: result,
    });
  }),
);
const getActiveEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const result = yield event_service_1.EventService.getActiveEventFromDB();
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Active events retrieved successfully",
      data: result,
    });
  }),
);
const updateEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.params;
    const updateData = req.body;
    const result = yield event_service_1.EventService.updateEventToDB(
      eventId,
      updateData,
    );
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Event updated successfully",
      data: result,
    });
  }),
);
const updateEventStatus = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.params;
    const { status } = req.body;
    const result = yield event_service_1.EventService.updateEventStatusToDB(
      eventId,
      status,
    );
    (0, sendResponse_1.default)(res, {
      success: true,
      statusCode: 200,
      message: "Event status updated successfully",
      data: result,
    });
  }),
);
const deleteEvent = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { eventId } = req.params;
    const result = yield event_service_1.EventService.deleteEventToDB(eventId);
    (0, sendResponse_1.default)(res, {
      statusCode: http_status_codes_1.StatusCodes.OK,
      success: true,
      message: "Event deleted successfully",
      data: result,
    });
  }),
);
exports.EventController = {
  createEvent,
  getEvent,
  getAllEvent,
  getActiveEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus,
};
