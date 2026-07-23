import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DestinationFilterService } from "./destinationFilter.service";

/**
 * Activate Destination Filter
 */
const activateFilter = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { destination, arrivalTime, radiusKm } = req.body;

  const result = await DestinationFilterService.activateFilter(
    driverUserId,
    destination,
    arrivalTime,
    radiusKm,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Destination filter activated successfully",
    data: result,
  });
});

/**
 * Cancel Destination Filter
 */
const cancelFilter = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;

  const result = await DestinationFilterService.cancelFilter(driverUserId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Destination filter cancelled successfully",
    data: result,
  });
});

/**
 * Get Destination Filter Status & Quota Details
 */
const getFilterStatus = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;

  const result = await DestinationFilterService.getFilterStatus(driverUserId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Destination filter status retrieved successfully",
    data: result,
  });
});

export const DestinationFilterController = {
  activateFilter,
  cancelFilter,
  getFilterStatus,
};
