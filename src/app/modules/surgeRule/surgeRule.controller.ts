import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { SurgeRuleService } from "./surgeRule.service";
import { SurgeCalculationService } from "./surgeCalculation.service";

const createSurgeRule = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SurgeRuleService.createSurgeRule(user, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Surge Rule Created Successfully",
    data: result,
  });
});

const getAllSurgeRules = catchAsync(async (req: Request, res: Response) => {
  const result = await SurgeRuleService.getAllSurgeRules(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Surge Rules Retrieved Successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSurgeRuleById = catchAsync(async (req: Request, res: Response) => {
  const { surgeRuleId } = req.params;
  const result = await SurgeRuleService.getSurgeRuleById(surgeRuleId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Surge Rule Retrieved Successfully",
    data: result,
  });
});

const updateSurgeRule = catchAsync(async (req: Request, res: Response) => {
  const { surgeRuleId } = req.params;
  const result = await SurgeRuleService.updateSurgeRule(surgeRuleId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Surge Rule Updated Successfully",
    data: result,
  });
});

const deleteSurgeRule = catchAsync(async (req: Request, res: Response) => {
  const { surgeRuleId } = req.params;
  const result = await SurgeRuleService.deleteSurgeRule(surgeRuleId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Surge Rule Deleted Successfully",
    data: result,
  });
});

const getActiveSurgeRules = catchAsync(async (req: Request, res: Response) => {
  const result = await SurgeRuleService.getActiveSurgeRules(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Active Surge Rules Retrieved Successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateSurgeRuleStatus = catchAsync(
  async (req: Request, res: Response) => {
    const { surgeRuleId } = req.params;
    const { status } = req.body;

    const result = await SurgeRuleService.updateSurgeRuleStatus(
      surgeRuleId,
      status,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Surge Rule Status Updated Successfully",
      data: result,
    });
  },
);

const testSurgeCalculation = catchAsync(async (req: Request, res: Response) => {
  const { serviceAreaId } = req.params;
  const { testDate } = req.query;

  const date = testDate ? new Date(testDate as string) : new Date();
  const result = await SurgeCalculationService.testSurgeCalculation(
    serviceAreaId,
    date,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Surge Calculation Test Result",
    data: result,
  });
});

export const SurgeRuleController = {
  createSurgeRule,
  getAllSurgeRules,
  getActiveSurgeRules,
  getSurgeRuleById,
  updateSurgeRule,
  updateSurgeRuleStatus,
  deleteSurgeRule,
  testSurgeCalculation,
};
