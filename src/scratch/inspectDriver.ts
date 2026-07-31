import mongoose from "mongoose";
import config from "../config";

async function inspect() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to MongoDB via Mongoose.");
    const db = mongoose.connection.db;
    if (!db) {
      console.log("Mongoose DB is null");
      return;
    }
    const driversCol = db.collection("drivers");

    const driverId = "6a59b25aec029a501f10cd9f";
    const driver = await driversCol.findOne({
      _id: new mongoose.Types.ObjectId(driverId),
    });
    console.log("--- RAW DRIVER DOCUMENT FROM DB ---");
    console.log(driver);
  } catch (error) {
    console.error("Error inspecting:", error);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
