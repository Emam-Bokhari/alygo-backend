import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DemandIntelligenceService } from "./demandIntelligence.service";

const getSummary = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await DemandIntelligenceService.getSummaryFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Demand intelligence summary retrieved successfully",
    data: result,
  });
});

const getZones = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await DemandIntelligenceService.getZonesFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Demand zones retrieved successfully",
    data: result,
  });
});

const getLiveMap = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await DemandIntelligenceService.getLiveMapFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Live operations map data retrieved successfully",
    data: result,
  });
});

const getUpcomingEvents = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await DemandIntelligenceService.getUpcomingEventsFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Upcoming events retrieved successfully",
    data: result,
  });
});

export const DemandIntelligenceController = {
  getSummary,
  getZones,
  getLiveMap,
  getUpcomingEvents,
};
