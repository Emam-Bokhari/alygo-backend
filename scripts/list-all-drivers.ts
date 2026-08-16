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

  const drivers = await Driver.find({});
  logLines.push(`=== ALL DRIVERS IN DATABASE (Count: ${drivers.length}) ===`);

  for (const driver of drivers) {
    const user = await User.findById(driver.userId);
    const cars = await Car.find({ driverId: driver._id });

    logLines.push(
      JSON.stringify(
        {
          driverId: driver._id,
          userId: driver.userId,
          driverAvailabilityStatus: driver.driverAvailabilityStatus,
          approvalStatus: driver.approvalStatus,
          location: driver.location,
          suspension: driver.suspension,
          availability: driver.availability,
          user: user
            ? {
                status: user.status,
                verified: user.verified,
                role: user.role,
              }
            : null,
          cars: cars.map((c) => ({
            carId: c._id,
            carType: c.carType,
            seatNumber: c.seatNumber,
          })),
        },
        null,
        2,
      ),
    );
  }

  fs.writeFileSync("scripts/all-drivers.log", logLines.join("\n"));
  console.log("Logged all drivers to scripts/all-drivers.log");

  await mongoose.disconnect();
}

run().catch(console.error);
