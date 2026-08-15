import mongoose from "mongoose";
import dotenv from "dotenv";
import { FareConfiguration } from "../src/app/modules/fareConfiguration/fareConfiguration.model";

dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not defined in env");
    process.exit(1);
  }

  console.log("Connecting to database...", dbUrl);
  await mongoose.connect(dbUrl);
  console.log("Connected successfully.\n");

  const airportServiceAreaId = "6a6af42690eaf8727971f604";
  
  // Define configs to upsert
  const configsToInsert = [
    {
      serviceAreaId: new mongoose.Types.ObjectId(airportServiceAreaId),
      serviceCategoryId: new mongoose.Types.ObjectId("6a59afef5d294c2c4111586e"),
      rideCategoryId: new mongoose.Types.ObjectId("6a59b093ec029a501f10cd62"), // Alygo Standard
      baseFare: 10,
      perKmFare: 3.0,
      perMinuteFare: 1.0,
      waitingFeePerMinute: 0.5,
      minimumFare: 15,
      status: "active"
    },
    {
      serviceAreaId: new mongoose.Types.ObjectId(airportServiceAreaId),
      rideCategoryId: new mongoose.Types.ObjectId("6a6af42890eaf8727971f6a9"), // Alygo Standard (no serviceCategory)
      baseFare: 10,
      perKmFare: 3.0,
      perMinuteFare: 1.0,
      waitingFeePerMinute: 0.5,
      minimumFare: 15,
      status: "active"
    },
    {
      serviceAreaId: new mongoose.Types.ObjectId(airportServiceAreaId),
      rideCategoryId: new mongoose.Types.ObjectId("6a799124f155e239daf652d8"), // Test for create
      baseFare: 12,
      perKmFare: 3.5,
      perMinuteFare: 1.2,
      waitingFeePerMinute: 0.6,
      minimumFare: 20,
      status: "active"
    }
  ];

  console.log("=== UPSERTING FARE CONFIGURATIONS ===");
  for (const config of configsToInsert) {
    try {
      const query: Record<string, any> = {
        serviceAreaId: config.serviceAreaId,
        rideCategoryId: config.rideCategoryId,
      };
      
      if (config.serviceCategoryId) {
        query.serviceCategoryId = config.serviceCategoryId;
      } else {
        query.serviceCategoryId = { $exists: false };
      }

      const result = await FareConfiguration.findOneAndUpdate(
        query,
        { $set: config },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Upserted Fare Configuration ID: ${result._id} for RideCategory: ${config.rideCategoryId}`);
    } catch (err: any) {
      console.error(`❌ Error upserting configuration: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from database.");
}

run().catch(console.error);
