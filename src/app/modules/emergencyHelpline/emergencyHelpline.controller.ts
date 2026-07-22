import { Request, Response } from "express";
import { EmergencyHelplineService } from "./emergencyHelpline.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const upsertEmergencyHelpline = catchAsync(
  async (req: Request, res: Response) => {
    const helplineData = req.body;
    const result =
      await EmergencyHelplineService.upsertEmergencyHelplineToDB(helplineData);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Emergency helpline updated successfully",
      data: result,
    });
  },
);

const getEmergencyHelpline = catchAsync(async (req: Request, res: Response) => {
  const result = await EmergencyHelplineService.getEmergencyHelplineFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Emergency helpline retrieved successfully",
    data: result,
  });
});

export const EmergencyHelplineController = {
  upsertEmergencyHelpline,
  getEmergencyHelpline,
};
