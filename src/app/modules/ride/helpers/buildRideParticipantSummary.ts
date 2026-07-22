import { Driver } from "../../driver/driver.model";
import { User } from "../../user/user.model";
import { Car } from "../../car/car.model";
import { Ride } from "../ride.model";

/**
 * Driver Summary Interface for Socket Payloads
 */
export interface DriverSummary {
  _id: string;
  name: string;
  profileImage?: string;
  averageRating: number;
  totalRatings: number;
  totalTrips: number;
  car: {
    _id: string;
    brand: string;
    model: string;
    year: number;
    carType: string;
    seatNumber: number;
    licensePlate: string;
  };
}

/**
 * Passenger Summary Interface for Socket Payloads
 */
export interface PassengerSummary {
  _id: string;
  name: string;
  profileImage?: string;
  averageRating: number;
  totalRatings: number;
}

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
export const buildDriverSummary = async (
  driver: any,
  car?: any,
): Promise<DriverSummary> => {
  // Get driver user information
  let driverUser;
  if (driver.userId && typeof driver.userId === "object") {
    // Already populated
    driverUser = driver.userId;
  } else {
    // Need to fetch user
    driverUser = await User.findById(driver.userId).select("name profileImage");
  }

  // Get car information if not provided
  let carDoc = car;
  if (!carDoc && driver._id) {
    carDoc = await Car.findOne({
      driverId: driver._id,
      isVerified: true,
    });
  }

  // Calculate total trips - use completedTrips if available, otherwise default to 0
  // Note: This should be updated to use a proper statistics field in the future
  const totalTrips = (driver as any).completedTrips || 0;

  return {
    _id: driverUser?._id?.toString() || driver.userId?.toString() || "",
    name: driverUser?.name || "",
    profileImage: driverUser?.profileImage,
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
};

/**
 * Build Passenger Summary for Socket Payloads
 *
 * This function constructs a passenger summary object containing only UI-safe information.
 * Sensitive fields like phone, email, wallet, payment info, etc. are excluded.
 *
 * @param user - User document
 * @returns Passenger summary object
 */
export const buildPassengerSummary = (user: any): PassengerSummary => {
  return {
    _id: user._id.toString(),
    name: user.name,
    profileImage: user.profileImage,
    averageRating: user.averageRating || 0,
    totalRatings: user.totalRatings || 0,
  };
};

/**
 * Build Complete Socket Payload for Passenger
 *
 * Enriches the ride payload with driver summary for passenger-facing events
 *
 * @param ride - Ride document
 * @param driverSummary - Driver summary (optional, will be built if not provided)
 * @returns Complete socket payload for passenger
 */
export const buildPassengerSocketPayload = async (
  ride: any,
  driverSummary?: DriverSummary,
): Promise<any> => {
  const driver = driverSummary || (await buildDriverSummaryForRide(ride));

  return {
    ride,
    driver,
  };
};

/**
 * Build Complete Socket Payload for Driver
 *
 * Enriches the ride payload with passenger summary for driver-facing events
 *
 * @param ride - Ride document
 * @param passengerSummary - Passenger summary (optional, will be built if not provided)
 * @returns Complete socket payload for driver
 */
export const buildDriverSocketPayload = async (
  ride: any,
  passengerSummary?: PassengerSummary,
): Promise<any> => {
  const user = passengerSummary || (await buildPassengerSummaryForRide(ride));

  return {
    ride,
    user,
  };
};

/**
 * Helper: Build driver summary from ride document
 */
const buildDriverSummaryForRide = async (ride: any): Promise<DriverSummary> => {
  if (!ride.driverId) {
    throw new Error("Driver ID not found in ride");
  }

  const driver = await Driver.findOne({ userId: ride.driverId });
  if (!driver) {
    throw new Error("Driver not found");
  }

  let car;
  if (ride.carId) {
    car = await Car.findById(ride.carId);
  }

  return buildDriverSummary(driver, car);
};

/**
 * Helper: Build passenger summary from ride document
 */
const buildPassengerSummaryForRide = async (
  ride: any,
): Promise<PassengerSummary> => {
  let user;
  if (ride.userId && typeof ride.userId === "object") {
    // Already populated
    user = ride.userId;
  } else {
    user = await User.findById(ride.userId).select(
      "name profileImage averageRating totalRatings",
    );
  }

  if (!user) {
    throw new Error("User not found");
  }

  return buildPassengerSummary(user);
};
