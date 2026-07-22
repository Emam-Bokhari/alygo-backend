import { Request, Response } from "express";
import { EventService } from "./event.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createEvent = catchAsync(async (req, res) => {
  const eventData = req.body;
  const result = await EventService.createEventToDB(eventData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Event created successfully",
    data: result,
  });
});

const getEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const result = await EventService.getEventFromDB(eventId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Event retrieved successfully",
    data: result,
  });
});

const getAllEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await EventService.getAllEventFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Events retrieved successfully",
    data: result,
  });
});

const getActiveEvent = catchAsync(async (req: Request, res: Response) => {
  const result = await EventService.getActiveEventFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active events retrieved successfully",
    data: result,
  });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const updateData = req.body;

  const result = await EventService.updateEventToDB(eventId, updateData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Event updated successfully",
    data: result,
  });
});

const updateEventStatus = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { status } = req.body;
  const result = await EventService.updateEventStatusToDB(eventId, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Event status updated successfully",
    data: result,
  });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const result = await EventService.deleteEventToDB(eventId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Event deleted successfully",
    data: result,
  });
});

export const EventController = {
  createEvent,
  getEvent,
  getAllEvent,
  getActiveEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus,
};
