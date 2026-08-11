import { StatusCodes } from "http-status-codes";
import { BroadcastService } from "./broadcast.service";
import sendResponse from "../../../shared/sendResponse";
import catchAsync from "../../../shared/catchAsync";

const createBroadcast = catchAsync(async (req, res) => {
  const userId = req.user?.id;
  const result = await BroadcastService.createBroadcastToDB(req.body, userId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Broadcast created successfully",
    data: result,
  });
});

const getAllBroadcasts = catchAsync(async (req, res) => {
  const { data, meta } = await BroadcastService.getAllBroadcastsFromDB(
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Broadcasts retrieved successfully",
    data,
    pagination: meta,
  });
});

const getSingleBroadcast = catchAsync(async (req, res) => {
  const result = await BroadcastService.getSingleBroadcastFromDB(
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Broadcast retrieved successfully",
    data: result,
  });
});

const deleteBroadcast = catchAsync(async (req, res) => {
  const result = await BroadcastService.deleteBroadcastFromDB(req.params.id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Broadcast deleted successfully",
    data: result,
  });
});

const cancelBroadcast = catchAsync(async (req, res) => {
  const result = await BroadcastService.cancelScheduledBroadcast(
    req.params.id,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Broadcast cancelled successfully",
    data: result,
  });
});

export const BroadcastController = {
  createBroadcast,
  getAllBroadcasts,
  getSingleBroadcast,
  deleteBroadcast,
  cancelBroadcast,
};
