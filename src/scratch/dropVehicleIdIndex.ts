import mongoose from "mongoose";
import config from "../config";

async function dropIndex() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    if (!db) {
      console.error("Database connection failed.");
      return;
    }

    const carsCol = db.collection("cars");

    // List existing indexes
    console.log("Existing indexes:");
    const indexes = await carsCol.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    const hasVehicleIdIndex = indexes.some((idx) => idx.name === "vehicleId_1");

    if (hasVehicleIdIndex) {
      console.log("Dropping index: vehicleId_1...");
      const result = await carsCol.dropIndex("vehicleId_1");
      console.log("Drop index result:", result);

      console.log("Indexes after dropping:");
      const newIndexes = await carsCol.indexes();
      console.log(JSON.stringify(newIndexes, null, 2));
    } else {
      console.log(
        "Index vehicleId_1 was not found in the collection. (It might have already been dropped.)",
      );
    }
  } catch (error) {
    console.error("Error dropping index:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

dropIndex();
