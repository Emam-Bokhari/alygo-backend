import { Request, Response } from "express";
import { PeakHourService } from "./peakHour.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createPeakHour = catchAsync(async (req, res) => {
  const peakHourData = req.body;
  const result = await PeakHourService.createPeakHourToDB(peakHourData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Peak hour created successfully",
    data: result,
  });
});

const getPeakHour = catchAsync(async (req: Request, res: Response) => {
  const { peakHourId } = req.params;
  const result = await PeakHourService.getPeakHourFromDB(peakHourId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Peak hour retrieved successfully",
    data: result,
  });
});

const getAllPeakHour = catchAsync(async (req: Request, res: Response) => {
  const result = await PeakHourService.getAllPeakHourFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Peak hours retrieved successfully",
    data: result,
  });
});

const getActivePeakHour = catchAsync(async (req: Request, res: Response) => {
  const result = await PeakHourService.getActivePeakHourFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active peak hours retrieved successfully",
    data: result,
  });
});

const updatePeakHour = catchAsync(async (req: Request, res: Response) => {
  const { peakHourId } = req.params;
  const updateData = req.body;

  const result = await PeakHourService.updatePeakHourToDB(
    peakHourId,
    updateData,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Peak hour updated successfully",
    data: result,
  });
});

const updatePeakHourStatus = catchAsync(async (req, res) => {
  const { peakHourId } = req.params;
  const { status } = req.body;
  const result = await PeakHourService.updatePeakHourStatusToDB(
    peakHourId,
    status,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Peak hour status updated successfully",
    data: result,
  });
});

const deletePeakHour = catchAsync(async (req: Request, res: Response) => {
  const { peakHourId } = req.params;
  const result = await PeakHourService.deletePeakHourToDB(peakHourId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Peak hour deleted successfully",
    data: result,
  });
});

export const PeakHourController = {
  createPeakHour,
  getPeakHour,
  getAllPeakHour,
  getActivePeakHour,
  updatePeakHour,
  deletePeakHour,
  updatePeakHourStatus,
};
