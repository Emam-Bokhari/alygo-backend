import { StatusCodes } from "http-status-codes";
import { Tier } from "./tier.model";
import mongoose from "mongoose";
import { ITier } from "./tier.interface";
import ApiError from "../../../errors/ApiErrors";
import { STATUS } from "../../../enums/user";
import QueryBuilder from "../../../app/builder/queryBuilder";

const createTierToDB = async (payload: ITier): Promise<ITier> => {
  // Check if tier with same name, code, or level already exists
  const existingTier = await Tier.findOne({
    $or: [
      { name: payload.name },
      { code: payload.code },
      { level: payload.level },
    ],
  });

  if (existingTier) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Tier with this name, code, or level already exists",
    );
  }

  const createTier = await Tier.create(payload);
  if (!createTier) {
    throw new ApiError(400, "Failed to create tier");
  }

  return createTier;
};

const getAllTiersFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ITier[]; meta: any }> => {
  const searchableFields = ["name", "code"];

  const tiersQuery = new QueryBuilder(Tier.find({ isDeleted: false }), query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await tiersQuery.modelQuery;
  const meta = await tiersQuery.countTotal();

  return { data, meta };
};

const getTierByIdFromDB = async (tierId: string): Promise<ITier | null> => {
  if (!mongoose.Types.ObjectId.isValid(tierId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const tier = await Tier.findOne({ _id: tierId, isDeleted: false });
  if (!tier) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found");
  }

  return tier;
};

const updateTierToDB = async (
  tierId: string,
  payload: Partial<ITier>,
): Promise<ITier | null> => {
  if (!mongoose.Types.ObjectId.isValid(tierId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isTierExist = await Tier.findOne({ _id: tierId, isDeleted: false });
  if (!isTierExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found");
  }

  // Check if updating name, code, or level to a value that already exists
  const orConditions: any[] = [];
  if (payload.name) orConditions.push({ name: payload.name });
  if (payload.code) orConditions.push({ code: payload.code });
  if (payload.level) orConditions.push({ level: payload.level });

  if (orConditions.length > 0) {
    const existingTier = await Tier.findOne({
      _id: { $ne: tierId },
      $or: orConditions,
    });

    if (existingTier) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "Tier with this name, code, or level already exists",
      );
    }
  }

  const tier = await Tier.findByIdAndUpdate(tierId, payload, {
    new: true,
  });

  return tier;
};

const deleteTierToDB = async (tierId: string): Promise<ITier | null> => {
  if (!mongoose.Types.ObjectId.isValid(tierId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const isTierExist = await Tier.findOne({ _id: tierId, isDeleted: false });
  if (!isTierExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found");
  }

  // Soft delete
  const tier = await Tier.softDeleteById(tierId);

  return tier;
};

const updateTierStatusToDB = async (
  tierId: string,
  status: STATUS,
): Promise<ITier | null> => {
  if (!mongoose.Types.ObjectId.isValid(tierId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ID");
  }

  const tier = await Tier.findOne({ _id: tierId, isDeleted: false });
  if (!tier) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found");
  }

  const result = await Tier.findByIdAndUpdate(
    tierId,
    { status },
    { new: true },
  );
  if (!result) {
    throw new ApiError(400, "Failed to update status");
  }

  return result;
};

export const TierService = {
  createTierToDB,
  getAllTiersFromDB,
  getTierByIdFromDB,
  updateTierToDB,
  deleteTierToDB,
  updateTierStatusToDB,
};
