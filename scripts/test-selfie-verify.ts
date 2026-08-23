import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import axios from "axios";
import { Driver } from "../src/app/modules/driver/driver.model";
import { User } from "../src/app/modules/user/user.model";
import { jwtHelper } from "../src/helpers/jwtHelper";

dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  // Connect to DB
  console.log("Connecting to DB...");
  await mongoose.connect(dbUrl);

  // Find a driver
  const driver = await Driver.findOne({});
  if (!driver) {
    console.error("No driver found in the database to test with.");
    process.exit(1);
  }

  // Ensure they have a reference selfie
  const referenceImage = "profile-image-1787365076102.jpg";
  driver.liveSelfie = `/uploads/liveSelfie/${referenceImage}`;
  await driver.save();
  console.log(`Using driver ID: ${driver._id}, user ID: ${driver.userId}`);
  console.log(`Set driver reference selfie to: ${driver.liveSelfie}`);

  // Find the driver's user account to get the role
  const user = await User.findById(driver.userId);
  if (!user) {
    console.error("Driver user account not found.");
    process.exit(1);
  }

  // Generate a JWT token
  const jwtSecret = process.env.JWT_SECRET || "alygo_secret_key";
  const token = jwtHelper.createToken(
    { id: user._id.toString(), role: "driver" },
    jwtSecret,
    "1h",
  );
  console.log("Generated JWT Token.");

  // Load a test image file and convert it to Base64
  const testImagePath = path.join(
    process.cwd(),
    "uploads",
    "liveSelfie",
    "frame-2147226136-1786420037181.png",
  );
  if (!fs.existsSync(testImagePath)) {
    console.error("Test image not found at:", testImagePath);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(testImagePath);
  const base64Image = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  console.log("Encoded test image as Base64.");

  // Make the API request
  // The server config port from .env is 5005
  const port = process.env.PORT || "5005";
  const host = process.env.IP || "localhost";
  const url = `http://${host}:${port}/api/v1/drivers/me/verify-selfie`;

  console.log(`Sending POST request to ${url}...`);

  try {
    const response = await axios.post(
      url,
      {
        liveSelfie: base64Image,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("\nSuccess Response:");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("\nError Response:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }

  // Disconnect from DB
  await mongoose.disconnect();
  console.log("\nDisconnected from DB.");
}

run().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
