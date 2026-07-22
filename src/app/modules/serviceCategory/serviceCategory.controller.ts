import { Request, Response } from "express";
import { ServiceCategoryService } from "./serviceCategory.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createServiceCategory = catchAsync(async (req, res) => {
  const serviceCategoryData = req.body;
  const result =
    await ServiceCategoryService.createServiceCategoryToDB(serviceCategoryData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service category created successfully",
    data: result,
  });
});

const getServiceCategory = catchAsync(async (req: Request, res: Response) => {
  const { serviceCategoryId } = req.params;
  const result =
    await ServiceCategoryService.getServiceCategoryFromDB(serviceCategoryId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service category retrieved successfully",
    data: result,
  });
});

const getAllServiceCategory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ServiceCategoryService.getAllServiceCategoryFromDB(
      req.query,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Service categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getActiveServiceCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await ServiceCategoryService.getActiveServiceCategoriesFromDB(req.query);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active service categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateServiceCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { serviceCategoryId } = req.params;
    const updateData = req.body;

    const result = await ServiceCategoryService.updateServiceCategoryToDB(
      serviceCategoryId,
      updateData,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Service category updated successfully",
      data: result,
    });
  },
);

const updateServiceCategoryStatus = catchAsync(async (req, res) => {
  const { serviceCategoryId } = req.params;
  const { status } = req.body;
  const result = await ServiceCategoryService.updateServiceCategoryStatusToDB(
    serviceCategoryId,
    status,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service category status updated successfully",
    data: result,
  });
});

const deleteServiceCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { serviceCategoryId } = req.params;
    const result =
      await ServiceCategoryService.deleteServiceCategoryToDB(serviceCategoryId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Service category deleted successfully",
      data: result,
    });
  },
);

export const ServiceCategoryController = {
  createServiceCategory,
  getServiceCategory,
  getAllServiceCategory,
  getActiveServiceCategories,
  updateServiceCategory,
  deleteServiceCategory,
  updateServiceCategoryStatus,
};
