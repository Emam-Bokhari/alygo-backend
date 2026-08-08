import mongoose, { Types } from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { PassengerManagementServices } from "../app/modules/passengerManagement/passengerManagement.service";
import { STATUS, USER_ROLES } from "../enums/user";

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
    await User.deleteMany({ email: "testpassenger@alygo.com" });

    // 1. Create a test passenger
    console.log("Creating test passenger...");
    const passenger = await User.create({
      name: "Test Passenger",
      role: USER_ROLES.USER,
      email: "testpassenger@alygo.com",
      phone: "1234567890",
      countryCode: "+880",
      verified: true,
      status: STATUS.ACTIVE,
    });
    console.log("Test passenger created with ID:", passenger._id.toString());

    const adminId = new Types.ObjectId().toString();
    const reason = "Violating safety terms";
    const note = "Suspended during automated testing";

    // 2. Verify Suspension
    console.log("Suspending passenger...");
    const suspendResult =
      await PassengerManagementServices.suspendPassengerInDB(
        passenger._id.toString(),
        adminId,
        reason,
        note,
      );
    assert(
      suspendResult.success === true,
      "suspendPassengerInDB should return success: true",
    );

    const suspendedUser = await User.findById(passenger._id);
    assert(suspendedUser !== null, "Passenger should exist in DB");
    assert(
      suspendedUser?.status === STATUS.INACTIVE,
      "Passenger status should be INACTIVE",
    );
    assert(
      suspendedUser?.suspension?.isSuspended === true,
      "isSuspended should be true",
    );
    assert(
      suspendedUser?.suspension?.reason === reason,
      `Reason should be '${reason}'`,
    );
    assert(
      suspendedUser?.suspension?.note === note,
      `Note should be '${note}'`,
    );
    assert(
      suspendedUser?.suspension?.suspendedBy?.toString() === adminId,
      "suspendedBy should match adminId",
    );

    // 3. Verify Unsuspension
    console.log("Unsuspending passenger...");
    const unsuspendResult =
      await PassengerManagementServices.unsuspendPassengerInDB(
        passenger._id.toString(),
        adminId,
      );
    assert(
      unsuspendResult.success === true,
      "unsuspendPassengerInDB should return success: true",
    );

    const unsuspendedUser = await User.findById(passenger._id);
    assert(
      unsuspendedUser?.status === STATUS.ACTIVE,
      "Passenger status should be ACTIVE",
    );
    assert(
      unsuspendedUser?.suspension?.isSuspended === false,
      "isSuspended should be false",
    );
    assert(
      unsuspendedUser?.suspension?.reason === "",
      "Reason should be empty",
    );
    assert(unsuspendedUser?.suspension?.note === "", "Note should be empty");
    assert(
      unsuspendedUser?.suspension?.suspendedBy === null,
      "suspendedBy should be null",
    );

    // 4. Clean up test data
    console.log("Cleaning up test data...");
    await User.deleteMany({ email: "testpassenger@alygo.com" });
    console.log("Cleanup complete.");

    console.log("\n========================================");
    console.log("All passenger suspension checks passed!");
    console.log("========================================\n");
  } catch (error) {
    console.error("Verification failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
    process.exit(0);
  }
}

runVerification();
