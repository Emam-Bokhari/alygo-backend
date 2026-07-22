import { StatusCodes } from "http-status-codes";
import { Holiday } from "./holiday.model";
import mongoose from "mongoose";
import { IHoliday } from "./holiday.interface";
import ApiError from "../../../errors/ApiErrors";
import { STATUS } from "../../../constants/status";

const createHolidayToDB = async (payload: IHoliday): Promise<IHoliday> => {
  const createHoliday = await Holiday.create(payload);
  if (!createHoliday) {
    throw new ApiError(400, "Failed to create holiday");
  }

  return createHoliday;
};

const getHolidayFromDB = async (
  holidayId: string,
): Promise<IHoliday | null> => {
  if (!mongoose.Types.ObjectId.isValid(holidayId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const holiday = await Holiday.findById(holidayId);
  if (!holiday) {
    throw new ApiError(404, "Holiday not found");
  }

  return holiday;
};

const getAllHolidayFromDB = async (): Promise<IHoliday[]> => {
  return await Holiday.find({});
};

const getActiveHolidayFromDB = async (): Promise<IHoliday[]> => {
  return await Holiday.find({ status: STATUS.ACTIVE });
};

const updateHolidayToDB = async (
  holidayId: string,
  payload: Partial<IHoliday>,
) => {
  if (!mongoose.Types.ObjectId.isValid(holidayId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isHolidayExist = await Holiday.findById(holidayId);

  if (!isHolidayExist) {
    throw new ApiError(404, "Holiday not found");
  }

  const holiday = await Holiday.findByIdAndUpdate(holidayId, payload, {
    new: true,
  });

  return holiday;
};

const updateHolidayStatusToDB = async (holidayId: string, status: STATUS) => {
  if (!Object.values(STATUS).includes(status)) {
    throw new Error("Invalid status value");
  }

  const holiday = await Holiday.findById(holidayId);

  if (!holiday) {
    throw new ApiError(404, "Holiday not found");
  }

  const result = await Holiday.findByIdAndUpdate(
    holidayId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteHolidayToDB = async (holidayId: string) => {
  const isHolidayExist = await Holiday.findById(holidayId);

  if (!isHolidayExist) {
    throw new ApiError(404, "Holiday not found");
  }

  const result = await Holiday.softDeleteById(holidayId);

  return result;
};

export const HolidayService = {
  createHolidayToDB,
  getHolidayFromDB,
  getAllHolidayFromDB,
  getActiveHolidayFromDB,
  updateHolidayToDB,
  deleteHolidayToDB,
  updateHolidayStatusToDB,
};
