import { Request, Response } from "express";
import { HolidayService } from "./holiday.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createHoliday = catchAsync(async (req, res) => {
  const holidayData = req.body;
  const result = await HolidayService.createHolidayToDB(holidayData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Holiday created successfully",
    data: result,
  });
});

const getHoliday = catchAsync(async (req: Request, res: Response) => {
  const { holidayId } = req.params;
  const result = await HolidayService.getHolidayFromDB(holidayId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Holiday retrieved successfully",
    data: result,
  });
});

const getAllHoliday = catchAsync(async (req: Request, res: Response) => {
  const result = await HolidayService.getAllHolidayFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Holidays retrieved successfully",
    data: result,
  });
});

const getActiveHoliday = catchAsync(async (req: Request, res: Response) => {
  const result = await HolidayService.getActiveHolidayFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active holidays retrieved successfully",
    data: result,
  });
});

const updateHoliday = catchAsync(async (req: Request, res: Response) => {
  const holidayId = req.params.holidayId;
  const updateData = req.body;

  const result = await HolidayService.updateHolidayToDB(holidayId, updateData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Holiday updated successfully",
    data: result,
  });
});

const updateHolidayStatus = catchAsync(async (req, res) => {
  const { holidayId } = req.params;
  const { status } = req.body;
  const result = await HolidayService.updateHolidayStatusToDB(
    holidayId,
    status,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Holiday status updated successfully",
    data: result,
  });
});

const deleteHoliday = catchAsync(async (req: Request, res: Response) => {
  const holidayId = req.params.holidayId;
  const result = await HolidayService.deleteHolidayToDB(holidayId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Holiday deleted successfully",
    data: result,
  });
});

export const HolidayController = {
  createHoliday,
  getHoliday,
  getAllHoliday,
  getActiveHoliday,
  updateHoliday,
  deleteHoliday,
  updateHolidayStatus,
};
