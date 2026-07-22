import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TrackingServices } from "./tracking.service";

const getTrackingByRideId = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { rideId } = req.params;
  const result = await TrackingServices.getTrackingByRideId(userId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride tracking retrieved successfully",
    data: result,
  });
});

const createOrUpdateTracking = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result = await TrackingServices.createOrUpdateTracking(
      userId,
      req.body,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Ride tracking updated successfully",
      data: result,
    });
  },
);

export const TrackingController = {
  getTrackingByRideId,
  createOrUpdateTracking,
};
