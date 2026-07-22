import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { RecentDestination } from "./recentDestination.model";
import { IRecentDestination } from "./recentDestination.interface";
import config from "../../../config";

// Configuration: Maximum number of recent destinations to keep per passenger
const MAX_RECENT_DESTINATIONS = parseInt(
  process.env.MAX_RECENT_DESTINATIONS || "20",
);

/**
 * Get all recent destinations for a user, sorted by lastUsedAt DESC
 */
const getRecentDestinations = async (
  userId: string,
): Promise<IRecentDestination[]> => {
  const destinations = await RecentDestination.find({ userId })
    .sort({ lastUsedAt: -1 })
    .limit(MAX_RECENT_DESTINATIONS);

  return destinations;
};

/**
 * Delete a single recent destination by ID
 */
const deleteRecentDestination = async (
  userId: string,
  destinationId: string,
): Promise<void> => {
  const destination = await RecentDestination.findOne({
    _id: destinationId,
    userId,
  });

  if (!destination) {
    throw new ApiError(404, "Recent destination not found");
  }

  await RecentDestination.deleteOne({ _id: destinationId, userId });
};

/**
 * Clear all recent destinations for a user
 */
const clearAllRecentDestinations = async (userId: string): Promise<void> => {
  await RecentDestination.deleteMany({ userId });
};

/**
 * Save or update a recent destination when a ride is completed
 * This function checks if the destination already exists (by coordinates or normalized address)
 * and updates it instead of creating a duplicate
 */
const saveOrUpdateRecentDestination = async (
  userId: string,
  address: string,
  placeName?: string,
  coordinates?: [number, number],
): Promise<IRecentDestination> => {
  // If coordinates are provided, try to find existing destination by coordinates
  // Using a small tolerance for coordinate matching (approximately 50 meters)
  let existingDestination: IRecentDestination | null = null;

  if (coordinates) {
    // Use MongoDB geospatial query to find nearby destinations
    // Using $nearSphere for 2dsphere index with distance in meters
    const [longitude, latitude] = coordinates;

    existingDestination = await RecentDestination.findOne({
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
    existingDestination = await RecentDestination.findOne({
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

    await (existingDestination as any).save();
    return existingDestination;
  }

  // Create new destination
  const newDestination = await RecentDestination.create({
    userId: new Types.ObjectId(userId),
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
  await enforceDestinationLimit(userId);

  return newDestination;
};

/**
 * Enforce the maximum number of recent destinations per user
 * Deletes the oldest records when the limit is exceeded
 */
const enforceDestinationLimit = async (userId: string): Promise<void> => {
  const count = await RecentDestination.countDocuments({ userId });

  if (count > MAX_RECENT_DESTINATIONS) {
    // Find and delete the oldest destinations
    const destinationsToDelete = await RecentDestination.find({ userId })
      .sort({ lastUsedAt: 1 })
      .limit(count - MAX_RECENT_DESTINATIONS)
      .select("_id");

    const idsToDelete = destinationsToDelete.map((d) => d._id);

    if (idsToDelete.length > 0) {
      await RecentDestination.deleteMany({
        _id: { $in: idsToDelete },
      });
    }
  }
};

export const RecentDestinationServices = {
  getRecentDestinations,
  deleteRecentDestination,
  clearAllRecentDestinations,
  saveOrUpdateRecentDestination,
};
