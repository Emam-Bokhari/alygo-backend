import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

import { Driver } from "../src/app/modules/driver/driver.model";
import { User } from "../src/app/modules/user/user.model";
import { Car } from "../src/app/modules/car/car.model";

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  await mongoose.connect(dbUrl);

  const logLines: string[] = [];

  // Get all cars in the database
  const cars = await Car.find({});
  logLines.push(`=== ALL CARS IN DATABASE (Count: ${cars.length}) ===`);
  for (const car of cars) {
    const driver = await Driver.findById(car.driverId);
    let user = null;
    if (driver) {
      user = await User.findById(driver.userId);
    }
    logLines.push(
      JSON.stringify(
        {
          carId: car._id,
          carType: car.carType,
          seatNumber: car.seatNumber,
          driverId: car.driverId,
          driverFound: !!driver,
          driverDetails: driver
            ? {
                approvalStatus: driver.approvalStatus,
                driverAvailabilityStatus: driver.driverAvailabilityStatus,
                location: driver.location,
                userId: driver.userId,
                userStatus: user?.status,
                userVerified: user?.verified,
                isSuspended: driver.suspension?.isSuspended,
                canReceiveRide: driver.availability?.canReceiveRide,
              }
            : null,
        },
        null,
        2,
      ),
    );
  }

  fs.writeFileSync("scripts/cars-debug.log", logLines.join("\n"));
  console.log("Logged all car data to scripts/cars-debug.log");

  await mongoose.disconnect();
}

run().catch(console.error);
