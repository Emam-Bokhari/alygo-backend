import { StatusCodes } from "http-status-codes";
import { ServiceCategory } from "./serviceCategory.model";
import unlinkFile from "../../../shared/unlinkFile";
import mongoose from "mongoose";
import { IServiceCategory } from "./serviceCategory.interface";
import ApiError from "../../../errors/ApiErrors";
import { STATUS } from "../../../constants/status";
import QueryBuilder from "../../builder/queryBuilder";

const createServiceCategoryToDB = async (
  payload: IServiceCategory,
): Promise<IServiceCategory> => {
  const createServiceCategory: any = await ServiceCategory.create(payload);
  if (!createServiceCategory) {
    if (payload.image) {
      unlinkFile(payload.image);
    }
    throw new ApiError(400, "Failed to create service category");
  }

  return createServiceCategory;
};

const getServiceCategoryFromDB = async (
  serviceCategoryId: string,
): Promise<IServiceCategory | null> => {
  if (!mongoose.Types.ObjectId.isValid(serviceCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const result = await ServiceCategory.findById(serviceCategoryId);
  return result;
};

const getAllServiceCategoryFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IServiceCategory[]; meta: any }> => {
  const searchableFields = ["name", "description"];
  const serviceCategoryQuery = new QueryBuilder(ServiceCategory.find(), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await serviceCategoryQuery.modelQuery;
  const meta = await serviceCategoryQuery.countTotal();

  return { data, meta };
};

const getActiveServiceCategoriesFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: IServiceCategory[]; meta: any }> => {
  const searchableFields = ["name", "description"];
  const serviceCategoryQuery = new QueryBuilder(
    ServiceCategory.find({ status: STATUS.ACTIVE }),
    query,
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await serviceCategoryQuery.modelQuery;
  const meta = await serviceCategoryQuery.countTotal();

  return { data, meta };
};

const updateServiceCategoryToDB = async (
  serviceCategoryId: string,
  payload: Partial<IServiceCategory>,
) => {
  if (!mongoose.Types.ObjectId.isValid(serviceCategoryId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isServiceCategoryExist: any =
    await ServiceCategory.findById(serviceCategoryId);

  if (!isServiceCategoryExist) {
    throw new ApiError(404, "Service category not found");
  }

  if (payload.image && isServiceCategoryExist.image) {
    unlinkFile(isServiceCategoryExist.image);
  }

  const serviceCategory: any = await ServiceCategory.findByIdAndUpdate(
    serviceCategoryId,
    payload,
    {
      new: true,
    },
  );

  return serviceCategory;
};

const updateServiceCategoryStatusToDB = async (
  serviceCategoryId: string,
  status: string,
) => {
  if (status !== STATUS.ACTIVE && status !== STATUS.INACTIVE) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const serviceCategory = await ServiceCategory.findById(serviceCategoryId);
  if (!serviceCategory) {
    throw new ApiError(404, "No service category found in the database");
  }

  const result = await ServiceCategory.findByIdAndUpdate(
    serviceCategoryId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteServiceCategoryToDB = async (serviceCategoryId: string) => {
  const isServiceCategoryExist: any = await ServiceCategory.findById({
    _id: serviceCategoryId,
  });

  if (isServiceCategoryExist) {
    unlinkFile(isServiceCategoryExist?.image);
  }

  const result = await ServiceCategory.softDeleteById(serviceCategoryId);

  return result;
};

export const ServiceCategoryService = {
  createServiceCategoryToDB,
  getServiceCategoryFromDB,
  getAllServiceCategoryFromDB,
  getActiveServiceCategoriesFromDB,
  updateServiceCategoryToDB,
  deleteServiceCategoryToDB,
  updateServiceCategoryStatusToDB,
};
