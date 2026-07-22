import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RecentDestinationServices } from "./recentDestination.service";

const getRecentDestinations = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result =
      await RecentDestinationServices.getRecentDestinations(userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Recent destinations retrieved successfully",
      data: result,
    });
  },
);

const deleteRecentDestination = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    await RecentDestinationServices.deleteRecentDestination(userId, id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Recent destination deleted successfully",
      data: null,
    });
  },
);

const clearAllRecentDestinations = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    await RecentDestinationServices.clearAllRecentDestinations(userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "All recent destinations cleared successfully",
      data: null,
    });
  },
);

export const RecentDestinationController = {
  getRecentDestinations,
  deleteRecentDestination,
  clearAllRecentDestinations,
};
