import { Request, Response } from "express";
import { RideCategoryService } from "./rideCategory.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createRideCategory = catchAsync(async (req: Request, res: Response) => {
  const rideCategoryData = req.body;
  const result =
    await RideCategoryService.createRideCategoryToDB(rideCategoryData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride category created successfully",
    data: result,
  });
});

const getRideCategory = catchAsync(async (req: Request, res: Response) => {
  const { rideCategoryId } = req.params;
  const result =
    await RideCategoryService.getRideCategoryFromDB(rideCategoryId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride category retrieved successfully",
    data: result,
  });
});

const getAllRideCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await RideCategoryService.getAllRideCategoriesFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride categories retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getActiveRideCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await RideCategoryService.getActiveRideCategoriesFromDB(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active ride categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateRideCategory = catchAsync(async (req: Request, res: Response) => {
  const { rideCategoryId } = req.params;
  const updateData = req.body;

  const result = await RideCategoryService.updateRideCategoryToDB(
    rideCategoryId,
    updateData,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride category updated successfully",
    data: result,
  });
});

const updateRideCategoryStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { rideCategoryId } = req.params;
    const { status } = req.body;
    const result = await RideCategoryService.updateRideCategoryStatusToDB(
      rideCategoryId,
      status,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Ride category status updated successfully",
      data: result,
    });
  },
);

const deleteRideCategory = catchAsync(async (req: Request, res: Response) => {
  const { rideCategoryId } = req.params;
  const result =
    await RideCategoryService.deleteRideCategoryToDB(rideCategoryId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride category deleted successfully",
    data: result,
  });
});

export const RideCategoryController = {
  createRideCategory,
  getRideCategory,
  getAllRideCategories,
  getActiveRideCategories,
  updateRideCategory,
  deleteRideCategory,
  updateRideCategoryStatus,
};
