"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecentDestinationServices = void 0;
const mongoose_1 = require("mongoose");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const recentDestination_model_1 = require("./recentDestination.model");
// Configuration: Maximum number of recent destinations to keep per passenger
const MAX_RECENT_DESTINATIONS = parseInt(
  process.env.MAX_RECENT_DESTINATIONS || "20",
);
/**
 * Get all recent destinations for a user, sorted by lastUsedAt DESC
 */
const getRecentDestinations = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const destinations = yield recentDestination_model_1.RecentDestination.find(
      { userId },
    )
      .sort({ lastUsedAt: -1 })
      .limit(MAX_RECENT_DESTINATIONS);
    return destinations;
  });
/**
 * Delete a single recent destination by ID
 */
const deleteRecentDestination = (userId, destinationId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const destination =
      yield recentDestination_model_1.RecentDestination.findOne({
        _id: destinationId,
        userId,
      });
    if (!destination) {
      throw new ApiErrors_1.default(404, "Recent destination not found");
    }
    yield recentDestination_model_1.RecentDestination.deleteOne({
      _id: destinationId,
      userId,
    });
  });
/**
 * Clear all recent destinations for a user
 */
const clearAllRecentDestinations = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    yield recentDestination_model_1.RecentDestination.deleteMany({ userId });
  });
/**
 * Save or update a recent destination when a ride is completed
 * This function checks if the destination already exists (by coordinates or normalized address)
 * and updates it instead of creating a duplicate
 */
const saveOrUpdateRecentDestination = (
  userId,
  address,
  placeName,
  coordinates,
) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // If coordinates are provided, try to find existing destination by coordinates
    // Using a small tolerance for coordinate matching (approximately 50 meters)
    let existingDestination = null;
    if (coordinates) {
      // Use MongoDB geospatial query to find nearby destinations
      // Using $nearSphere for 2dsphere index with distance in meters
      const [longitude, latitude] = coordinates;
      existingDestination =
        yield recentDestination_model_1.RecentDestination.findOne({
          userId,
          location: {
            $nearSphere: {
              $geometry: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              $maxDistance: 50, // 50 meters
            },
          },
        });
    }
    // If not found by coordinates, try to find by exact address match
    if (!existingDestination) {
      existingDestination =
        yield recentDestination_model_1.RecentDestination.findOne({
          userId,
          address,
        });
    }
    if (existingDestination) {
      // Update existing destination
      existingDestination.lastUsedAt = new Date();
      existingDestination.useCount += 1;
      // Update placeName if provided and different
      if (placeName && placeName !== existingDestination.placeName) {
        existingDestination.placeName = placeName;
      }
      // Update coordinates if provided and different
      if (
        coordinates &&
        coordinates !== existingDestination.location.coordinates
      ) {
        existingDestination.location.coordinates = coordinates;
      }
      yield existingDestination.save();
      return existingDestination;
    }
    // Create new destination
    const newDestination =
      yield recentDestination_model_1.RecentDestination.create({
        userId: new mongoose_1.Types.ObjectId(userId),
        address,
        placeName,
        location: {
          type: "Point",
          coordinates: coordinates || [0, 0],
        },
        lastUsedAt: new Date(),
        useCount: 1,
      });
    // Enforce maximum limit: delete oldest destinations if limit exceeded
    yield enforceDestinationLimit(userId);
    return newDestination;
  });
/**
 * Enforce the maximum number of recent destinations per user
 * Deletes the oldest records when the limit is exceeded
 */
const enforceDestinationLimit = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const count =
      yield recentDestination_model_1.RecentDestination.countDocuments({
        userId,
      });
    if (count > MAX_RECENT_DESTINATIONS) {
      // Find and delete the oldest destinations
      const destinationsToDelete =
        yield recentDestination_model_1.RecentDestination.find({ userId })
          .sort({ lastUsedAt: 1 })
          .limit(count - MAX_RECENT_DESTINATIONS)
          .select("_id");
      const idsToDelete = destinationsToDelete.map((d) => d._id);
      if (idsToDelete.length > 0) {
        yield recentDestination_model_1.RecentDestination.deleteMany({
          _id: { $in: idsToDelete },
        });
      }
    }
  });
exports.RecentDestinationServices = {
  getRecentDestinations,
  deleteRecentDestination,
  clearAllRecentDestinations,
  saveOrUpdateRecentDestination,
};
