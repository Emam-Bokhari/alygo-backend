import { Request, Response } from "express";
import { PlatformSettingsService } from "./platformSettings.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const getPlatformSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await PlatformSettingsService.getPlatformSettingsFromDB();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Platform settings retrieved successfully",
    data: result,
  });
});

const createOrUpdatePlatformSettings = catchAsync(
  async (req: Request, res: Response) => {
    const settingsData = req.body;
    const result =
      await PlatformSettingsService.createOrUpdatePlatformSettingsToDB(
        settingsData,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Platform settings updated successfully",
      data: result,
    });
  },
);

export const PlatformSettingsController = {
  getPlatformSettings,
  createOrUpdatePlatformSettings,
};
