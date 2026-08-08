import mongoose, { Types } from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Driver } from "../app/modules/driver/driver.model";
import { Car } from "../app/modules/car/car.model";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";
import { RideCategory } from "../app/modules/rideCategory/rideCategory.model";
import { Tier } from "../app/modules/tier/tier.model";
import { Ride } from "../app/modules/ride/ride.model";
import { DriverManagementServices } from "../app/modules/driverManagement/driverManagement.service";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../enums/user";
import { VERIFICATION_STATUS } from "../app/modules/driver/driver.constant";
import { RIDE_STATUS } from "../app/modules/ride/ride.constant";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
};

async function runVerification() {
  try {
    console.log("Connecting to database:", config.database_url);
    await mongoose.connect(config.database_url as string);
    console.log("Database connected successfully.");

    // Clean up any old test data
    console.log("Cleaning up previous test data...");
    await User.deleteMany({ email: "overviewdriver@alygo.com" });
    await ServiceArea.deleteMany({ city: "Overview Area" });
    await RideCategory.deleteMany({ name: "Overview Standard" });
    await Tier.deleteMany({ name: "Overview Journey Tier" });
    await Tier.deleteMany({ name: "Overview Elite Tier" });
    await Car.deleteMany({ licensePlate: "OVERPLATE" });
    await Ride.deleteMany({ driverId: { $ne: new Types.ObjectId() } }); // will clean up selectively below

    // 1. Setup Service Area
    console.log("Setting up Test Service Area...");
    const serviceArea = await ServiceArea.create({
      city: "Overview Area",
      type: "city",
      status: "active",
      timezone: "UTC",
      location: {
        type: "Point",
        coordinates: [90.5, 23.5],
      },
      coverageRadiusKm: 50,
    });

    // 2. Setup Ride Category
    console.log("Setting up Test Ride Category...");
    const rideCategory = await RideCategory.create({
      name: "Overview Standard",
      status: "active",
      commissionRate: 15,
      minimumDriverRating: 1,
      vehicleRequirements: {
        vehicleTypes: ["sedan"],
        minimumSeats: 4,
      },
    });

    // 3. Setup Tier
    console.log("Setting up Test Tier...");
    const tier = await Tier.create({
      name: "Overview Journey Tier",
      code: "overview_journey",
      level: 2,
      requirements: {
        pointsRequired: 10,
        tripsRequired: 1,
        ratingRequired: 4.0,
        acceptanceRateRequired: 80,
      },
      isDeleted: false,
    });

    const nextTier = await Tier.create({
      name: "Overview Elite Tier",
      code: "overview_elite",
      level: 3,
      requirements: {
        pointsRequired: 50,
        tripsRequired: 20,
        ratingRequired: 4.5,
        acceptanceRateRequired: 90,
      },
      isDeleted: false,
    });

    // 4. Setup User
    console.log("Creating Test Driver User...");
    const user = await User.create({
      name: "Overview Driver",
      email: "overviewdriver@alygo.com",
      phone: "+15559998888",
      countryCode: "+1",
      role: USER_ROLES.DRIVER,
      status: STATUS.ACTIVE,
      verified: true,
    });

    // 5. Setup Driver Profile
    console.log("Creating Test Driver Profile...");
    const driver = await Driver.create({
      userId: user._id,
      serviceAreaId: serviceArea._id,
      driverAvailabilityStatus: "online",
      approvalStatus: DRIVER_STATUS.APPROVED,
      taxVerified: true,
      taxVerificationStatus: VERIFICATION_STATUS.VERIFIED,
      backgroundCheckStatus: VERIFICATION_STATUS.VERIFIED,
      identityVerificationStatus: VERIFICATION_STATUS.VERIFIED,
      currentPoints: 20, // Meets tier requirements
      averageRating: 4.2, // Meets tier requirements
      currentTier: tier._id,
      nextTier: nextTier._id,
      progressPercentage: 45,
      location: {
        type: "Point",
        coordinates: [90.5, 23.5],
        address: "Overview City Address, Dhaka",
      },
      availability: {
        canReceiveRide: true,
      },
    });

    // 6. Setup Car
    console.log("Creating Test Car Profile...");
    await Car.collection.insertOne({
      driverId: driver._id,
      brand: "Toyota",
      model: "Corolla",
      year: 2021,
      carType: "sedan",
      seatNumber: 5,
      licensePlate: "OVERPLATE",
      vehicleId: new Types.ObjectId().toString(),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 7. Setup completed ride (to verify completed trips count)
    console.log("Creating Test Completed Ride...");
    await Ride.collection.insertOne({
      userId: new Types.ObjectId(),
      driverId: user._id,
      status: RIDE_STATUS.COMPLETED,
      pickupLocation: { type: "Point", coordinates: [90.5, 23.5] },
      destinationLocation: { type: "Point", coordinates: [90.6, 23.6] },
      fare: 20,
      paymentStatus: "paid",
    });

    // --- EXECUTE OVERVIEW API SERVICE CALL ---
    console.log("\nQuerying Drivers Overview...");
    const overview = await DriverManagementServices.getDriversOverviewFromDB({
      searchTerm: "Overview Driver",
    });

    assert(
      overview.data.length === 1,
      "Should find 1 driver matching the search term",
    );
    const item = overview.data[0];
    console.log("ITEM IS:", JSON.stringify(item, null, 2));

    assert(
      item.fullName === "Overview Driver",
      `fullName should be 'Overview Driver', got ${item.fullName}`,
    );
    assert(
      item.driverId._id === driver._id.toString(),
      "driverId should match",
    );
    assert(item.userId?._id === user._id.toString(), "userId should match");
    assert(
      item.city === "Overview City Address",
      `city should be parsed from location address, got: ${item.city}`,
    );
    assert(
      item.vehicle === "Toyota Corolla",
      `vehicle should match, got: ${item.vehicle}`,
    );
    assert(
      item.rideCategories.includes("Overview Standard"),
      "Should match active ride category 'Overview Standard'",
    );
    assert(
      item.completedTrips === 1,
      `completedTrips should be 1, got ${item.completedTrips}`,
    );
    assert(
      item.tier === "Overview Journey Tier",
      `tier should be 'Overview Journey Tier', got ${item.tier}`,
    );
    assert(
      item.tierProgress === "45% To Overview Elite Tier",
      `tierProgress should match progressPercentage & nextTier name, got: ${item.tierProgress}`,
    );
    assert(
      item.tierStatus === "Active",
      `tierStatus should be Active when meeting requirements, got: ${item.tierStatus}`,
    );

    // Now test "at risk" status by changing averageRating to be below requirement (4.0)
    console.log(
      "\nUpdating driver rating below requirement to test 'at risk' tier status...",
    );
    await Driver.findByIdAndUpdate(driver._id, { averageRating: 3.5 });

    const updatedOverview =
      await DriverManagementServices.getDriversOverviewFromDB({
        searchTerm: "Overview Driver",
      });
    const updatedItem = updatedOverview.data[0];
    assert(
      updatedItem.tierStatus === "at risk",
      `tierStatus should become 'at risk' when rating drops below 4.0, got: ${updatedItem.tierStatus}`,
    );

    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("Verification failed:", error.stack || error.message);
    process.exit(1);
  } finally {
    console.log("Cleaning up test data...");
    await User.deleteMany({ email: "overviewdriver@alygo.com" });
    await ServiceArea.deleteMany({ city: "Overview Area" });
    await RideCategory.deleteMany({ name: "Overview Standard" });
    await Tier.deleteMany({ name: "Overview Journey Tier" });
    await Tier.deleteMany({ name: "Overview Elite Tier" });
    await Car.deleteMany({ licensePlate: "OVERPLATE" });
    const testUser = await User.findOne({ email: "overviewdriver@alygo.com" });
    if (testUser) {
      await Ride.deleteMany({ driverId: testUser._id });
    }
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

runVerification();
