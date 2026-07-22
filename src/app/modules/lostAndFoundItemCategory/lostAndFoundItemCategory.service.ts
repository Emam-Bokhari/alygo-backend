import { StatusCodes } from "http-status-codes";
import { LostAndFoundItemCategory } from "./lostAndFoundItemCategory.model";
import mongoose from "mongoose";
import { ILostAndFoundItemCategory } from "./lostAndFoundItemCategory.interface";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { STATUS } from "../../../constants/status";

const createLostAndFoundItemCategoryToDB = async (
  payload: ILostAndFoundItemCategory,
): Promise<ILostAndFoundItemCategory> => {
  const createLostAndFoundItemCategory =
    await LostAndFoundItemCategory.create(payload);
  if (!createLostAndFoundItemCategory) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create lost and found item category",
    );
  }

  return createLostAndFoundItemCategory;
};

const getLostAndFoundItemCategoryFromDB = async (
  lostAndFoundItemCategoryId: string,
): Promise<ILostAndFoundItemCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const result = await LostAndFoundItemCategory.findById(
    lostAndFoundItemCategoryId,
  );
  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Lost and found item category not found",
    );
  }
  return result;
};

const getAllLostAndFoundItemCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ILostAndFoundItemCategory[]; meta: any }> => {
  const searchableFields = ["name"];

  const lostAndFoundItemCategoryQuery = new QueryBuilder(
    LostAndFoundItemCategory.find(),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await lostAndFoundItemCategoryQuery.modelQuery;
  const meta = await lostAndFoundItemCategoryQuery.countTotal();

  return { data, meta };
};

const getActiveLostAndFoundItemCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ILostAndFoundItemCategory[]; meta: any }> => {
  const searchableFields = ["name"];

  const lostAndFoundItemCategoryQuery = new QueryBuilder(
    LostAndFoundItemCategory.find({ status: STATUS.ACTIVE }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await lostAndFoundItemCategoryQuery.modelQuery;
  const meta = await lostAndFoundItemCategoryQuery.countTotal();

  return { data, meta };
};

const updateLostAndFoundItemCategoryToDB = async (
  lostAndFoundItemCategoryId: string,
  payload: Partial<ILostAndFoundItemCategory>,
): Promise<ILostAndFoundItemCategory> => {
  if (!mongoose.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isLostAndFoundItemCategoryExist =
    await LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
  if (!isLostAndFoundItemCategoryExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Lost and found item category not found",
    );
  }

  const lostAndFoundItemCategory =
    await LostAndFoundItemCategory.findByIdAndUpdate(
      lostAndFoundItemCategoryId,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

  if (!lostAndFoundItemCategory) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to update lost and found item category",
    );
  }

  return lostAndFoundItemCategory;
};

const updateLostAndFoundItemCategoryStatusToDB = async (
  lostAndFoundItemCategoryId: string,
  status: string,
): Promise<ILostAndFoundItemCategory> => {
  if (status !== STATUS.ACTIVE && status !== STATUS.INACTIVE) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  if (!mongoose.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const lostAndFoundItemCategory = await LostAndFoundItemCategory.findById(
    lostAndFoundItemCategoryId,
  );
  if (!lostAndFoundItemCategory) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No lost and found item category found in the database",
    );
  }

  const result = await LostAndFoundItemCategory.findByIdAndUpdate(
    lostAndFoundItemCategoryId,
    { status },
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update status");
  }

  return result;
};

const deleteLostAndFoundItemCategoryToDB = async (
  lostAndFoundItemCategoryId: string,
): Promise<ILostAndFoundItemCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(lostAndFoundItemCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isLostAndFoundItemCategoryExist =
    await LostAndFoundItemCategory.findById(lostAndFoundItemCategoryId);
  if (!isLostAndFoundItemCategoryExist) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Lost and found item category not found",
    );
  }

  const result = await LostAndFoundItemCategory.softDeleteById(
    lostAndFoundItemCategoryId,
  );
  return result;
};

export const LostAndFoundItemCategoryService = {
  createLostAndFoundItemCategoryToDB,
  getLostAndFoundItemCategoryFromDB,
  getAllLostAndFoundItemCategoriesFromDB,
  getActiveLostAndFoundItemCategoriesFromDB,
  updateLostAndFoundItemCategoryToDB,
  deleteLostAndFoundItemCategoryToDB,
  updateLostAndFoundItemCategoryStatusToDB,
};
