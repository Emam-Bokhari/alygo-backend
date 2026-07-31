import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DriverManagementServices } from "./driverManagement.service";

const getOverviewSummary = catchAsync(async (req, res) => {
  const result = await DriverManagementServices.getOverviewSummaryFromDB();

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Overview summary retrieved successfully",
    data: result,
  });
});

const getOnlineDrivers = catchAsync(async (req, res) => {
  const result = await DriverManagementServices.getOnlineDriversFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Online drivers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPendingApprovalDrivers = catchAsync(async (req, res) => {
  const result = await DriverManagementServices.getPendingApprovalDriversFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Pending approval drivers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSuspendedDrivers = catchAsync(async (req, res) => {
  const result = await DriverManagementServices.getSuspendedDriversFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Suspended drivers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getComplianceDrivers = catchAsync(async (req, res) => {
  const result = await DriverManagementServices.getComplianceDriversFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Compliance drivers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getDriverDetails = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const result = await DriverManagementServices.getDriverDetailsFromDB(driverId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver details retrieved successfully",
    data: result,
  });
});

const createApproveDriver = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const adminId = req.user.id;
  const result = await DriverManagementServices.approveDriverInDB(driverId, adminId, req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver approved successfully",
    data: result,
  });
});

const createRejectDriver = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { reason } = req.body;
  const adminId = req.user.id;
  const result = await DriverManagementServices.rejectDriverInDB(driverId, adminId, reason, req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver rejected successfully",
    data: result,
  });
});

const suspendDriver = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { reason, note } = req.body;
  const adminId = req.user.id;
  const result = await DriverManagementServices.suspendDriverInDB(driverId, adminId, reason, note, req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver suspended successfully",
    data: result,
  });
});

const unsuspendDriver = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const adminId = req.user.id;
  const result = await DriverManagementServices.unsuspendDriverInDB(driverId, adminId, req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver unsuspended successfully",
    data: result,
  });
});

export const DriverManagementControllers = {
  getOverviewSummary,
  getOnlineDrivers,
  getPendingApprovalDrivers,
  getSuspendedDrivers,
  getComplianceDrivers,
  getDriverDetails,
  createApproveDriver,
  createRejectDriver,
  suspendDriver,
  unsuspendDriver,
};
