import { Request, Response } from "express";
import { LostAndFoundItemCategoryService } from "./lostAndFoundItemCategory.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createLostAndFoundItemCategory = catchAsync(
  async (req: Request, res: Response) => {
    const lostAndFoundItemCategoryData = req.body;
    const result =
      await LostAndFoundItemCategoryService.createLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryData,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item category created successfully",
      data: result,
    });
  },
);

const getLostAndFoundItemCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { lostAndFoundItemCategoryId } = req.params;
    const result =
      await LostAndFoundItemCategoryService.getLostAndFoundItemCategoryFromDB(
        lostAndFoundItemCategoryId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item category retrieved successfully",
      data: result,
    });
  },
);

const getAllLostAndFoundItemCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await LostAndFoundItemCategoryService.getAllLostAndFoundItemCategoriesFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getActiveLostAndFoundItemCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await LostAndFoundItemCategoryService.getActiveLostAndFoundItemCategoriesFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active lost and found item categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const updateLostAndFoundItemCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { lostAndFoundItemCategoryId } = req.params;
    const updateData = req.body;

    const result =
      await LostAndFoundItemCategoryService.updateLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryId,
        updateData,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item category updated successfully",
      data: result,
    });
  },
);

const updateLostAndFoundItemCategoryStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { lostAndFoundItemCategoryId } = req.params;
    const { status } = req.body;
    const result =
      await LostAndFoundItemCategoryService.updateLostAndFoundItemCategoryStatusToDB(
        lostAndFoundItemCategoryId,
        status,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item category status updated successfully",
      data: result,
    });
  },
);

const deleteLostAndFoundItemCategory = catchAsync(
  async (req: Request, res: Response) => {
    const { lostAndFoundItemCategoryId } = req.params;
    const result =
      await LostAndFoundItemCategoryService.deleteLostAndFoundItemCategoryToDB(
        lostAndFoundItemCategoryId,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Lost and found item category deleted successfully",
      data: result,
    });
  },
);

export const LostAndFoundItemCategoryController = {
  createLostAndFoundItemCategory,
  getLostAndFoundItemCategory,
  getAllLostAndFoundItemCategories,
  getActiveLostAndFoundItemCategories,
  updateLostAndFoundItemCategory,
  deleteLostAndFoundItemCategory,
  updateLostAndFoundItemCategoryStatus,
};
