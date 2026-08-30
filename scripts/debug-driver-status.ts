import mongoose from "mongoose";
import config from "../src/config";
import { Driver } from "../src/app/modules/driver/driver.model";
import { getSystemConfig } from "../src/helpers/systemConfigHelper";

async function run() {
  await mongoose.connect(config.database_url as string);
  console.log("Database connected.");

  const userId = "6a59af155d294c2c4111585d";
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    console.log("Driver not found!");
    process.exit(0);
  }

  console.log("=== Driver Details ===");
  console.log("driverAvailabilityStatus:", driver.driverAvailabilityStatus);
  console.log("availability:", JSON.stringify(driver.availability, null, 2));
  console.log("lastVerificationDate:", driver.lastVerificationDate);

  const systemConfig = await getSystemConfig();
  console.log("=== System Config ===");
  console.log(
    "driverSelfieVerificationIntervalMinutes:",
    systemConfig.driverSelfieVerificationIntervalMinutes,
  );

  const now = new Date();
  const intervalMinutes =
    systemConfig.driverSelfieVerificationIntervalMinutes ?? 720;
  const intervalMs = intervalMinutes * 60 * 1000;
  const thresholdDate = new Date(Date.now() - intervalMs);
  console.log("Current Time:", now);
  console.log("Threshold Date:", thresholdDate);
  if (driver.lastVerificationDate) {
    const timeSinceLast =
      Date.now() - new Date(driver.lastVerificationDate).getTime();
    console.log("Time since last verification (ms):", timeSinceLast);
    console.log("Interval (ms):", intervalMs);
    console.log("Is expired?", timeSinceLast > intervalMs);
  } else {
    console.log("lastVerificationDate is missing, so it is expired.");
  }

  process.exit(0);
}

run().catch(console.error);
