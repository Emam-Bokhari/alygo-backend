import { StatusCodes } from "http-status-codes";
import { PeakHour } from "./peakHour.model";
import mongoose from "mongoose";
import { IPeakHour } from "./peakHour.interface";
import ApiError from "../../../errors/ApiErrors";
import { STATUS } from "../../../constants/status";

const createPeakHourToDB = async (payload: IPeakHour): Promise<IPeakHour> => {
  const createPeakHour = await PeakHour.create(payload);
  if (!createPeakHour) {
    throw new ApiError(400, "Failed to create peak hour");
  }

  return createPeakHour;
};

const getPeakHourFromDB = async (
  peakHourId: string,
): Promise<IPeakHour | null> => {
  if (!mongoose.Types.ObjectId.isValid(peakHourId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const peakHour = await PeakHour.findById(peakHourId);
  if (!peakHour) {
    throw new ApiError(404, "Peak hour not found");
  }

  return peakHour;
};

const getAllPeakHourFromDB = async (): Promise<IPeakHour[]> => {
  return await PeakHour.find({});
};

const getActivePeakHourFromDB = async (): Promise<IPeakHour[]> => {
  return await PeakHour.find({ status: STATUS.ACTIVE });
};

const updatePeakHourToDB = async (
  peakHourId: string,
  payload: Partial<IPeakHour>,
) => {
  if (!mongoose.Types.ObjectId.isValid(peakHourId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isPeakHourExist = await PeakHour.findById(peakHourId);

  if (!isPeakHourExist) {
    throw new ApiError(404, "Peak hour not found");
  }

  const peakHour = await PeakHour.findByIdAndUpdate(peakHourId, payload, {
    new: true,
  });

  return peakHour;
};

const updatePeakHourStatusToDB = async (peakHourId: string, status: STATUS) => {
  const peakHour = await PeakHour.findById(peakHourId);
  if (!peakHour) {
    throw new ApiError(404, "Peak hour not found");
  }

  const result = await PeakHour.findByIdAndUpdate(
    peakHourId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deletePeakHourToDB = async (peakHourId: string) => {
  const isPeakHourExist = await PeakHour.findById(peakHourId);

  if (!isPeakHourExist) {
    throw new ApiError(404, "Peak hour not found");
  }

  const result = await PeakHour.softDeleteById(peakHourId);

  return result;
};

export const PeakHourService = {
  createPeakHourToDB,
  getPeakHourFromDB,
  getAllPeakHourFromDB,
  getActivePeakHourFromDB,
  updatePeakHourToDB,
  deletePeakHourToDB,
  updatePeakHourStatusToDB,
};
