import mongoose, { Types } from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Driver } from "../app/modules/driver/driver.model";
import { Car } from "../app/modules/car/car.model";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";
import { RideCategory } from "../app/modules/rideCategory/rideCategory.model";
import { Tier } from "../app/modules/tier/tier.model";
import { AuditLog } from "../app/modules/auditLog/auditLog.model";
import { DriverManagementServices } from "../app/modules/driverManagement/driverManagement.service";
import { findEligibleDriversInRadius } from "../services/driverMatchingService";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../enums/user";
import { VERIFICATION_STATUS } from "../app/modules/driver/driver.constant";

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
    await User.deleteMany({ email: "testdriver@alygo.com" });
    await ServiceArea.deleteMany({ city: "Test Area" });
    await RideCategory.deleteMany({ name: "Test Category" });
    await Tier.deleteMany({ name: "Test Tier Level 1" });
    await Car.deleteMany({ licensePlate: "TESTPLATE" });
    await AuditLog.deleteMany({
      action: {
        $in: [
          "DRIVER_APPROVED",
          "DRIVER_REJECTED",
          "DRIVER_SUSPENDED",
          "DRIVER_UNSUSPENDED",
        ],
      },
    });

    // 1. Setup Service Area
    console.log("Setting up Test Service Area...");
    const serviceArea = await ServiceArea.create({
      city: "Test Area",
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
      name: "Test Category",
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
      name: "Test Tier Level 1",
      code: "test_tier_level_1",
      level: 101, // unique test level
      requirements: {
        pointsRequired: 0,
        tripsRequired: 0,
        ratingRequired: 0,
        acceptanceRateRequired: 0,
      },
      isDeleted: false,
    });

    // 4. Setup User (role: driver, status: active, verified: true)
    console.log("Creating Test Driver User...");
    const user = await User.create({
      name: "Test Driver",
      email: "testdriver@alygo.com",
      phone: "+15555555555",
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
      taxVerified: true,
      taxVerificationStatus: VERIFICATION_STATUS.VERIFIED,
      currentTier: tier._id,
      location: {
        type: "Point",
        coordinates: [90.5, 23.5], // inside the service area
        address: "Test Location",
      },
      availability: {
        canReceiveRide: true,
      },
    });

    // 6. Setup Car Profile (raw insert to bypass Mongoose strict schema filtering of vehicleId index field)
    console.log("Creating Test Car Profile...");
    await Car.collection.insertOne({
      driverId: driver._id,
      brand: "Toyota",
      model: "Camry",
      year: 2020,
      carType: "sedan",
      seatNumber: 4,
      licensePlate: "TESTPLATE",
      vehicleId: new Types.ObjectId().toString(),
      isVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // --- REQUIREMENT CHECKS ---

    // Verification 1: Starts as Pending Approval and Not Approved
    console.log("\n--- Verification 1: Pending Approval Check ---");
    const freshDriver = await Driver.findById(driver._id);
    assert(
      freshDriver?.approvalStatus === DRIVER_STATUS.PENDING,
      "Starts with approvalStatus = 'pending'",
    );

    // Verification 2: Appears in Pending Approval list
    const pendingList =
      await DriverManagementServices.getPendingApprovalDriversFromDB({});
    const foundInPending = pendingList.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(foundInPending, "Driver appears in the Pending Approval API");

    // Verification 3: Driver must NOT enter ride matching queue
    console.log("\n--- Verification 2: Ride Matching Exclusion Check ---");
    let eligibleDrivers = await findEligibleDriversInRadius({
      pickupLocation: { type: "Point", coordinates: [90.5, 23.5] },
      radiusKm: 10,
      rideCategoryId: rideCategory._id.toString(),
      rideServiceAreaId: serviceArea._id.toString(),
    });
    const foundInMatchingBefore = eligibleDrivers.some(
      (d: any) => d.driverId.toString() === user._id.toString(),
    );
    assert(
      !foundInMatchingBefore,
      "Unapproved driver is excluded from ride matching queue",
    );

    // Verification 4: Driver must NOT appear in Online Drivers
    const onlineListBefore =
      await DriverManagementServices.getOnlineDriversFromDB({});
    const foundInOnlineBefore = onlineListBefore.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(
      !foundInOnlineBefore,
      "Unapproved driver is excluded from Online Drivers list",
    );

    // Verification 5: Admin Approves Driver
    console.log("\n--- Verification 3: Driver Approval Flow ---");
    // Mock user._id as the adminId executing this action
    await DriverManagementServices.approveDriverInDB(
      driver._id.toString(),
      user._id.toString(),
    );
    const approvedDriver = await Driver.findById(driver._id);
    assert(
      approvedDriver?.approvalStatus === DRIVER_STATUS.APPROVED,
      "Updates approvalStatus to 'approved'",
    );

    // Verification 6: Disappears from Pending Approval
    const pendingListAfter =
      await DriverManagementServices.getPendingApprovalDriversFromDB({});
    const foundInPendingAfter = pendingListAfter.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(
      !foundInPendingAfter,
      "Approved driver disappears from Pending Approval",
    );

    // Verification 7: Appears in Online Drivers
    const onlineListAfter =
      await DriverManagementServices.getOnlineDriversFromDB({});
    const foundInOnlineAfter = onlineListAfter.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(foundInOnlineAfter, "Approved driver appears in Online Drivers");

    // Verification 8: Driver is now eligible for ride matching
    eligibleDrivers = await findEligibleDriversInRadius({
      pickupLocation: { type: "Point", coordinates: [90.5, 23.5] },
      radiusKm: 10,
      rideCategoryId: rideCategory._id.toString(),
      rideServiceAreaId: serviceArea._id.toString(),
    });
    const foundInMatchingAfter = eligibleDrivers.some(
      (d: any) => d.driverId.toString() === user._id.toString(),
    );
    assert(
      foundInMatchingAfter,
      "Approved driver is returned in the ride matching queue",
    );

    // Verification 9: Driver Suspension
    console.log("\n--- Verification 4: Suspension Flow ---");
    await DriverManagementServices.suspendDriverInDB(
      driver._id.toString(),
      user._id.toString(),
      "Fraud",
      "Suspended for testing",
    );
    const suspendedUser = await User.findById(user._id);
    assert(
      suspendedUser?.status === STATUS.INACTIVE,
      "User status is updated to 'inactive'",
    );

    const suspendedDriver = await Driver.findById(driver._id);
    assert(
      suspendedDriver?.suspension?.isSuspended === true,
      "suspension.isSuspended is true",
    );
    assert(
      suspendedDriver?.suspension?.reason === "Fraud",
      "suspension.reason is saved",
    );
    assert(
      suspendedDriver?.suspension?.note === "Suspended for testing",
      "suspension.note is saved",
    );

    // Verification 10: Suspended driver disappears from Online Drivers
    const onlineListSuspended =
      await DriverManagementServices.getOnlineDriversFromDB({});
    const foundInOnlineSuspended = onlineListSuspended.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(
      !foundInOnlineSuspended,
      "Suspended driver disappears from Online Drivers list",
    );

    // Verification 11: Suspended driver disappears from matching queue
    eligibleDrivers = await findEligibleDriversInRadius({
      pickupLocation: { type: "Point", coordinates: [90.5, 23.5] },
      radiusKm: 10,
      rideCategoryId: rideCategory._id.toString(),
      rideServiceAreaId: serviceArea._id.toString(),
    });
    const foundInMatchingSuspended = eligibleDrivers.some(
      (d: any) => d.driverId.toString() === user._id.toString(),
    );
    assert(
      !foundInMatchingSuspended,
      "Suspended driver is excluded from ride matching queue",
    );

    // Verification 12: Appears in Suspended Drivers list
    const suspendedList =
      await DriverManagementServices.getSuspendedDriversFromDB({});
    const foundInSuspended = suspendedList.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(
      foundInSuspended,
      "Suspended driver appears in Suspended Drivers list",
    );

    // Unsuspend driver
    await DriverManagementServices.unsuspendDriverInDB(
      driver._id.toString(),
      user._id.toString(),
    );
    const activeUser = await User.findById(user._id);
    assert(
      activeUser?.status === STATUS.ACTIVE,
      "Unsuspend updates User status to 'active'",
    );

    // Verification 13: Compliance Filters
    console.log("\n--- Verification 5: Compliance Flow ---");
    // Set driving license to be expired
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await Driver.findByIdAndUpdate(driver._id, {
      licenseExpiryDate: yesterday,
    });

    const complianceList =
      await DriverManagementServices.getComplianceDriversFromDB({
        complianceStatus: "expired",
      });
    const foundInCompliance = complianceList.data.some(
      (d: any) => d._id.toString() === driver._id.toString(),
    );
    assert(
      foundInCompliance,
      "Driver appears in Compliance list under expired status",
    );

    // Verification 14: Details API rounded averageRating & raw float preserved
    console.log("\n--- Verification 6: Details API ---");
    // Set float rating in DB manually
    await Driver.findByIdAndUpdate(driver._id, { averageRating: 4.67 });
    const details = await DriverManagementServices.getDriverDetailsFromDB(
      driver._id.toString(),
    );
    assert(
      details.rating.averageRating === 5,
      "averageRating in API output is rounded to 5 (Integer)",
    );

    const dbDriverAfter = await Driver.findById(driver._id);
    assert(
      dbDriverAfter?.averageRating === 4.67,
      "averageRating in Database remains 4.67 (Float preserved)",
    );

    // Verification 15: Audit Logs
    console.log("\n--- Verification 7: Audit Logging Check ---");
    const auditLogs = await AuditLog.find({
      action: {
        $in: ["DRIVER_APPROVED", "DRIVER_SUSPENDED", "DRIVER_UNSUSPENDED"],
      },
    });
    assert(
      auditLogs.length >= 3,
      `At least 3 admin actions recorded in AuditLog (Found: ${auditLogs.length})`,
    );

    console.log("\nALL VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } catch (error: any) {
    console.error("Verification failed:", error.stack || error.message);
    process.exit(1);
  } finally {
    console.log("Cleaning up test data...");
    await User.deleteMany({ email: "testdriver@alygo.com" });
    await ServiceArea.deleteMany({ city: "Test Area" });
    await RideCategory.deleteMany({ name: "Test Category" });
    await Tier.deleteMany({ name: "Test Tier Level 1" });
    await Car.deleteMany({ licensePlate: "TESTPLATE" });
    await AuditLog.deleteMany({
      action: {
        $in: [
          "DRIVER_APPROVED",
          "DRIVER_REJECTED",
          "DRIVER_SUSPENDED",
          "DRIVER_UNSUSPENDED",
        ],
      },
    });
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

runVerification();
