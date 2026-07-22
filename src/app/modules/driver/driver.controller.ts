import ApiError from "../../../errors/ApiErrors";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DriverServices } from "./driver.service";

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

export const DriverController = {
  createDriver,
  getDriverProfile,
  updateDriver,
  getAvailability,
  getReservations,
};
