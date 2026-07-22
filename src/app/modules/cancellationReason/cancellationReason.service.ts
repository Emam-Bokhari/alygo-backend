import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { CancellationReason } from "./cancellationReason.model";
import { ICancellationReason } from "./cancellationReason.interface";
import { STATUS } from "../../../constants/status";
import QueryBuilder from "../../builder/queryBuilder";

const createCancellationReasonToDB = async (
  payload: Partial<ICancellationReason>,
) => {
  const cancellationReason = await CancellationReason.create(payload);
  return cancellationReason;
};

const getCancellationReasonFromDB = async (cancellationReasonId: string) => {
  const cancellationReason =
    await CancellationReason.findById(cancellationReasonId);

  if (!cancellationReason) {
    throw new ApiError(404, "Cancellation reason not found");
  }

  return cancellationReason;
};

const getAllCancellationReasonsFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ICancellationReason[]; meta: any }> => {
  const cancellationReasonQuery = new QueryBuilder(
    CancellationReason.find(),
    query,
  )
    .search(["reasonName", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await cancellationReasonQuery.modelQuery;
  const meta = await cancellationReasonQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const getActiveCancellationReasonsFromDB = async (
  query: Record<string, unknown>,
): Promise<{ data: ICancellationReason[]; meta: any }> => {
  const cancellationReasonQuery = new QueryBuilder(
    CancellationReason.find({ status: STATUS.ACTIVE }),
    query,
  )
    .search(["reasonName", "description"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await cancellationReasonQuery.modelQuery;
  const meta = await cancellationReasonQuery.countTotal();

  return {
    data: result,
    meta,
  };
};

const updateCancellationReasonFromDB = async (
  cancellationReasonId: string,
  payload: Partial<ICancellationReason>,
) => {
  const updatedCancellationReason = await CancellationReason.findByIdAndUpdate(
    cancellationReasonId,
    payload,
    { new: true, runValidators: true },
  );

  if (!updatedCancellationReason) {
    throw new ApiError(404, "Cancellation reason not found");
  }

  return updatedCancellationReason;
};

const deleteCancellationReasonFromDB = async (cancellationReasonId: string) => {
  const deletedCancellationReason =
    await CancellationReason.softDeleteById(cancellationReasonId);

  if (!deletedCancellationReason) {
    throw new ApiError(404, "Cancellation reason not found");
  }

  return deletedCancellationReason;
};

const updateCancellationReasonStatusFromDB = async (
  cancellationReasonId: string,
  status: string,
) => {
  if (status !== STATUS.ACTIVE && status !== STATUS.INACTIVE) {
    throw new ApiError(400, "Status must be either 'ACTIVE' or 'INACTIVE'");
  }

  const updatedCancellationReason = await CancellationReason.findByIdAndUpdate(
    cancellationReasonId,
    { status },
    { new: true, runValidators: true },
  );

  if (!updatedCancellationReason) {
    throw new ApiError(404, "Cancellation reason not found");
  }

  return updatedCancellationReason;
};

export const CancellationReasonServices = {
  createCancellationReasonToDB,
  getCancellationReasonFromDB,
  getAllCancellationReasonsFromDB,
  getActiveCancellationReasonsFromDB,
  updateCancellationReasonFromDB,
  deleteCancellationReasonFromDB,
  updateCancellationReasonStatusFromDB,
};
