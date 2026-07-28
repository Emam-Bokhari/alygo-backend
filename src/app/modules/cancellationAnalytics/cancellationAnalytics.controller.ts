import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CancellationAnalyticsService } from "./cancellationAnalytics.service";
import { ICancellationAnalyticsQuery } from "./cancellationAnalytics.interface";

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const query: ICancellationAnalyticsQuery = {
    filter: (req.query.filter as any) || undefined,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    timezone: req.query.timezone as string,
    serviceAreaId: req.query.serviceAreaId as string,
    city: req.query.city as string,
    rideCategoryId: req.query.rideCategoryId as string,
  };

  const result = await CancellationAnalyticsService.getSummaryFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cancellation dashboard summary retrieved successfully",
    data: result,
  });
});

const getTrend = catchAsync(async (req: Request, res: Response) => {
  const query: ICancellationAnalyticsQuery = {
    filter: (req.query.filter as any) || undefined,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    timezone: req.query.timezone as string,
    serviceAreaId: req.query.serviceAreaId as string,
    city: req.query.city as string,
    rideCategoryId: req.query.rideCategoryId as string,
  };

  const result = await CancellationAnalyticsService.getTrendFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cancellation trend retrieved successfully",
    data: result,
  });
});

const getReasons = catchAsync(async (req: Request, res: Response) => {
  const query: ICancellationAnalyticsQuery = {
    filter: (req.query.filter as any) || undefined,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    timezone: req.query.timezone as string,
    serviceAreaId: req.query.serviceAreaId as string,
    city: req.query.city as string,
    rideCategoryId: req.query.rideCategoryId as string,
    limit: req.query.limit ? Number(req.query.limit) : 10,
  };

  const result = await CancellationAnalyticsService.getReasonsFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cancellation reasons retrieved successfully",
    data: result,
  });
});

const getCities = catchAsync(async (req: Request, res: Response) => {
  const query: ICancellationAnalyticsQuery = {
    filter: (req.query.filter as any) || undefined,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    timezone: req.query.timezone as string,
    serviceAreaId: req.query.serviceAreaId as string,
    city: req.query.city as string,
    rideCategoryId: req.query.rideCategoryId as string,
    limit: req.query.limit ? Number(req.query.limit) : 10,
  };

  const result = await CancellationAnalyticsService.getCitiesFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cancellation statistics by city retrieved successfully",
    data: result,
  });
});

const getCategories = catchAsync(async (req: Request, res: Response) => {
  const query: ICancellationAnalyticsQuery = {
    filter: (req.query.filter as any) || undefined,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    timezone: req.query.timezone as string,
    serviceAreaId: req.query.serviceAreaId as string,
    city: req.query.city as string,
    rideCategoryId: req.query.rideCategoryId as string,
    limit: req.query.limit ? Number(req.query.limit) : 10,
  };

  const result = await CancellationAnalyticsService.getCategoriesFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Cancellation statistics by ride category retrieved successfully",
    data: result,
  });
});

export const CancellationAnalyticsController = {
  getSummary,
  getTrend,
  getReasons,
  getCities,
  getCategories,
};
