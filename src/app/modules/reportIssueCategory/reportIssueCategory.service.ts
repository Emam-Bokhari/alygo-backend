import { StatusCodes } from "http-status-codes";
import { ReportIssueCategory } from "./reportIssueCategory.model";
import mongoose from "mongoose";
import { IReportIssueCategory } from "./reportIssueCategory.interface";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { STATUS } from "../../../constants/status";

const createReportIssueCategoryToDB = async (
  payload: IReportIssueCategory,
): Promise<IReportIssueCategory> => {
  const createCategory = await ReportIssueCategory.create(payload);
  if (!createCategory) {
    throw new ApiError(400, "Failed to create report issue category");
  }

  return createCategory;
};

const getAllReportIssueCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{
  data: IReportIssueCategory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const searchableFields = ["issueName", "description"];
  const reportIssueCategoryQuery = new QueryBuilder(
    ReportIssueCategory.find(),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await reportIssueCategoryQuery.modelQuery;
  const meta = await reportIssueCategoryQuery.countTotal();

  return { data, meta };
};

const getActiveReportIssueCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{
  data: IReportIssueCategory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  const searchableFields = ["issueName", "description"];
  const reportIssueCategoryQuery = new QueryBuilder(
    ReportIssueCategory.find({ status: STATUS.ACTIVE }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await reportIssueCategoryQuery.modelQuery;
  const meta = await reportIssueCategoryQuery.countTotal();

  return { data, meta };
};

const getReportIssueCategoryById = async (
  id: string,
): Promise<IReportIssueCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const category = await ReportIssueCategory.findById(id);
  if (!category) {
    throw new ApiError(404, "Report issue category not found");
  }

  return category;
};

const updateReportIssueCategoryToDB = async (
  id: string,
  payload: Partial<IReportIssueCategory>,
): Promise<IReportIssueCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isCategoryExist = await ReportIssueCategory.findById(id);
  if (!isCategoryExist) {
    throw new ApiError(404, "Report issue category not found");
  }

  const category = await ReportIssueCategory.findByIdAndUpdate(id, payload, {
    new: true,
  });

  return category;
};

const deleteReportIssueCategoryFromDB = async (
  id: string,
): Promise<IReportIssueCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isCategoryExist = await ReportIssueCategory.findById(id);
  if (!isCategoryExist) {
    throw new ApiError(404, "Report issue category not found");
  }

  const result = await ReportIssueCategory.softDeleteById(id);
  return result;
};

const updateReportIssueCategoryStatusToDB = async (
  id: string,
  status: STATUS,
): Promise<IReportIssueCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  // Validate status value
  if (!Object.values(STATUS).includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid status value. Must be one of: ${Object.values(STATUS).join(", ")}`,
    );
  }

  const isCategoryExist = await ReportIssueCategory.findById(id);
  if (!isCategoryExist) {
    throw new ApiError(404, "Report issue category not found");
  }

  const category = await ReportIssueCategory.findByIdAndUpdate(
    id,
    { status },
    {
      new: true,
    },
  );

  return category;
};

export const ReportIssueCategoryService = {
  createReportIssueCategoryToDB,
  getAllReportIssueCategoriesFromDB,
  getActiveReportIssueCategoriesFromDB,
  getReportIssueCategoryById,
  updateReportIssueCategoryToDB,
  deleteReportIssueCategoryFromDB,
  updateReportIssueCategoryStatusToDB,
};
