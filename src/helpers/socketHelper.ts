import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";
import { jwtHelper } from "./jwtHelper";
import config from "../config";
import { Driver } from "../app/modules/driver/driver.model";
import { User } from "../app/modules/user/user.model";
import { Ride } from "../app/modules/ride/ride.model";
import { RIDE_STATUS } from "../app/modules/ride/ride.constant";
import { Tracking } from "../app/modules/tracking/tracking.model";
import { Secret } from "jsonwebtoken";

// Map to store connected userId -> Socket object
const socketMap = new Map<string, Socket>();

const socket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    logger.info(colors.blue("A User connected to Socket.IO"));

    // Attempt authentication via token in query or auth object
    const token =
      (socket.handshake.query?.token as string) ||
      (socket.handshake.auth?.token as string);

    if (token) {
      try {
        const decoded = jwtHelper.verifyToken(
          token,
          config.jwt.jwt_secret as Secret,
        );
        if (decoded && decoded.id) {
          const userId = decoded.id.toString();

          // Verify if the user exists in the database
          const userExists = await User.findById(userId);
          if (!userExists) {
            logger.error(
              colors.red(
                `Socket authentication failed: User ${userId} does not exist in the database.`,
              ),
            );
            socket.disconnect();
            return;
          }

          socketMap.set(userId, socket);
          socket.data = { userId, role: decoded.role };
          logger.info(
            colors.green(
              `Socket successfully authenticated for User: ${userId} (${decoded.role})`,
            ),
          );
        }
      } catch (err: any) {
        logger.error(
          colors.yellow(
            `Socket connection token verification failed: ${err.message}`,
          ),
        );
      }
    }

    // Explicit registration event fallback
    socket.on("register", (data: { userId: string }) => {
      if (data?.userId) {
        const userId = data.userId.toString();
        socketMap.set(userId, socket);
        socket.data = { ...socket.data, userId };
        logger.info(
          colors.green(`Socket manually registered User ID: ${userId}`),
        );
      }
    });

    // Handle real-time driver location updates
    socket.on(
      "driver-location-update",
      async (data: {
        coordinates: [number, number]; // [longitude, latitude]
        address?: string;
      }) => {
        try {
          logger.info("Driver location update received via WebSocket");

          const userId = socket.data?.userId;
          if (!userId) {
            logger.warn("No userId in socket data");
            return;
          }

          const { coordinates, address } = data;
          if (
            !coordinates ||
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
          ) {
            logger.warn("Invalid coordinates received");
            return;
          }

          if (
            typeof coordinates[0] !== "number" ||
            typeof coordinates[1] !== "number"
          ) {
            logger.error(
              `Invalid coordinate types: ${typeof coordinates[0]}, ${typeof coordinates[1]}`,
            );
            return;
          }

          let coords: [number, number] = [coordinates[0], coordinates[1]];

          // Auto-swap if coordinates are provided as [latitude, longitude] instead of [longitude, latitude]
          if (Math.abs(coords[1]) > 90 && Math.abs(coords[0]) <= 90) {
            logger.info(
              `Coordinates auto-swapped from [lat, lng] to [lng, lat]: ${coords} -> [${coords[1]}, ${coords[0]}]`,
            );
            coords = [coords[1], coords[0]];
          }

          const {
            TrackingServices,
          } = require("../app/modules/tracking/tracking.service");

          await TrackingServices.processDriverLocationUpdate(userId, {
            coordinates: coords,
            address: address || "",
          });
        } catch (error: any) {
          logger.error(
            colors.red(
              "Error handling driver-location-update in socketHelper: ",
            ) + (error?.message || error || "Unknown error"),
          );
        }
      },
    );

    // Handle real-time passenger/user location updates
    socket.on(
      "user-location-update",
      async (data: {
        coordinates: [number, number]; // [longitude, latitude]
      }) => {
        try {
          const userId = socket.data?.userId;
          if (!userId) return;

          const { coordinates } = data;
          if (
            !coordinates ||
            !Array.isArray(coordinates) ||
            coordinates.length !== 2
          ) {
            return;
          }

          let coords: [number, number] = [coordinates[0], coordinates[1]];

          // Auto-swap if coordinates are provided as [latitude, longitude] instead of [longitude, latitude]
          // GeoJSON standard expects [longitude, latitude].
          // Latitude must be between -90 and 90. If coords[1] is outside this range but coords[0] is within, they are swapped.
          if (Math.abs(coords[1]) > 90 && Math.abs(coords[0]) <= 90) {
            logger.info(
              `User coordinates auto-swapped from [lat, lng] to [lng, lat]: ${coords} -> [${coords[1]}, ${coords[0]}]`,
            );
            coords = [coords[1], coords[0]];
          }

          // Check if user has an active ride
          const activeRide = await Ride.findOne({
            userId,
            status: {
              $in: [
                RIDE_STATUS.DRIVER_ACCEPTED,
                RIDE_STATUS.DRIVER_ON_THE_WAY,
                RIDE_STATUS.DRIVER_ARRIVED,
                RIDE_STATUS.STARTED,
              ],
            },
          });

          if (activeRide) {
            // Update tracking table
            await Tracking.findOneAndUpdate(
              { rideId: activeRide._id },
              {
                $set: {
                  userId: activeRide.userId,
                  driverId: activeRide.driverId,
                  userLocation: {
                    type: "Point",
                    coordinates: [coords[0], coords[1]],
                  },
                  lastUpdatedAt: new Date(),
                },
              },
              { upsert: true, new: true },
            );

            // Notify driver of passenger's updated location
            if (activeRide.driverId) {
              const driverId = activeRide.driverId.toString();
              const driverSocket = socketMap.get(driverId);
              if (driverSocket) {
                driverSocket.emit("user-location-updated", {
                  rideId: activeRide._id,
                  userId,
                  coordinates: [coords[0], coords[1]],
                  updatedAt: new Date(),
                });
              }
            }
          }
        } catch (error: any) {
          logger.error(
            "Error handling user-location-update: " + (error.message || error),
          );
        }
      },
    );

    // disconnect
    socket.on("disconnect", (reason) => {
      const userId = socket.data?.userId;
      if (userId) {
        socketMap.delete(userId);
        logger.info(
          colors.red(`User ${userId} disconnected. Reason: ${reason}`),
        );
      } else {
        logger.info(colors.red(`A user disconnect. Reason: ${reason}`));
      }
    });
  });
};

/**
 * Emit socket event to a specific user
 */
const sendToUser = (
  userId: string | any,
  event: string,
  data: any,
): boolean => {
  if (!userId) return false;
  const key = userId.toString();
  const clientSocket = socketMap.get(key);
  if (clientSocket) {
    clientSocket.emit(event, data);
    logger.info(colors.green(`Socket event '${event}' sent to user: ${key}`));
    return true;
  }
  logger.warn(
    colors.yellow(`Socket event '${event}' FAILED - user ${key} not connected`),
  );
  return false;
};

/**
 * Emit socket event to multiple users
 */
const sendToUsers = (
  userIds: (string | any)[],
  event: string,
  data: any,
): void => {
  for (const id of userIds) {
    sendToUser(id, event, data);
  }
};

export const socketHelper = {
  socket,
  sendToUser,
  sendToUsers,
};
