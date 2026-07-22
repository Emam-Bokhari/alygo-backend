"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarServices = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const car_model_1 = require("./car.model");
const driver_model_1 = require("../driver/driver.model");
const createCarToDB = (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = yield driver_model_1.Driver.findOne({ userId });
    if (!driverId) {
        throw new ApiErrors_1.default(404, "Driver not found");
    }
    const carPayload = Object.assign({ driverId: new mongoose_1.Types.ObjectId(driverId._id) }, payload);
    const car = yield car_model_1.Car.create(carPayload);
    return car;
});
const getCarFromDB = (carId) => __awaiter(void 0, void 0, void 0, function* () {
    const car = yield car_model_1.Car.findById(carId);
    if (!car) {
        throw new ApiErrors_1.default(404, "Car not found");
    }
    return car;
});
const getCarByDriverFromDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const driverId = yield driver_model_1.Driver.findOne({ userId });
    if (!driverId) {
        throw new ApiErrors_1.default(404, "Driver not found");
    }
    const car = yield car_model_1.Car.findOne({ driverId: new mongoose_1.Types.ObjectId(driverId._id) });
    return car;
});
const updateCarFromDB = (carId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const _a = payload, { driverId } = _a, updatePayload = __rest(_a, ["driverId"]);
    const updatedCar = yield car_model_1.Car.findByIdAndUpdate(carId, updatePayload, {
        new: true,
        runValidators: true,
    });
    if (!updatedCar) {
        throw new ApiErrors_1.default(404, "Car not found");
    }
    return updatedCar;
});
const deleteCarFromDB = (carId) => __awaiter(void 0, void 0, void 0, function* () {
    const deletedCar = yield car_model_1.Car.softDeleteById(carId);
    if (!deletedCar) {
        throw new ApiErrors_1.default(404, "Car not found");
    }
    return deletedCar;
});
exports.CarServices = {
    createCarToDB,
    getCarFromDB,
    getCarByDriverFromDB,
    updateCarFromDB,
    deleteCarFromDB,
};
