import mongoose from "mongoose";
import dotenv from "dotenv";
import { ServiceArea } from "../src/app/modules/serviceArea/serviceArea.model";
import { RideCategory } from "../src/app/modules/rideCategory/rideCategory.model";
import { FareConfiguration } from "../src/app/modules/fareConfiguration/fareConfiguration.model";
import { ServiceAreaServices } from "../src/app/modules/serviceArea/serviceArea.service";

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

  const pickupLng = 90.4075871;
  const pickupLat = 23.7809006;

  console.log(
    `=== STEP 1: RESOLVING SERVICE AREA FOR [${pickupLng}, ${pickupLat}] ===`,
  );

  let serviceArea = await ServiceAreaServices.findServiceAreaByCoordinates(
    pickupLng,
    pickupLat,
  );

  if (serviceArea) {
    console.log(`✅ Found Service Area by coordinates:`);
    console.log(`   - ID: ${serviceArea._id}`);
    console.log(
      `   - City/Zone/Airport: ${serviceArea.city || serviceArea.zone || serviceArea.airport || "N/A"}`,
    );
    console.log(`   - City: ${serviceArea.city}`);
    console.log(`   - Status: ${serviceArea.status}`);
  } else {
    console.log(`❌ No Service Area found by coordinates. Trying fallback...`);
    // Fallback logic from ride.service.ts
    // For now we don't have googleMapsHelper here, let's look at all active Service Areas
    const allActiveAreas = await ServiceArea.find({ status: "active" });
    console.log(`   Available Active Service Areas in DB:`);
    allActiveAreas.forEach((sa) => {
      console.log(
        `   - ID: ${sa._id}, City/Zone: ${sa.city || sa.zone || sa.airport || "N/A"}, Status: ${sa.status}`,
      );
    });
  }

  console.log("\n=== STEP 2: LOAD ACTIVE RIDE CATEGORIES ===");
  const categories = await RideCategory.find({ status: "active" });
  console.log(`Found ${categories.length} active ride categories:`);
  categories.forEach((cat) => {
    console.log(`- ID: ${cat._id.toString()}`);
    console.log(`  Name: ${cat.name}`);
    console.log(`  ServiceCategory ID: ${cat.serviceCategoryId?.toString()}`);
  });

  console.log("\n=== STEP 3: CHECK ALL FARE CONFIGURATIONS IN DB ===");
  const fareConfigs = await FareConfiguration.find({});
  console.log(`Found ${fareConfigs.length} total fare configurations in DB:`);
  fareConfigs.forEach((fc, index) => {
    console.log(`[${index + 1}] ID: ${fc._id}`);
    console.log(`    Status: ${fc.status}`);
    console.log(`    serviceAreaId: ${fc.serviceAreaId?.toString()}`);
    console.log(`    serviceCategoryId: ${fc.serviceCategoryId?.toString()}`);
    console.log(`    rideCategoryId: ${fc.rideCategoryId?.toString()}`);
    console.log(`    Base Fare: ${fc.baseFare}, Per Km: ${fc.perKmFare}`);
  });

  if (serviceArea) {
    console.log("\n=== STEP 4: SIMULATING QUERY FOR EACH ACTIVE CATEGORY ===");
    for (const cat of categories) {
      console.log(`\nChecking Ride Category: ${cat.name} (${cat._id})`);

      const query1 = {
        serviceAreaId: serviceArea._id,
        serviceCategoryId: cat.serviceCategoryId,
        rideCategoryId: cat._id,
        status: "active",
      };
      console.log(`- Trying Query 1 (Specific):`, JSON.stringify(query1));
      let fc = await FareConfiguration.findOne(query1);
      if (fc) {
        console.log(`  ✅ Match found! ID: ${fc._id}`);
        continue;
      }

      const query2 = {
        serviceAreaId: serviceArea._id,
        serviceCategoryId: { $exists: false },
        rideCategoryId: cat._id,
        status: "active",
      };
      console.log(
        `- Trying Query 2 (No ServiceCategory):`,
        JSON.stringify(query2),
      );
      fc = await FareConfiguration.findOne(query2);
      if (fc) {
        console.log(`  ✅ Match found! ID: ${fc._id}`);
        continue;
      }

      const query3 = {
        serviceAreaId: { $exists: false },
        serviceCategoryId: cat.serviceCategoryId,
        rideCategoryId: cat._id,
        status: "active",
      };
      console.log(
        `- Trying Query 3 (Global ServiceCategory):`,
        JSON.stringify(query3),
      );
      fc = await FareConfiguration.findOne(query3);
      if (fc) {
        console.log(`  ✅ Match found! ID: ${fc._id}`);
        continue;
      }

      const query4 = {
        serviceAreaId: { $exists: false },
        serviceCategoryId: { $exists: false },
        rideCategoryId: cat._id,
        status: "active",
      };
      console.log(`- Trying Query 4 (Global):`, JSON.stringify(query4));
      fc = await FareConfiguration.findOne(query4);
      if (fc) {
        console.log(`  ✅ Match found! ID: ${fc._id}`);
        continue;
      }

      console.log(
        `  ❌ No matching active Fare Configuration found for category ${cat.name}!`,
      );
    }
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from database.");
}

run().catch(console.error);
