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

const getGlobalRule = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getGlobalRuleFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Global duty hour rule retrieved successfully",
    data: result,
  });
});

const getStateRules = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getStateRulesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "State rules retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getCityRules = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getCityRulesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "City rules retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getZoneRules = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getZoneRulesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Zone rules retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getAirportRules = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getAirportRulesFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Airport rules retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getMonitoringCards = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getMonitoringCardsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver monitoring cards retrieved successfully",
    data: result,
  });
});

const getDriverMonitoringList = catchAsync(async (req, res) => {
  const result = await DriverDutyPolicyServices.getDriverMonitoringListFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver monitoring list retrieved successfully",
    data: result.data,
    meta: result.meta,
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
  getGlobalRule,
  getStateRules,
  getCityRules,
  getZoneRules,
  getAirportRules,
  getMonitoringCards,
  getDriverMonitoringList,
};


