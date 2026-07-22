import { Request, Response } from "express";
import { SystemConfigurationService } from "./systemConfiguration.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const getSystemConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await SystemConfigurationService.getSystemConfigurationFromDB();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "System configuration retrieved successfully",
      data: result,
    });
  },
);

const createOrUpdateSystemConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const result =
      await SystemConfigurationService.createOrUpdateSystemConfigurationToDB(
        payload,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "System configuration updated successfully",
      data: result,
    });
  },
);

export const SystemConfigurationController = {
  getSystemConfiguration,
  createOrUpdateSystemConfiguration,
};
