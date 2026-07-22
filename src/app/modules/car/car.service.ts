import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Car } from "./car.model";
import { ICar } from "./car.interface";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";

const createCarToDB = async (userId: string, payload: Partial<ICar>) => {
  const driverId = await Driver.findOne({ userId });
  if (!driverId) {
    throw new ApiError(404, "Driver not found");
  }

  const carPayload = {
    driverId: new Types.ObjectId(driverId._id),
    ...payload,
  };

  const car = await Car.create(carPayload);

  return car;
};

const getCarFromDB = async (carId: string) => {
  const car = await Car.findById(carId);

  if (!car) {
    throw new ApiError(404, "Car not found");
  }

  return car;
};

const getCarByDriverFromDB = async (userId: string) => {
  const driverId = await Driver.findOne({ userId });

  if (!driverId) {
    throw new ApiError(404, "Driver not found");
  }

  const car = await Car.findOne({ driverId: new Types.ObjectId(driverId._id) });

  return car;
};

const updateCarFromDB = async (carId: string, payload: Partial<ICar>) => {
  const { driverId, ...updatePayload } = payload as Partial<ICar> & {
    driverId?: Types.ObjectId;
  };

  const updatedCar = await Car.findByIdAndUpdate(carId, updatePayload, {
    new: true,
    runValidators: true,
  });

  if (!updatedCar) {
    throw new ApiError(404, "Car not found");
  }

  return updatedCar;
};

const deleteCarFromDB = async (carId: string) => {
  const deletedCar = await Car.softDeleteById(carId);

  if (!deletedCar) {
    throw new ApiError(404, "Car not found");
  }

  return deletedCar;
};

export const CarServices = {
  createCarToDB,
  getCarFromDB,
  getCarByDriverFromDB,
  updateCarFromDB,
  deleteCarFromDB,
};
