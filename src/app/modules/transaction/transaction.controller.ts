import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TransactionService } from "./transaction.service";

const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await TransactionService.getTransactionsByUser(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Transactions retrieved successfully",
    data: result,
  });
});

export const TransactionController = {
  getMyTransactions,
};
