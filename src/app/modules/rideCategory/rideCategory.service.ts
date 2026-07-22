import { StatusCodes } from "http-status-codes";
import { RideCategory } from "./rideCategory.model";
import mongoose from "mongoose";
import { IRideCategory } from "./rideCategory.interface";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { STATUS } from "../../../constants/status";

const createRideCategoryToDB = async (
  payload: IRideCategory,
): Promise<IRideCategory> => {
  const createRideCategory = await RideCategory.create(payload);
  if (!createRideCategory) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create ride category",
    );
  }

  return createRideCategory;
};

const getRideCategoryFromDB = async (
  rideCategoryId: string,
): Promise<IRideCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(rideCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const result =
    await RideCategory.findById(rideCategoryId).populate("serviceCategoryId");
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride category not found");
  }
  return result;
};

const getAllRideCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IRideCategory[]; meta: any }> => {
  const searchableFields = ["name", "description"];

  const rideCategoryQuery = new QueryBuilder(
    RideCategory.find().populate("serviceCategoryId"),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await rideCategoryQuery.modelQuery;
  const meta = await rideCategoryQuery.countTotal();

  return { data, meta };
};

const getActiveRideCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IRideCategory[]; meta: any }> => {
  const searchableFields = ["name", "description"];

  const rideCategoryQuery = new QueryBuilder(
    RideCategory.find({ status: STATUS.ACTIVE }).populate("serviceCategoryId"),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await rideCategoryQuery.modelQuery;
  const meta = await rideCategoryQuery.countTotal();

  return { data, meta };
};

const updateRideCategoryToDB = async (
  rideCategoryId: string,
  payload: Partial<IRideCategory>,
): Promise<IRideCategory> => {
  if (!mongoose.Types.ObjectId.isValid(rideCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isRideCategoryExist = await RideCategory.findById(rideCategoryId);
  if (!isRideCategoryExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride category not found");
  }

  const rideCategory = await RideCategory.findByIdAndUpdate(
    rideCategoryId,
    payload,
    {
      new: true,
      runValidators: true,
    },
  );

  if (!rideCategory) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to update ride category",
    );
  }

  return rideCategory;
};

const updateRideCategoryStatusToDB = async (
  rideCategoryId: string,
  status: string,
): Promise<IRideCategory> => {
  if (status !== STATUS.ACTIVE && status !== STATUS.INACTIVE) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  if (!mongoose.Types.ObjectId.isValid(rideCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const rideCategory = await RideCategory.findById(rideCategoryId);
  if (!rideCategory) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "No ride category found in the database",
    );
  }

  const result = await RideCategory.findByIdAndUpdate(
    rideCategoryId,
    { status },
    { new: true, runValidators: true },
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update status");
  }

  return result;
};

const deleteRideCategoryToDB = async (
  rideCategoryId: string,
): Promise<IRideCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(rideCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isRideCategoryExist = await RideCategory.findById(rideCategoryId);
  if (!isRideCategoryExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride category not found");
  }

  const result = await RideCategory.softDeleteById(rideCategoryId);
  return result;
};

export const RideCategoryService = {
  createRideCategoryToDB,
  getRideCategoryFromDB,
  getAllRideCategoriesFromDB,
  getActiveRideCategoriesFromDB,
  updateRideCategoryToDB,
  deleteRideCategoryToDB,
  updateRideCategoryStatusToDB,
};
