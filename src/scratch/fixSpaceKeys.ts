import mongoose from "mongoose";
import config from "../config";

async function fixKeys() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to database.");
    const db = mongoose.connection.db;
    if (!db) {
      console.log("Database connection is not ready.");
      return;
    }

    const driversCol = db.collection("drivers");

    // Find all drivers that have the field "approvalStatus " (with trailing space)
    const driversWithTrailingSpace = await driversCol
      .find({ "approvalStatus ": { $exists: true } })
      .toArray();
    console.log(
      `Found ${driversWithTrailingSpace.length} drivers with trailing space in "approvalStatus ".`,
    );

    for (const driver of driversWithTrailingSpace) {
      console.log(`Fixing driver ID: ${driver._id}`);
      // Rename field from "approvalStatus " to "approvalStatus"
      const res = await driversCol.updateOne(
        { _id: driver._id },
        {
          $set: { approvalStatus: driver["approvalStatus "] },
          $unset: { "approvalStatus ": "" },
        },
      );
      console.log("Update result:", res);
    }

    console.log("Cleanup and verification complete.");
  } catch (error) {
    console.error("Error running migration script:", error);
  } finally {
    await mongoose.disconnect();
  }
}

fixKeys();
