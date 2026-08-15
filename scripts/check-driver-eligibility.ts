import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config();

import { Driver } from '../src/app/modules/driver/driver.model';
import { User } from '../src/app/modules/user/user.model';
import { ServiceArea } from '../src/app/modules/serviceArea/serviceArea.model';
import { RideCategory } from '../src/app/modules/rideCategory/rideCategory.model';
import { ServiceCategory } from '../src/app/modules/serviceCategory/serviceCategory.model';
import { Tier } from '../src/app/modules/tier/tier.model';
import { Car } from '../src/app/modules/car/car.model';
import { findEligibleDriversInRadius } from '../src/services/driverMatchingService';
import { ServiceAreaServices } from '../src/app/modules/serviceArea/serviceArea.service';

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  console.log("Connecting to database...", dbUrl);
  await mongoose.connect(dbUrl);
  console.log("Connected successfully.\n");

  const driverIdStr = "6a59b25aec029a501f10cd9f";
  const userIdStr = "6a59af155d294c2c4111585d";
  const rideCategoryIdStr = "6a59b093ec029a501f10cd62";
  const serviceCategoryIdStr = "6a59afef5d294c2c4111586e";

  // 1. Fetch Driver
  const driver = await Driver.findById(driverIdStr);
  console.log("=== DRIVER DOCUMENT ===");
  if (!driver) {
    console.error("❌ Driver not found!");
  } else {
    console.log({
      id: driver._id,
      userId: driver.userId,
      driverAvailabilityStatus: driver.driverAvailabilityStatus,
      approvalStatus: driver.approvalStatus,
      isDeleted: driver.isDeleted,
      serviceAreaId: driver.serviceAreaId,
      currentTier: driver.currentTier,
      availability: driver.availability,
      location: driver.location,
      suspension: driver.suspension,
    });
  }
  console.log("\n");

  // 2. Fetch User
  const user = await User.findById(userIdStr);
  console.log("=== USER DOCUMENT ===");
  if (!user) {
    console.error("❌ User not found!");
  } else {
    console.log({
      id: user._id,
      role: user.role,
      status: user.status,
      verified: user.verified,
    });
  }
  console.log("\n");

  // 3. Fetch Car
  if (driver) {
    const car = await Car.findOne({ driverId: driver._id });
    console.log("=== CAR DOCUMENT ===");
    if (!car) {
      console.error("❌ Car not found for driver!");
    } else {
      console.log({
        id: car._id,
        driverId: car.driverId,
        carType: car.carType,
        seatNumber: car.seatNumber,
      });
    }
    console.log("\n");
  }

  // 4. Fetch Tier
  if (driver && driver.currentTier) {
    const tier = await Tier.findById(driver.currentTier);
    console.log("=== TIER DOCUMENT ===");
    if (!tier) {
      console.error("❌ Tier not found!");
    } else {
      console.log(JSON.stringify(tier, null, 2));
    }
    console.log("\n");
  }

  // 5. Check Service Area of pickup location
  const pickupCoordinates = [90.415452, 23.792548]; // Gulshan 2 Circle
  console.log("=== PICKUP LOCATION SERVICE AREA ===");
  const resolvedArea = await ServiceAreaServices.findServiceAreaByCoordinates(
    pickupCoordinates[0],
    pickupCoordinates[1],
  );
  if (!resolvedArea) {
    console.warn("❌ Could not determine service area for coordinates:", pickupCoordinates);
  } else {
    console.log("Resolved Area:", {
      id: resolvedArea._id,
      name: resolvedArea.name,
      status: resolvedArea.status,
      type: resolvedArea.type,
      location: resolvedArea.location,
    });
  }
  console.log("\n");

  // 6. Fetch Ride Category
  const category = await RideCategory.findById(rideCategoryIdStr);
  console.log("=== RIDE CATEGORY DOCUMENT ===");
  if (!category) {
    console.error("❌ Ride Category not found!");
  } else {
    console.log({
      id: category._id,
      name: category.name,
      status: category.status,
      supportsReservation: category.supportsReservation,
      vehicleRequirements: category.vehicleRequirements,
    });
  }
  console.log("\n");

  // 7. Run driver matching function
  console.log("=== RUNNING findEligibleDriversInRadius ===");
  try {
    const eligibleDrivers = await findEligibleDriversInRadius({
      pickupLocation: {
        type: "Point",
        coordinates: pickupCoordinates,
      },
      radiusKm: 5, // typical initial search radius
      rideCategoryId: rideCategoryIdStr,
      serviceCategoryId: serviceCategoryIdStr,
      rideServiceAreaId: resolvedArea?._id?.toString(),
      rideDestination: {
        type: "Point",
        coordinates: [90.368864, 23.746466], // Dhanmondi 27
      },
      rideType: "scheduled",
      scheduledAt: new Date("2026-08-14T10:00:00Z"),
    });

    console.log(`Found ${eligibleDrivers.length} eligible drivers:`);
    console.log(eligibleDrivers);
  } catch (error: any) {
    console.error("❌ Error running matching:", error.message);
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from database.");
}

run().catch(console.error);
