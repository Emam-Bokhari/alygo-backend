"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDriverSocketPayload =
  exports.buildPassengerSocketPayload =
  exports.buildPassengerSummary =
  exports.buildDriverSummary =
    void 0;
const driver_model_1 = require("../../driver/driver.model");
const user_model_1 = require("../../user/user.model");
const car_model_1 = require("../../car/car.model");
/**
 * Build Driver Summary for Socket Payloads
 *
 * This function constructs a driver summary object containing only UI-safe information.
 * Sensitive fields like SSN, tax info, insurance documents, OCR data, etc. are excluded.
 *
 * @param driver - Driver document (must be populated with userId)
 * @param car - Car document (optional, if not provided will be fetched)
 * @returns Driver summary object
 */
const buildDriverSummary = (driver, car) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Get driver user information
    let driverUser;
    if (driver.userId && typeof driver.userId === "object") {
      // Already populated
      driverUser = driver.userId;
    } else {
      // Need to fetch user
      driverUser = yield user_model_1.User.findById(driver.userId).select(
        "name profileImage",
      );
    }
    // Get car information if not provided
    let carDoc = car;
    if (!carDoc && driver._id) {
      carDoc = yield car_model_1.Car.findOne({
        driverId: driver._id,
        isVerified: true,
      });
    }
    // Calculate total trips - use completedTrips if available, otherwise default to 0
    // Note: This should be updated to use a proper statistics field in the future
    const totalTrips = driver.completedTrips || 0;
    return {
      _id:
        ((_a =
          driverUser === null || driverUser === void 0
            ? void 0
            : driverUser._id) === null || _a === void 0
          ? void 0
          : _a.toString()) ||
        ((_b = driver.userId) === null || _b === void 0
          ? void 0
          : _b.toString()) ||
        "",
      name:
        (driverUser === null || driverUser === void 0
          ? void 0
          : driverUser.name) || "",
      profileImage:
        driverUser === null || driverUser === void 0
          ? void 0
          : driverUser.profileImage,
      averageRating: driver.averageRating || 0,
      totalRatings: driver.totalRatings || 0,
      totalTrips,
      car: carDoc
        ? {
            _id: carDoc._id.toString(),
            brand: carDoc.brand,
            model: carDoc.model,
            year: carDoc.year,
            carType: carDoc.carType,
            seatNumber: carDoc.seatNumber,
            licensePlate: carDoc.licensePlate,
          }
        : {
            _id: "",
            brand: "",
            model: "",
            year: 0,
            carType: "",
            seatNumber: 0,
            licensePlate: "",
          },
    };
  });
exports.buildDriverSummary = buildDriverSummary;
/**
 * Build Passenger Summary for Socket Payloads
 *
 * This function constructs a passenger summary object containing only UI-safe information.
 * Sensitive fields like phone, email, wallet, payment info, etc. are excluded.
 *
 * @param user - User document
 * @returns Passenger summary object
 */
const buildPassengerSummary = (user) => {
  return {
    _id: user._id.toString(),
    name: user.name,
    profileImage: user.profileImage,
    averageRating: user.averageRating || 0,
    totalRatings: user.totalRatings || 0,
  };
};
exports.buildPassengerSummary = buildPassengerSummary;
/**
 * Build Complete Socket Payload for Passenger
 *
 * Enriches the ride payload with driver summary for passenger-facing events
 *
 * @param ride - Ride document
 * @param driverSummary - Driver summary (optional, will be built if not provided)
 * @returns Complete socket payload for passenger
 */
const buildPassengerSocketPayload = (ride, driverSummary) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const driver = driverSummary || (yield buildDriverSummaryForRide(ride));
    return {
      ride,
      driver,
    };
  });
exports.buildPassengerSocketPayload = buildPassengerSocketPayload;
/**
 * Build Complete Socket Payload for Driver
 *
 * Enriches the ride payload with passenger summary for driver-facing events
 *
 * @param ride - Ride document
 * @param passengerSummary - Passenger summary (optional, will be built if not provided)
 * @returns Complete socket payload for driver
 */
const buildDriverSocketPayload = (ride, passengerSummary) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = passengerSummary || (yield buildPassengerSummaryForRide(ride));
    return {
      ride,
      user,
    };
  });
exports.buildDriverSocketPayload = buildDriverSocketPayload;
/**
 * Helper: Build driver summary from ride document
 */
const buildDriverSummaryForRide = (ride) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!ride.driverId) {
      throw new Error("Driver ID not found in ride");
    }
    const driver = yield driver_model_1.Driver.findOne({
      userId: ride.driverId,
    });
    if (!driver) {
      throw new Error("Driver not found");
    }
    let car;
    if (ride.carId) {
      car = yield car_model_1.Car.findById(ride.carId);
    }
    return (0, exports.buildDriverSummary)(driver, car);
  });
/**
 * Helper: Build passenger summary from ride document
 */
const buildPassengerSummaryForRide = (ride) =>
  __awaiter(void 0, void 0, void 0, function* () {
    let user;
    if (ride.userId && typeof ride.userId === "object") {
      // Already populated
      user = ride.userId;
    } else {
      user = yield user_model_1.User.findById(ride.userId).select(
        "name profileImage averageRating totalRatings",
      );
    }
    if (!user) {
      throw new Error("User not found");
    }
    return (0, exports.buildPassengerSummary)(user);
  });
