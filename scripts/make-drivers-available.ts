import mongoose from "mongoose";
import dotenv from "dotenv";
import { Driver } from "../src/app/modules/driver/driver.model";
import { findEligibleDriversInRadius } from "../src/services/driverMatchingService";

dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  await mongoose.connect(dbUrl);
  console.log("Connected to DB.");

  // Update Driver 1: Dhaka driver -> set online
  const dhakaDriverId = "6a7a9b57f69d2a3fddb518f9";
  const result1 = await Driver.findByIdAndUpdate(
    dhakaDriverId,
    {
      $set: {
        driverAvailabilityStatus: "online",
        "availability.canReceiveRide": true,
        "availability.blockedReason": null,
        "availability.blockedUntil": null,
      },
    },
    { new: true },
  );

  if (result1) {
    console.log("Dhaka Driver updated to online:", {
      id: result1._id,
      driverAvailabilityStatus: result1.driverAvailabilityStatus,
      location: result1.location,
      availability: result1.availability,
    });
  } else {
    console.log("Dhaka Driver not found!");
  }

  // Update Driver 2: Find by userId to update coordinates to Dhaka and make online
  const targetUserId = "6a59af155d294c2c4111585d";
  const result2 = await Driver.findOneAndUpdate(
    { userId: targetUserId },
    {
      $set: {
        driverAvailabilityStatus: "online",
        location: {
          type: "Point",
          coordinates: [90.4075871, 23.7809006], // exactly at user pickup
          address: "Dhaka, Bangladesh",
        },
        serviceAreaId: new mongoose.Types.ObjectId("6a5b0c7fae072853104f835f"), // Dhaka City Service Area
        "availability.canReceiveRide": true,
        "availability.blockedReason": null,
        "availability.blockedUntil": null,
      },
    },
    { new: true },
  );

  if (result2) {
    console.log("Other Driver coordinates updated to Dhaka & set online:", {
      id: result2._id,
      driverAvailabilityStatus: result2.driverAvailabilityStatus,
      location: result2.location,
      serviceAreaId: result2.serviceAreaId,
      availability: result2.availability,
    });
  } else {
    console.log("Other Driver not found for user ID!");
  }

  // Test finding eligible drivers
  console.log("\nTesting findEligibleDriversInRadius...");
  const pickupCoords: [number, number] = [90.4075871, 23.7809006];
  const rideCategoryId = "6a6af42890eaf8727971f6a9"; // Alygo Standard

  try {
    const eligibleDrivers = await findEligibleDriversInRadius({
      pickupLocation: {
        type: "Point",
        coordinates: pickupCoords,
      },
      radiusKm: 5,
      rideCategoryId,
      rideDestination: {
        type: "Point",
        coordinates: [90.4152376, 23.804092999999998],
      },
      rideType: "instant",
    });

    console.log(
      `Successfully found ${eligibleDrivers.length} eligible drivers:`,
      eligibleDrivers,
    );
  } catch (error: any) {
    console.error("Error finding eligible drivers:", error.message);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
