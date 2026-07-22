import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DriverDutyPolicyServices } from "./driverDutyPolicy.service";

const createDriverDutyPolicy = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.createDriverDutyPolicyToDB(
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Driver duty policy created successfully",
    data: result,
  });
});

const getDriverDutyPolicy = catchAsync(async (req, res) => {
  const { driverDutyPolicyId } = req.params;
  const result =
    await DriverDutyPolicyServices.getDriverDutyPolicyFromDB(
      driverDutyPolicyId,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver duty policy retrieved successfully",
    data: result,
  });
});

const getAllDriverDutyPolicies = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getAllDriverDutyPoliciesFromDB(
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver duty policies retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateDriverDutyPolicy = catchAsync(async (req, res) => {
  const { driverDutyPolicyId } = req.params;
  const result = await DriverDutyPolicyServices.updateDriverDutyPolicyFromDB(
    driverDutyPolicyId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver duty policy updated successfully",
    data: result,
  });
});

const deleteDriverDutyPolicy = catchAsync(async (req, res) => {
  const { driverDutyPolicyId } = req.params;
  const result =
    await DriverDutyPolicyServices.deleteDriverDutyPolicyFromDB(
      driverDutyPolicyId,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver duty policy deleted successfully",
    data: result,
  });
});

const getActiveDriverDutyPolicies = catchAsync(async (req, res) => {
  const result =
    await DriverDutyPolicyServices.getActiveDriverDutyPoliciesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Active driver duty policies retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const updateDriverDutyPolicyStatus = catchAsync(async (req, res) => {
  const { driverDutyPolicyId } = req.params;
  const { status } = req.body;
  const result =
    await DriverDutyPolicyServices.updateDriverDutyPolicyStatusFromDB(
      driverDutyPolicyId,
      status,
    );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver duty policy status updated successfully",
    data: result,
  });
});

export const DriverDutyPolicyController = {
  createDriverDutyPolicy,
  getDriverDutyPolicy,
  getAllDriverDutyPolicies,
  updateDriverDutyPolicy,
  deleteDriverDutyPolicy,
  getActiveDriverDutyPolicies,
  updateDriverDutyPolicyStatus,
};
