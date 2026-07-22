import { StatusCodes } from "http-status-codes";
import { FareConfiguration } from "./fareConfiguration.model";
import mongoose from "mongoose";
import { IFareConfiguration } from "./fareConfiguration.interface";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../../app/builder/queryBuilder";
import { STATUS } from "../../../constants/status";

const createFareConfigurationToDB = async (
  payload: IFareConfiguration,
): Promise<IFareConfiguration> => {
  const createFareConfiguration: any = await FareConfiguration.create(payload);
  if (!createFareConfiguration) {
    throw new ApiError(400, "Failed to create fare configuration");
  }

  return createFareConfiguration;
};

const getFareConfigurationFromDB = async (
  fareConfigurationId: string,
): Promise<IFareConfiguration | null> => {
  if (!mongoose.Types.ObjectId.isValid(fareConfigurationId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const result = await FareConfiguration.findById(fareConfigurationId);
  return result;
};

const getAllFareConfigurationFromDB = async (
  query: Record<string, unknown>,
) => {
  const fareConfigQuery = new QueryBuilder(
    FareConfiguration.find().populate(
      "serviceAreaId serviceCategoryId rideCategoryId createdBy",
    ),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await fareConfigQuery.modelQuery;
  const meta = await fareConfigQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getActiveFareConfigurationsFromDB = async (
  query: Record<string, unknown>,
) => {
  const fareConfigQuery = new QueryBuilder(
    FareConfiguration.find({ status: STATUS.ACTIVE }).populate(
      "serviceAreaId serviceCategoryId rideCategoryId",
    ),
    query,
  )
    .search([])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await fareConfigQuery.modelQuery;
  const meta = await fareConfigQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getFareConfigurationByCategoryFromDB = async (
  serviceCategoryId: string,
  rideCategoryId: string,
): Promise<IFareConfiguration | null> => {
  if (
    !mongoose.Types.ObjectId.isValid(serviceCategoryId) ||
    !mongoose.Types.ObjectId.isValid(rideCategoryId)
  ) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const result = await FareConfiguration.findOne({
    serviceCategoryId,
    rideCategoryId,
    status: STATUS.ACTIVE,
  }).populate("serviceAreaId serviceCategoryId rideCategoryId");
  return result;
};

const updateFareConfigurationToDB = async (
  fareConfigurationId: string,
  payload: Partial<IFareConfiguration>,
) => {
  if (!mongoose.Types.ObjectId.isValid(fareConfigurationId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isFareConfigurationExist: any =
    await FareConfiguration.findById(fareConfigurationId);

  if (!isFareConfigurationExist) {
    throw new ApiError(404, "Fare configuration not found");
  }

  const fareConfiguration: any = await FareConfiguration.findByIdAndUpdate(
    fareConfigurationId,
    payload,
    {
      new: true,
    },
  );

  return fareConfiguration;
};

const updateFareConfigurationStatusToDB = async (
  fareConfigurationId: string,
  status: string,
) => {
  if (status !== STATUS.ACTIVE && status !== STATUS.INACTIVE) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const fareConfiguration =
    await FareConfiguration.findById(fareConfigurationId);
  if (!fareConfiguration) {
    throw new ApiError(404, "No fare configuration found in the database");
  }

  const result = await FareConfiguration.findByIdAndUpdate(
    fareConfigurationId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

const deleteFareConfigurationToDB = async (fareConfigurationId: string) => {
  const isFareConfigurationExist: any = await FareConfiguration.findById({
    _id: fareConfigurationId,
  });

  if (!isFareConfigurationExist) {
    throw new ApiError(404, "Fare configuration not found");
  }

  const result = await FareConfiguration.softDeleteById(fareConfigurationId);

  return result;
};

export const FareConfigurationService = {
  createFareConfigurationToDB,
  getFareConfigurationFromDB,
  getAllFareConfigurationFromDB,
  getActiveFareConfigurationsFromDB,
  getFareConfigurationByCategoryFromDB,
  updateFareConfigurationToDB,
  deleteFareConfigurationToDB,
  updateFareConfigurationStatusToDB,
};
