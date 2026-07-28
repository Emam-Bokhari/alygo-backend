import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { LiveTripsService } from "./liveTrips.service";
import { ILiveTripsQuery } from "./liveTrips.interface";

const getLiveTrips = catchAsync(async (req: Request, res: Response) => {
  const query: ILiveTripsQuery = {
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    searchTerm: req.query.searchTerm as string,
    status: req.query.status as any,
    rideCategoryId: req.query.rideCategoryId as string,
    driverId: req.query.driverId as string,
    passengerId: req.query.passengerId as string,
    city: req.query.city as string,
    serviceAreaId: req.query.serviceAreaId as string,
    rideType: req.query.rideType as any,
    startDate: req.query.startDate as string,
    endDate: req.query.endDate as string,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await LiveTripsService.getLiveTripsFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Live trips retrieved successfully",
    ...result,
  });
});

export const LiveTripsController = {
  getLiveTrips,
};
