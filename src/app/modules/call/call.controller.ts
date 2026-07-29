import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CallService } from "./call.service";

const initiateCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CallService.initiateCallToDB(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call initiated successfully",
    data: result,
  });
});

const answerCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { callId } = req.body;
  const result = await CallService.answerCallInDB(userId, callId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call answered successfully",
    data: result,
  });
});

const rejectCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { callId, reason } = req.body;
  const result = await CallService.rejectCallInDB(userId, callId, reason);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call rejected successfully",
    data: result,
  });
});

const cancelCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { callId } = req.body;
  const result = await CallService.cancelCallInDB(userId, callId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call cancelled successfully",
    data: result,
  });
});

const endCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { callId } = req.body;
  const result = await CallService.endCallInDB(userId, callId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call ended successfully",
    data: result,
  });
});

const getToken = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { callId } = req.body;
  const result = await CallService.getTokenFromDB(userId, callId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call token regenerated successfully",
    data: result,
  });
});

const getHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CallService.getHistoryFromDB(userId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call history retrieved successfully",
    data: result,
  });
});

const getCall = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const callId = req.params.id;
  const result = await CallService.getCallFromDB(userId, callId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Call details retrieved successfully",
    data: result,
  });
});

export const CallController = {
  initiateCall,
  answerCall,
  rejectCall,
  cancelCall,
  endCall,
  getToken,
  getHistory,
  getCall,
};
