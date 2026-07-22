import { Request, Response } from "express";
import { FareConfigurationService } from "./fareConfiguration.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createFareConfiguration = catchAsync(async (req, res) => {
  const fareConfigurationData = req.body;
  const result = await FareConfigurationService.createFareConfigurationToDB(
    fareConfigurationData,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Fare configuration created successfully",
    data: result,
  });
});

const getFareConfiguration = catchAsync(async (req: Request, res: Response) => {
  const { fareConfigurationId } = req.params;
  const result =
    await FareConfigurationService.getFareConfigurationFromDB(
      fareConfigurationId,
    );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Fare configuration retrieved successfully",
    data: result,
  });
});

const getAllFareConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const result = await FareConfigurationService.getAllFareConfigurationFromDB(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Fare configurations retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

const getActiveFareConfigurations = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await FareConfigurationService.getActiveFareConfigurationsFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active fare configurations retrieved successfully",
      data: result.result,
      meta: result.meta,
    });
  },
);

const getFareConfigurationByCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { serviceCategoryId, rideCategoryId } = req.params;
    const result =
      await FareConfigurationService.getFareConfigurationByCategoryFromDB(
        serviceCategoryId,
        rideCategoryId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Fare configuration retrieved successfully",
      data: result,
    });
  },
);

const updateFareConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const { fareConfigurationId } = req.params;
    const updateData = req.body;

    const result = await FareConfigurationService.updateFareConfigurationToDB(
      fareConfigurationId,
      updateData,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Fare configuration updated successfully",
      data: result,
    });
  },
);

const updateFareConfigurationStatus = catchAsync(async (req, res) => {
  const { fareConfigurationId } = req.params;
  const { status } = req.body;
  const result =
    await FareConfigurationService.updateFareConfigurationStatusToDB(
      fareConfigurationId,
      status,
    );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Fare configuration status updated successfully",
    data: result,
  });
});

const deleteFareConfiguration = catchAsync(
  async (req: Request, res: Response) => {
    const { fareConfigurationId } = req.params;
    const result =
      await FareConfigurationService.deleteFareConfigurationToDB(
        fareConfigurationId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Fare configuration deleted successfully",
      data: result,
    });
  },
);

export const FareConfigurationController = {
  createFareConfiguration,
  getFareConfiguration,
  getAllFareConfiguration,
  getActiveFareConfigurations,
  getFareConfigurationByCategory,
  updateFareConfiguration,
  deleteFareConfiguration,
  updateFareConfigurationStatus,
};
