import { Request, Response } from "express";
import { TierService } from "./tier.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";

const createTier = catchAsync(async (req: Request, res: Response) => {
  const tierData = req.body;
  const result = await TierService.createTierToDB(tierData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tier created successfully",
    data: result,
  });
});

const getAllTiers = catchAsync(async (req: Request, res: Response) => {
  const result = await TierService.getAllTiersFromDB(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tiers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getTierById = catchAsync(async (req: Request, res: Response) => {
  const { tierId } = req.params;
  const result = await TierService.getTierByIdFromDB(tierId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tier retrieved successfully",
    data: result,
  });
});

const updateTier = catchAsync(async (req: Request, res: Response) => {
  const { tierId } = req.params;
  const updateData = req.body;

  const result = await TierService.updateTierToDB(tierId, updateData);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tier updated successfully",
    data: result,
  });
});

const deleteTier = catchAsync(async (req: Request, res: Response) => {
  const { tierId } = req.params;
  const result = await TierService.deleteTierToDB(tierId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tier deleted successfully",
    data: result,
  });
});

const updateTierStatus = catchAsync(async (req: Request, res: Response) => {
  const { tierId } = req.params;
  const { status } = req.body;
  const result = await TierService.updateTierStatusToDB(tierId, status);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Tier status updated successfully",
    data: result,
  });
});

export const TierController = {
  createTier,
  getAllTiers,
  getTierById,
  updateTier,
  deleteTier,
  updateTierStatus,
};
