import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load env
dotenv.config();

import { Driver } from "../src/app/modules/driver/driver.model";
import { User } from "../src/app/modules/user/user.model";
import { ServiceArea } from "../src/app/modules/serviceArea/serviceArea.model";
import { Car } from "../src/app/modules/car/car.model";
import { Ride } from "../src/app/modules/ride/ride.model";
import { RideCategory } from "../src/app/modules/rideCategory/rideCategory.model";

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  console.log("Connecting to database...", dbUrl);
  await mongoose.connect(dbUrl);
  console.log("Connected successfully.\n");

  const driverIdStr = "6a86954621b16d027663bdaf";
  const userIdStr = "6a59af155d294c2c4111585d";

  console.log("=== DIAGNOSING DRIVER ===");
  const driver = await Driver.findOne({
    $or: [
      { _id: new mongoose.Types.ObjectId(driverIdStr) },
      { userId: new mongoose.Types.ObjectId(userIdStr) },
    ],
  });

  if (!driver) {
    console.log("❌ Driver not found in Driver collection with either ID.");
    await mongoose.disconnect();
    return;
  }

  console.log("Driver found:", {
    _id: driver._id.toString(),
    userId: driver.userId.toString(),
    driverAvailabilityStatus: driver.driverAvailabilityStatus,
    approvalStatus: driver.approvalStatus,
    isDeleted: driver.isDeleted,
    location: driver.location,
    serviceAreaId: driver.serviceAreaId?.toString(),
    availability: driver.availability,
    suspension: driver.suspension,
  });

  // Check 1: driverAvailabilityStatus must be "online"
  if (driver.driverAvailabilityStatus !== "online") {
    console.log("❌ Fail: driverAvailabilityStatus is NOT 'online'");
  } else {
    console.log("✅ Pass: driverAvailabilityStatus is 'online'");
  }

  // Check 2: approvalStatus must be "approved"
  if (driver.approvalStatus !== "approved") {
    console.log("❌ Fail: approvalStatus is NOT 'approved'");
  } else {
    console.log("✅ Pass: approvalStatus is 'approved'");
  }

  // Check 3: suspension is not suspended
  if (driver.suspension?.isSuspended) {
    console.log("❌ Fail: driver is suspended");
  } else {
    console.log("✅ Pass: driver is not suspended");
  }

  // Check 4: Check if User exists, role is driver, status is active, verified is true
  const user = await User.findById(driver.userId);
  if (!user) {
    console.log("❌ Fail: User document not found in User collection!");
  } else {
    console.log("User document:", {
      _id: user._id.toString(),
      role: user.role,
      status: user.status,
      verified: user.verified,
    });
    if (user.role !== "driver") {
      console.log("❌ Fail: User role is not 'driver'");
    } else {
      console.log("✅ Pass: User role is 'driver'");
    }
    if (user.status !== "active") {
      console.log("❌ Fail: User status is not 'active'");
    } else {
      console.log("✅ Pass: User status is 'active'");
    }
    if (!user.verified) {
      console.log("❌ Fail: User verified status is false");
    } else {
      console.log("✅ Pass: User is verified");
    }
  }

  // Check 5: Check Service Area
  if (!driver.serviceAreaId) {
    console.log("❌ Fail: Driver does not have a serviceAreaId assigned");
  } else {
    const serviceArea = await ServiceArea.findById(driver.serviceAreaId);
    if (!serviceArea) {
      console.log(
        `❌ Fail: Service area ${driver.serviceAreaId} not found in DB`,
      );
    } else {
      console.log("Service Area details:", {
        _id: serviceArea._id.toString(),
        name: serviceArea.name,
        status: serviceArea.status,
        type: serviceArea.type,
        location: serviceArea.location,
        coverageRadiusKm: serviceArea.coverageRadiusKm,
      });

      if (serviceArea.status !== "active") {
        console.log("❌ Fail: Service area is not active");
      } else {
        console.log("✅ Pass: Service area is active");
      }

      // Check distance to service area center
      if (driver.location?.coordinates && serviceArea.location?.coordinates) {
        const [dLng, dLat] = driver.location.coordinates;
        const [sLng, sLat] = serviceArea.location.coordinates;
        const dist = calculateDistance(dLat, dLng, sLat, sLng);
        const radius = serviceArea.coverageRadiusKm || 25;
        console.log(
          `Driver distance to service area center: ${dist.toFixed(2)} km (coverage: ${radius} km)`,
        );
        if (dist > radius) {
          console.log(
            "❌ Fail: Driver location is outside service area coverage!",
          );
        } else {
          console.log(
            "✅ Pass: Driver location is within service area coverage",
          );
        }
      } else {
        console.log("❌ Fail: Driver or Service Area has missing coordinates");
      }
    }
  }

  // Check 6: Check availability.canReceiveRide
  if (!driver.availability?.canReceiveRide) {
    console.log(
      `❌ Fail: availability.canReceiveRide is false. Reason: ${driver.availability?.blockedReason}`,
    );
  } else {
    console.log("✅ Pass: availability.canReceiveRide is true");
  }

  // Check 7: Active ride search
  const now = new Date();
  const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const activeRide = await Ride.findOne({
    driverId: driver.userId,
    $or: [
      {
        rideType: { $ne: "scheduled" },
        status: {
          $in: [
            "driver_accepted",
            "driver_on_the_way",
            "driver_arrived",
            "started",
          ],
        },
      },
      {
        rideType: "scheduled",
        status: {
          $in: ["driver_on_the_way", "driver_arrived", "started"],
        },
      },
      {
        rideType: "scheduled",
        status: "driver_accepted",
        scheduledAt: { $lte: imminentWindowEnd },
      },
    ],
  });

  if (activeRide) {
    console.log(
      `❌ Fail: Driver has active ride ${activeRide._id} with status ${activeRide.status}`,
    );
  } else {
    console.log("✅ Pass: Driver has no active rides blocking them");
  }

  // Check 8: Check Car
  const car = await Car.findOne({ driverId: driver._id });
  if (!car) {
    console.log("❌ Fail: Car not found for driver ID in Car collection!");
  } else {
    console.log("Car document found:", {
      _id: car._id.toString(),
      driverId: car.driverId.toString(),
      carType: car.carType,
      seatNumber: car.seatNumber,
      status: (car as any).status,
      isVerified: (car as any).isVerified,
    });
    console.log("✅ Pass: Driver has a car");
  }

  // List all ride categories
  const categories = await RideCategory.find();
  console.log("=== AVAILABLE RIDE CATEGORIES ===");
  categories.forEach((cat) => {
    console.log({
      id: cat._id.toString(),
      name: cat.name,
      vehicleRequirements: cat.vehicleRequirements,
    });
  });

  await mongoose.disconnect();
  console.log("\nDisconnected from database.");
}

run().catch(console.error);
