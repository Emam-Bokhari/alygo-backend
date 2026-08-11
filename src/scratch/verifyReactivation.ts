import mongoose from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { UserService } from "../app/modules/user/user.service";
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
    await User.deleteMany({ email: "reactivation_test@alygo.com" });

    // 1. Normal Active Record Setup
    console.log("\n--- TEST 1 & 2 & 3 & 4: User status reactivation lifecycle ---");
    console.log("Creating active user...");
    const testUser = await User.create({
      name: "Reactivation Test User",
      email: "reactivation_test@alygo.com",
      phone: "+15551112222",
      countryCode: "+1",
      role: USER_ROLES.USER,
      status: STATUS.ACTIVE,
    });

    const userId = (testUser._id as mongoose.Types.ObjectId).toString();

    // Verify initial state
    const createdUser = await User.findById(userId);
    assert(createdUser !== null, "User was successfully created.");
    assert(createdUser?.status === STATUS.ACTIVE, "Initial status is active.");
    assert((createdUser as any).isDeleted === false, "Initial isDeleted is false.");

    // Test 1: Normal Active Record to Inactive
    console.log("\nUpdating status to inactive...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.INACTIVE);

    const inactiveUser = await User.findById(userId);
    assert(inactiveUser !== null, "User found by findById.");
    assert(inactiveUser?.status === STATUS.INACTIVE, "Status successfully changed to inactive.");
    assert((inactiveUser as any).isDeleted === false, "isDeleted remains false.");

    // Test 2: Soft Delete
    console.log("\nSoft deleting the user...");
    await User.softDeleteById(userId);

    // Verify it is no longer visible to normal queries
    const findNormal = await User.findById(userId);
    assert(findNormal === null, "Soft-deleted user is not returned by normal findById query.");

    // Verify state with deleted documents included
    const softDeletedUser = await User.findOne({ _id: userId }).setOptions({ withDeleted: true });
    assert(softDeletedUser !== null, "Soft-deleted user found using setOptions({ withDeleted: true }).");
    assert(softDeletedUser?.status === STATUS.INACTIVE, "Status remains inactive.");
    assert((softDeletedUser as any).isDeleted === true, "isDeleted is now true.");

    // Test 3: Reactivation (inactive -> active)
    console.log("\nReactivating the user status to active...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.ACTIVE);

    // Verify that the user is now restored and visible to normal queries
    const restoredUser = await User.findById(userId);
    assert(restoredUser !== null, "Reactivated user is now visible to normal findById query.");
    assert(restoredUser?.status === STATUS.ACTIVE, "Status successfully updated to active.");
    assert((restoredUser as any).isDeleted === false, "isDeleted is successfully restored to false.");

    // Test 4: Already Active Record
    console.log("\nUpdating active record to active again...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.ACTIVE);
    const reActiveUser = await User.findById(userId);
    assert(reActiveUser !== null, "User is still visible.");
    assert(reActiveUser?.status === STATUS.ACTIVE, "Status remains active.");
    assert((reActiveUser as any).isDeleted === false, "isDeleted remains false.");

    // Test 5: Soft-Deleted Record With Unrelated Update
    console.log("\n--- TEST 5: Soft-Deleted Record With Unrelated Update ---");
    console.log("Setting user to inactive and soft-deleting again...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.INACTIVE);
    await User.softDeleteById(userId);

    // Perform an unrelated update (e.g. name update) using findOneAndUpdate
    console.log("Performing unrelated update (changing name)...");
    const unrelatedUpdateResult = await User.findOneAndUpdate(
      { _id: userId },
      { name: "New Reactivation Name" },
      { new: true }
    ).setOptions({ withDeleted: true });

    assert(unrelatedUpdateResult !== null, "Unrelated update document returned.");
    assert(unrelatedUpdateResult?.name === "New Reactivation Name", "Name updated successfully.");
    assert((unrelatedUpdateResult as any).isDeleted === true, "isDeleted remains true.");
    assert(unrelatedUpdateResult?.status === STATUS.INACTIVE, "Status remains inactive.");

    const normalFindUnrelated = await User.findById(userId);
    assert(normalFindUnrelated === null, "User still not visible to normal queries.");

    // Test 6: Normal Status Changes
    console.log("\n--- TEST 6: Normal Status Changes ---");
    console.log("Reactivating user...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.ACTIVE);

    // Verify active -> inactive does not change isDeleted
    console.log("Updating active user to inactive...");
    await UserService.updateUserStatusByIdToDB(userId, STATUS.INACTIVE);
    const normalInactiveUser = await User.findById(userId);
    assert(normalInactiveUser !== null, "User remains visible after active -> inactive transition.");
    assert(normalInactiveUser?.status === STATUS.INACTIVE, "Status is inactive.");
    assert((normalInactiveUser as any).isDeleted === false, "isDeleted is still false.");

    // Cleanup
    console.log("\nCleaning up test user...");
    await User.deleteMany({ email: "reactivation_test@alygo.com" });

    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
