import mongoose from "mongoose";
import config from "../../../config";
import { Permission } from "./permission.model";
import { discoverPermissions } from "./permission.discovery";
import { logger } from "../../../shared/logger";

import { Role } from "../role/role.model";

export const seedPermissions = async (): Promise<void> => {
  const startTime = Date.now();
  try {
    const { permissions, modulesScannedCount } = await discoverPermissions();
    const discoveredCount = permissions.length;
    const validNames = new Set(permissions.map((p) => p.name));

    // Find and delete stale/action-based permissions in DB (e.g. name containing '.' or not in discovered list)
    const stalePermissions = await Permission.find({
      $or: [
        { name: { $nin: Array.from(validNames) } },
        { name: { $regex: /\./ } },
      ],
    });

    let deletedCount = 0;
    if (stalePermissions.length > 0) {
      const staleIds = stalePermissions.map((p) => p._id);
      // Remove stale permission references from Roles
      await Role.updateMany(
        { permissions: { $in: staleIds } },
        { $pull: { permissions: { $in: staleIds } } as any },
      );
      // Delete stale permissions
      const deleteResult = await Permission.deleteMany({
        _id: { $in: staleIds },
      });
      deletedCount = deleteResult.deletedCount || 0;
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const perm of permissions) {
      // Find if permission already exists by name
      const existing = await Permission.findOne({ name: perm.name });

      if (existing) {
        // Ensure module & key are up to date
        await Permission.updateOne(
          { _id: existing._id },
          {
            module: perm.module,
            key: perm.name,
            resource: perm.resource,
            description: perm.description,
          },
        );
        skippedCount++;
        continue;
      }

      // Insert new permission
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
    console.log(`Updated/Skipped: ${skippedCount}`);
    console.log(`Deleted Stale: ${deletedCount}`);
    console.log(`Execution Time: ${executionTime}ms`);
    console.log(`Completed Successfully`);
    console.log(`========================================\n`);

    logger.info(
      `✔ Permission Seeding Completed: Scanned ${modulesScannedCount} modules, Discovered ${discoveredCount}, Inserted ${insertedCount}, Deleted ${deletedCount} in ${executionTime}ms.`,
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
