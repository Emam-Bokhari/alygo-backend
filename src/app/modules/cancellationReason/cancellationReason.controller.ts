import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CancellationReasonServices } from "./cancellationReason.service";

const createCancellationReason = catchAsync(async (req, res) => {
  const result = await CancellationReasonServices.createCancellationReasonToDB(
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Cancellation reason created successfully",
    data: result,
  });
});

const getCancellationReason = catchAsync(async (req, res) => {
  const { cancellationReasonId } = req.params;
  const result =
    await CancellationReasonServices.getCancellationReasonFromDB(
      cancellationReasonId,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation reason retrieved successfully",
    data: result,
  });
});

const getAllCancellationReasons = catchAsync(async (req, res) => {
  const result =
    await CancellationReasonServices.getAllCancellationReasonsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation reasons retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getActiveCancellationReasons = catchAsync(async (req, res) => {
  const result =
    await CancellationReasonServices.getActiveCancellationReasonsFromDB(
      req.query,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Active cancellation reasons retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateCancellationReason = catchAsync(async (req, res) => {
  const { cancellationReasonId } = req.params;
  const result =
    await CancellationReasonServices.updateCancellationReasonFromDB(
      cancellationReasonId,
      req.body,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation reason updated successfully",
    data: result,
  });
});

const deleteCancellationReason = catchAsync(async (req, res) => {
  const { cancellationReasonId } = req.params;
  const result =
    await CancellationReasonServices.deleteCancellationReasonFromDB(
      cancellationReasonId,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation reason deleted successfully",
    data: result,
  });
});

const updateCancellationReasonStatus = catchAsync(async (req, res) => {
  const { cancellationReasonId } = req.params;
  const { status } = req.body;
  const result =
    await CancellationReasonServices.updateCancellationReasonStatusFromDB(
      cancellationReasonId,
      status,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Cancellation reason status updated successfully",
    data: result,
  });
});

export const CancellationReasonController = {
  createCancellationReason,
  getCancellationReason,
  getAllCancellationReasons,
  getActiveCancellationReasons,
  updateCancellationReason,
  deleteCancellationReason,
  updateCancellationReasonStatus,
};
