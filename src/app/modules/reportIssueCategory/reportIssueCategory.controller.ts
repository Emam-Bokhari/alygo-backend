import { Request, Response } from "express";
import { ReportIssueCategoryService } from "./reportIssueCategory.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import { STATUS } from "../../../constants/status";

const createReportIssueCategory = catchAsync(async (req, res) => {
  const categoryData = req.body;
  const result =
    await ReportIssueCategoryService.createReportIssueCategoryToDB(
      categoryData,
    );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Report issue category created successfully",
    data: result,
  });
});

const getAllReportIssueCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await ReportIssueCategoryService.getAllReportIssueCategoriesFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Report issue categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getActiveReportIssueCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await ReportIssueCategoryService.getActiveReportIssueCategoriesFromDB(
        req.query,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Active report issue categories retrieved successfully",
      data: result.data,
      meta: result.meta,
    });
  },
);

const getReportIssueCategoryById = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.categoryId;
    const result =
      await ReportIssueCategoryService.getReportIssueCategoryById(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Report issue category retrieved successfully",
      data: result,
    });
  },
);

const updateReportIssueCategory = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.categoryId;
    const updateData = req.body;

    const result =
      await ReportIssueCategoryService.updateReportIssueCategoryToDB(
        id,
        updateData,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Report issue category updated successfully",
      data: result,
    });
  },
);

const deleteReportIssueCategory = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.categoryId;
    const result =
      await ReportIssueCategoryService.deleteReportIssueCategoryFromDB(id);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Report issue category deleted successfully",
      data: result,
    });
  },
);

const updateReportIssueCategoryStatus = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.categoryId;
    const { status } = req.body;

    const result =
      await ReportIssueCategoryService.updateReportIssueCategoryStatusToDB(
        id,
        status,
      );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Report issue category status updated successfully",
      data: result,
    });
  },
);

export const ReportIssueCategoryController = {
  createReportIssueCategory,
  getAllReportIssueCategories,
  getActiveReportIssueCategories,
  getReportIssueCategoryById,
  updateReportIssueCategory,
  deleteReportIssueCategory,
  updateReportIssueCategoryStatus,
};
