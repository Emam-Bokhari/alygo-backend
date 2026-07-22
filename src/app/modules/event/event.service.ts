import { StatusCodes } from "http-status-codes";
import { Event } from "./event.model";
import mongoose from "mongoose";
import { IEvent } from "./event.interface";
import ApiError from "../../../errors/ApiErrors";
import { STATUS } from "../../../constants/status";

const createEventToDB = async (payload: IEvent): Promise<IEvent> => {
  const createEvent = await Event.create(payload);
  if (!createEvent) {
    throw new ApiError(400, "Failed to create event");
  }

  return createEvent;
};

const getEventFromDB = async (eventId: string): Promise<IEvent | null> => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  return event;
};

const getAllEventFromDB = async (): Promise<IEvent[]> => {
  return await Event.find({});
};

const getActiveEventFromDB = async (): Promise<IEvent[]> => {
  return await Event.find({ status: STATUS.ACTIVE });
};

const updateEventToDB = async (eventId: string, payload: Partial<IEvent>) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isEventExist = await Event.findById(eventId);

  if (!isEventExist) {
    throw new ApiError(404, "Event not found");
  }

  const event = await Event.findByIdAndUpdate(eventId, payload, {
    new: true,
  });

  return event;
};

const updateEventStatusToDB = async (eventId: string, status: STATUS) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }

  const result = await Event.findByIdAndUpdate(
    eventId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteEventToDB = async (eventId: string) => {
  const isEventExist = await Event.findById(eventId);

  if (!isEventExist) {
    throw new ApiError(404, "Event not found");
  }

  const result = await Event.softDeleteById(eventId);

  return result;
};

export const EventService = {
  createEventToDB,
  getEventFromDB,
  getAllEventFromDB,
  getActiveEventFromDB,
  updateEventToDB,
  deleteEventToDB,
  updateEventStatusToDB,
};
