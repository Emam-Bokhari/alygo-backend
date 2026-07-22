"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateServiceAreaToGeoJSON = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const serviceArea_model_1 = require("../app/modules/serviceArea/serviceArea.model");
const googleMapsHelper_1 = require("../helpers/googleMapsHelper");
const logger_1 = require("../shared/logger");
/**
 * Migrate Service Area documents to GeoJSON format
 */
const migrateServiceAreaToGeoJSON = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = {
        total: 0,
        migrated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    };
    try {
        // Find all Service Area documents
        const allServiceAreas = yield serviceArea_model_1.ServiceArea.find({});
        result.total = allServiceAreas.length;
        logger_1.logger.info(`Found ${result.total} Service Area documents to process`);
        for (const serviceArea of allServiceAreas) {
            try {
                // Skip if already has valid coordinates (not default [0, 0])
                if (serviceArea.location &&
                    serviceArea.location.coordinates &&
                    (serviceArea.location.coordinates[0] !== 0 ||
                        serviceArea.location.coordinates[1] !== 0)) {
                    result.skipped++;
                    logger_1.logger.info(`Skipped ${serviceArea._id} - already has coordinates`);
                    continue;
                }
                // Determine the location string to geocode
                let locationString = "";
                if (serviceArea.type === "airport" && serviceArea.airport) {
                    locationString = `${serviceArea.airport}, ${serviceArea.city || ""}`;
                }
                else if (serviceArea.city) {
                    locationString = serviceArea.city;
                    if (serviceArea.state)
                        locationString += `, ${serviceArea.state}`;
                    if (serviceArea.country)
                        locationString += `, ${serviceArea.country}`;
                }
                else if (serviceArea.state) {
                    locationString = serviceArea.state;
                    if (serviceArea.country)
                        locationString += `, ${serviceArea.country}`;
                }
                else if (serviceArea.country) {
                    locationString = serviceArea.country;
                }
                if (!locationString) {
                    logger_1.logger.warn(`No location string found for ${serviceArea._id}, using default coordinates`);
                    // Set default coverage radius
                    yield serviceArea_model_1.ServiceArea.findByIdAndUpdate(serviceArea._id, {
                        coverageRadiusKm: serviceArea.type === "airport" ? 10 : 25,
                    });
                    result.failed++;
                    continue;
                }
                // Geocode the location string
                logger_1.logger.info(`Geocoding: ${locationString}`);
                const coordinates = yield googleMapsHelper_1.googleMapsHelper.geocode(locationString);
                // Update the Service Area with GeoJSON location
                const updateData = {
                    location: {
                        type: "Point",
                        coordinates: [coordinates.lng, coordinates.lat],
                    },
                    coverageRadiusKm: serviceArea.type === "airport" ? 10 : 25, // Default coverage radius
                };
                yield serviceArea_model_1.ServiceArea.findByIdAndUpdate(serviceArea._id, updateData);
                result.migrated++;
                logger_1.logger.info(`Migrated ${serviceArea._id} to coordinates: [${coordinates.lng}, ${coordinates.lat}]`);
            }
            catch (error) {
                result.failed++;
                const errorMsg = `Failed to migrate ${serviceArea._id}: ${error.message}`;
                result.errors.push(errorMsg);
                logger_1.logger.error(errorMsg);
                // Set default coordinates as fallback
                yield serviceArea_model_1.ServiceArea.findByIdAndUpdate(serviceArea._id, {
                    location: {
                        type: "Point",
                        coordinates: [0, 0],
                    },
                    coverageRadiusKm: 25,
                });
            }
        }
        logger_1.logger.info("Migration completed:", result);
        return result;
    }
    catch (error) {
        logger_1.logger.error("Migration failed:", error);
        throw error;
    }
});
exports.migrateServiceAreaToGeoJSON = migrateServiceAreaToGeoJSON;
/**
 * Run migration if called directly
 */
if (require.main === module) {
    mongoose_1.default
        .connect(process.env.MONGODB_URI || "")
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        logger_1.logger.info("Connected to MongoDB for migration");
        const result = yield (0, exports.migrateServiceAreaToGeoJSON)();
        logger_1.logger.info("Migration result:", JSON.stringify(result, null, 2));
        process.exit(0);
    }))
        .catch((error) => {
        logger_1.logger.error("Migration error:", error);
        process.exit(1);
    });
}
