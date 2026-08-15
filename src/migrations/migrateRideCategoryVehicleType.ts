import mongoose from "mongoose";
import { RideCategory } from "../app/modules/rideCategory/rideCategory.model";
import config from "../config";
import { logger } from "../shared/logger";

export const migrateRideCategoryVehicleType = async () => {
  try {
    // Fetch all documents including soft-deleted ones
    const categories = await RideCategory.find({})
      .setOptions({ withDeleted: true })
      .lean();
    logger.info(`Found ${categories.length} ride categories in database.`);

    let migratedCount = 0;
    for (const cat of categories) {
      const requirements = cat.vehicleRequirements as any;
      if (!requirements) continue;

      const legacyTypes = requirements.vehicleTypes;
      const currentType = requirements.vehicleType;

      if (Array.isArray(legacyTypes) && legacyTypes.length > 0) {
        const resolvedType = currentType || legacyTypes[0];
        logger.info(
          `Migrating category "${cat.name}" (${cat._id}): setting vehicleType to "${resolvedType}" and unsetting legacy vehicleTypes.`,
        );

        await RideCategory.collection.updateOne(
          { _id: cat._id },
          {
            $set: { "vehicleRequirements.vehicleType": resolvedType },
            $unset: { "vehicleRequirements.vehicleTypes": 1 },
          },
        );
        migratedCount++;
      } else {
        logger.info(
          `Category "${cat.name}" (${cat._id}) is already using vehicleType: "${currentType || "none"}". No action needed.`,
        );
      }
    }

    logger.info(`Migration complete. Updated ${migratedCount} categories.`);
    return migratedCount;
  } catch (error: any) {
    logger.error("Error during migration:", error);
    throw error;
  }
};

if (require.main === module) {
  const dbUrl = config.database_url;
  if (!dbUrl) {
    logger.error("No DATABASE_URL found in configuration.");
    process.exit(1);
  }

  mongoose
    .connect(dbUrl)
    .then(async () => {
      logger.info(
        "Connected to MongoDB for RideCategory vehicleType migration",
      );
      await migrateRideCategoryVehicleType();
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration connection error:", error);
      process.exit(1);
    });
}
