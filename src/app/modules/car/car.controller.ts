import ApiError from "../../../errors/ApiErrors";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CarServices } from "./car.service";

const createCar = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await CarServices.createCarToDB(id, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Car created successfully",
    data: result,
  });
});

const getCar = catchAsync(async (req, res) => {
  const { carId } = req.params;
  const result = await CarServices.getCarFromDB(carId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car retrieved successfully",
    data: result,
  });
});

const getCarByDriver = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }

  const { id } = req.user as { id: string };
  const result = await CarServices.getCarByDriverFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Driver car retrieved successfully",
    data: result,
  });
});

const updateCar = catchAsync(async (req, res) => {
  const { carId } = req.params;
  const result = await CarServices.updateCarFromDB(carId, req.body);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car updated successfully",
    data: result,
  });
});

const deleteCar = catchAsync(async (req, res) => {
  const { carId } = req.params;
  const result = await CarServices.deleteCarFromDB(carId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Car deleted successfully",
    data: result,
  });
});

export const CarController = {
  createCar,
  getCar,
  getCarByDriver,
  updateCar,
  deleteCar,
};
