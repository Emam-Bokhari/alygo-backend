import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PassengerManagementServices } from "./passengerManagement.service";

const getPassengersOverview = catchAsync(async (req, res) => {
  const result = await PassengerManagementServices.getPassengersOverview(
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Passengers overview retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getLivePassengers = catchAsync(async (req, res) => {
  const result = await PassengerManagementServices.getLivePassengers(req.query);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Live passengers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getSuspendedPassengers = catchAsync(async (req, res) => {
  const result = await PassengerManagementServices.getSuspendedPassengers(
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Suspended passengers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getPassengerDetails = catchAsync(async (req, res) => {
  const { passengerId } = req.params;
  const result =
    await PassengerManagementServices.getPassengerDetails(passengerId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Passenger details retrieved successfully",
    data: result,
  });
});

const getLivePassengerDetails = catchAsync(async (req, res) => {
  const { passengerId } = req.params;
  const result =
    await PassengerManagementServices.getLivePassengerDetails(passengerId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Passenger live activity details retrieved successfully",
    data: result,
  });
});

const suspendPassenger = catchAsync(async (req, res) => {
  const { passengerId } = req.params;
  const { reason, note } = req.body;
  const adminId = (req as any).user.id;
  const result = await PassengerManagementServices.suspendPassengerInDB(
    passengerId,
    adminId,
    reason,
    note,
    req,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Passenger suspended successfully",
    data: result,
  });
});

const unsuspendPassenger = catchAsync(async (req, res) => {
  const { passengerId } = req.params;
  const adminId = (req as any).user.id;
  const result = await PassengerManagementServices.unsuspendPassengerInDB(
    passengerId,
    adminId,
    req,
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Passenger unsuspended successfully",
    data: result,
  });
});

export const PassengerManagementControllers = {
  getPassengersOverview,
  getLivePassengers,
  getSuspendedPassengers,
  getPassengerDetails,
  getLivePassengerDetails,
  suspendPassenger,
  unsuspendPassenger,
};
