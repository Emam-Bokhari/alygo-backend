import mongoose from "mongoose";
import config from "../../../config";
import { Permission } from "./permission.model";
import { discoverPermissions } from "./permission.discovery";
import { logger } from "../../../shared/logger";

export const seedPermissions = async (): Promise<void> => {
  const startTime = Date.now();
  try {
    const { permissions, modulesScannedCount } = await discoverPermissions();
    const discoveredCount = permissions.length;

    let insertedCount = 0;
    let skippedCount = 0;

    for (const perm of permissions) {
      // Find if permission already exists by name
      const existing = await Permission.findOne({ name: perm.name });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Insert new permission
      // Keep key/status for backward compatibility
      await Permission.create({
        ...perm,
        key: perm.name,
        status: perm.isActive ? "active" : "inactive",
      });
      insertedCount++;
    }

    const executionTime = Date.now() - startTime;

    console.log(`\n========================================`);
    console.log(`Modules Scanned: ${modulesScannedCount}`);
    console.log(`Permissions Found: ${discoveredCount}`);
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Execution Time: ${executionTime}ms`);
    console.log(`Completed Successfully`);
    console.log(`========================================\n`);

    logger.info(
      `✔ Permission Seeding Completed: Scanned ${modulesScannedCount} modules, Discovered ${discoveredCount}, Inserted ${insertedCount}, Skipped ${skippedCount} in ${executionTime}ms.`,
    );
  } catch (error) {
    logger.error("❌ Permission seeding failed:", error);
    throw error;
  }
};

// If run directly from the command line
if (require.main === module) {
  const runStandalone = async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        console.log("Connecting to database for standalone seeding...");
        await mongoose.connect(config.database_url as string);
        console.log("Database connected.");
      }
      await seedPermissions();
    } catch (error) {
      console.error("Standalone seeding failed:", error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log("Database connection closed.");
      process.exit(0);
    }
  };

  runStandalone();
}
