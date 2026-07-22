/**
 * Data Migration Script: Service Area GeoJSON Migration
 *
 * This script migrates existing Service Area documents to use GeoJSON coordinates
 * instead of relying only on city/airport names.
 *
 * Usage:
 * - Run this script once to migrate existing data
 * - The script is backward compatible and will skip documents that already have coordinates
 * - Documents that can't be geocoded will be left with default coordinates [0, 0]
 */

import mongoose from "mongoose";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";
import { googleMapsHelper } from "../helpers/googleMapsHelper";
import { logger } from "../shared/logger";

interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Migrate Service Area documents to GeoJSON format
 */
export const migrateServiceAreaToGeoJSON =
  async (): Promise<MigrationResult> => {
    const result: MigrationResult = {
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Find all Service Area documents
      const allServiceAreas = await ServiceArea.find({});
      result.total = allServiceAreas.length;

      logger.info(`Found ${result.total} Service Area documents to process`);

      for (const serviceArea of allServiceAreas) {
        try {
          // Skip if already has valid coordinates (not default [0, 0])
          if (
            serviceArea.location &&
            serviceArea.location.coordinates &&
            (serviceArea.location.coordinates[0] !== 0 ||
              serviceArea.location.coordinates[1] !== 0)
          ) {
            result.skipped++;
            logger.info(`Skipped ${serviceArea._id} - already has coordinates`);
            continue;
          }

          // Determine the location string to geocode
          let locationString = "";
          if (serviceArea.type === "airport" && serviceArea.airport) {
            locationString = `${serviceArea.airport}, ${serviceArea.city || ""}`;
          } else if (serviceArea.city) {
            locationString = serviceArea.city;
            if (serviceArea.state) locationString += `, ${serviceArea.state}`;
            if (serviceArea.country)
              locationString += `, ${serviceArea.country}`;
          } else if (serviceArea.state) {
            locationString = serviceArea.state;
            if (serviceArea.country)
              locationString += `, ${serviceArea.country}`;
          } else if (serviceArea.country) {
            locationString = serviceArea.country;
          }

          if (!locationString) {
            logger.warn(
              `No location string found for ${serviceArea._id}, using default coordinates`,
            );
            // Set default coverage radius
            await ServiceArea.findByIdAndUpdate(serviceArea._id, {
              coverageRadiusKm: serviceArea.type === "airport" ? 10 : 25,
            });
            result.failed++;
            continue;
          }

          // Geocode the location string
          logger.info(`Geocoding: ${locationString}`);
          const coordinates = await googleMapsHelper.geocode(locationString);

          // Update the Service Area with GeoJSON location
          const updateData: any = {
            location: {
              type: "Point",
              coordinates: [coordinates.lng, coordinates.lat],
            },
            coverageRadiusKm: serviceArea.type === "airport" ? 10 : 25, // Default coverage radius
          };

          await ServiceArea.findByIdAndUpdate(serviceArea._id, updateData);

          result.migrated++;
          logger.info(
            `Migrated ${serviceArea._id} to coordinates: [${coordinates.lng}, ${coordinates.lat}]`,
          );
        } catch (error: any) {
          result.failed++;
          const errorMsg = `Failed to migrate ${serviceArea._id}: ${error.message}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);

          // Set default coordinates as fallback
          await ServiceArea.findByIdAndUpdate(serviceArea._id, {
            location: {
              type: "Point",
              coordinates: [0, 0],
            },
            coverageRadiusKm: 25,
          });
        }
      }

      logger.info("Migration completed:", result);
      return result;
    } catch (error: any) {
      logger.error("Migration failed:", error);
      throw error;
    }
  };

/**
 * Run migration if called directly
 */
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI || "")
    .then(async () => {
      logger.info("Connected to MongoDB for migration");
      const result = await migrateServiceAreaToGeoJSON();
      logger.info("Migration result:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Migration error:", error);
      process.exit(1);
    });
}
