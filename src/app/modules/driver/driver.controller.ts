import ApiError from "../../../errors/ApiErrors";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DriverServices } from "./driver.service";
import { DriverVerificationService } from "./driver.verification.service";

const createDriver = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await DriverServices.createDriverToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Driver created successfully",
    data: result,
  });
});

const getDriverProfile = catchAsync(async (req, res) => {
  const result = await DriverServices.getDriverProfileFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver profile retrieved successfully",
    data: result,
  });
});

const updateDriver = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await DriverServices.updateDriverFromDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver profile updated successfully",
    data: result,
  });
});

const getAvailability = catchAsync(async (req, res) => {
  const result = await DriverServices.getDriverAvailability(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver availability retrieved successfully",
    data: result,
  });
});

const getReservations = catchAsync(async (req, res) => {
  const result = await DriverServices.getDriverReservationsFromDB(
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver reservations retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPerformanceMetrics = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const result = await DriverServices.getDriverPerformanceMetrics(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver performance metrics retrieved successfully",
    data: result,
  });
});

const getDrivingHours = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const result = await DriverServices.getDriverDrivingHours(req.user.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driving hours retrieved successfully",
    data: result,
  });
});

const getDrivingHoursHistory = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const result = await DriverServices.getDriverDrivingHoursHistory(
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driving hours history retrieved successfully",
    data: {
      timeline: result.timeline,
      history: result.history,
    },
    pagination: result.pagination,
  });
});

const getDrivingHoursLedger = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const result = await DriverServices.getDriverDrivingHoursLedger(
    req.user.id,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driving hours ledger retrieved successfully",
    data: result.ledger,
    pagination: result.pagination,
  });
});

const initiateBackgroundCheck = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await DriverVerificationService.initiateBackgroundCheck(
    id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Background check initiated successfully",
    data: result,
  });
});

const verifySelfie = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const selfieUrl = req.body.liveSelfie;

  if (!selfieUrl) {
    throw new ApiError(400, "Verification selfie file was not uploaded");
  }

  const result = await DriverServices.verifySelfieFaceToDB(id, selfieUrl);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Selfie verified successfully",
    data: result,
  });
});

const getBackgroundCheckFee = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await DriverVerificationService.getBackgroundCheckFee(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Background check fee retrieved successfully",
    data: result,
  });
});

const createBackgroundCheckPaymentSession = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result =
    await DriverVerificationService.createBackgroundCheckPaymentSession(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Background check payment session created successfully",
    data: result,
  });
});

export const DriverController = {
  createDriver,
  getDriverProfile,
  updateDriver,
  getAvailability,
  getReservations,
  getPerformanceMetrics,
  getDrivingHours,
  getDrivingHoursHistory,
  getDrivingHoursLedger,
  initiateBackgroundCheck,
  verifySelfie,
  getBackgroundCheckFee,
  createBackgroundCheckPaymentSession,
};
