import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getSummaryFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Dashboard summary retrieved successfully",
    data: result,
  });
});

const getRevenueChart = catchAsync(async (req: Request, res: Response) => {
  const range = (req.query.range as string) || "week";
  const result = await DashboardService.getRevenueChartFromDB(range);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Revenue trend chart data retrieved successfully",
    data: result,
  });
});

const getDemandChart = catchAsync(async (req: Request, res: Response) => {
  const range = (req.query.range as string) || "today";
  const result = await DashboardService.getDemandChartFromDB(range);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Demand trend chart data retrieved successfully",
    data: result,
  });
});

const getDriverGrowth = catchAsync(async (req: Request, res: Response) => {
  const range = (req.query.range as string) || "12months";
  const serviceAreaId = req.query.serviceAreaId as string;
  const result = await DashboardService.getDriverGrowthFromDB(range, serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver growth chart data retrieved successfully",
    data: result,
  });
});

const getPassengerGrowth = catchAsync(async (req: Request, res: Response) => {
  const range = (req.query.range as string) || "12months";
  const serviceAreaId = req.query.serviceAreaId as string;
  const result = await DashboardService.getPassengerGrowthFromDB(range, serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Passenger growth chart data retrieved successfully",
    data: result,
  });
});

const getCategoryUsage = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getCategoryUsageFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Category usage distribution retrieved successfully",
    data: result,
  });
});

const getTopCities = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const range = req.query.range as string;
  const serviceAreaId = req.query.serviceAreaId as string;
  const result = await DashboardService.getTopCitiesFromDB(limit, range, serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Top cities revenue data retrieved successfully",
    data: result,
  });
});

const getTopAirports = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const range = req.query.range as string;
  const serviceAreaId = req.query.serviceAreaId as string;
  const result = await DashboardService.getTopAirportsFromDB(limit, range, serviceAreaId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Top airports trip volume data retrieved successfully",
    data: result,
  });
});

export const DashboardController = {
  getSummary,
  getRevenueChart,
  getDemandChart,
  getDriverGrowth,
  getPassengerGrowth,
  getCategoryUsage,
  getTopCities,
  getTopAirports,
};
