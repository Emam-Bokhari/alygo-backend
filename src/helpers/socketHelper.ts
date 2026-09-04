import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";
import { jwtHelper } from "./jwtHelper";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Ride } from "../app/modules/ride/ride.model";
import { RIDE_STATUS, RIDE_TYPE } from "../app/modules/ride/ride.constant";
import { DRIVER_AVAILABILITY_STATUS } from "../app/modules/driver/driver.constant";
import { Tracking } from "../app/modules/tracking/tracking.model";
import { Secret } from "jsonwebtoken";
import { getSystemConfig } from "./systemConfigHelper";
import { notificationUiLogger } from "./notificationUiLogger";

// Map to store connected userId -> Socket object
const socketMap = new Map<string, Socket>();

// Map to store active disconnect timeouts (userId -> NodeJS.Timeout)
const disconnectTimeouts = new Map<string, NodeJS.Timeout>();

const socket = (io: Server) => {
  io.on("connection", async (socket: Socket) => {
    logger.info(colors.blue("A User connected to Socket.IO"));

    // Attempt authentication via token in query or auth object
    let queryToken: string | undefined = undefined;
    if (socket.handshake.query) {
      for (const key of Object.keys(socket.handshake.query)) {
        if (key.trim() === "token") {
          queryToken = socket.handshake.query[key] as string;
          break;
        }
      }
    }

    let authToken: string | undefined = undefined;
    if (socket.handshake.auth) {
      for (const key of Object.keys(socket.handshake.auth)) {
        if (key.trim() === "token") {
          authToken = socket.handshake.auth[key] as string;
          break;
        }
      }
    }

    let token = queryToken || authToken;

    if (token && token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

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

          // Clear any active disconnect timeout for this user since they reconnected
          if (disconnectTimeouts.has(userId)) {
            clearTimeout(disconnectTimeouts.get(userId));
            disconnectTimeouts.delete(userId);
            logger.info(
              colors.cyan(
                `Driver ${userId} reconnected within grace period. Cancelled offline timeout.`,
              ),
            );
          }

          // Check if driver has an active trip and restore status if needed
          checkAndRestoreDriverOnTrip(userId, decoded.role);

          // Check/update driver availability on connection
          try {
            const { Driver } = require("../app/modules/driver/driver.model");
            const isDriver =
              decoded.role === "driver" || (await Driver.findOne({ userId }));
            if (isDriver) {
              const {
                DriverDutyPolicyServices,
              } = require("../app/modules/driverDutyPolicy/driverDutyPolicy.service");
              await DriverDutyPolicyServices.updateDriverAvailability(userId);
            }
          } catch (err: any) {
            logger.error(
              `Error updating driver availability on socket connection: ${err.message}`,
            );
          }

          logger.info(
            colors.green(
              `Socket successfully authenticated for User: ${userId} (${decoded.role})`,
            ),
          );
        } else {
          logger.error(
            colors.red("Socket authentication failed: Invalid token payload."),
          );
          socket.disconnect();
          return;
        }
      } catch (err: any) {
        logger.error(
          colors.yellow(
            `Socket connection token verification failed: ${err.message}`,
          ),
        );
        socket.disconnect();
        return;
      }
    }

    // Explicit registration event fallback
    socket.on("register", async (data: { userId: string }) => {
      if (data?.userId) {
        const userId = data.userId.toString();
        socketMap.set(userId, socket);
        socket.data = { ...socket.data, userId };

        // Clear any active disconnect timeout for this user since they reconnected
        if (disconnectTimeouts.has(userId)) {
          clearTimeout(disconnectTimeouts.get(userId));
          disconnectTimeouts.delete(userId);
          logger.info(
            colors.cyan(
              `Driver ${userId} reconnected within grace period via manual registration. Cancelled offline timeout.`,
            ),
          );
        }

        // Check if driver has an active trip and restore status if needed
        checkAndRestoreDriverOnTrip(userId, socket.data?.role);

        // Check/update driver availability on manual registration
        try {
          const { Driver } = require("../app/modules/driver/driver.model");
          const isDriver =
            socket.data?.role === "driver" ||
            (await Driver.findOne({ userId }));
          if (isDriver) {
            const {
              DriverDutyPolicyServices,
            } = require("../app/modules/driverDutyPolicy/driverDutyPolicy.service");
            await DriverDutyPolicyServices.updateDriverAvailability(userId);
          }
        } catch (err: any) {
          logger.error(
            `Error updating driver availability on manual register: ${err.message}`,
          );
        }

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
        heading?: number;
        speed?: number;
      }) => {
        try {
          logger.info("Driver location update received via WebSocket");

          const userId = socket.data?.userId;
          if (!userId) {
            logger.warn("No userId in socket data");
            return;
          }

          const { coordinates, address, heading, speed } = data;
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
            heading,
            speed,
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
          const now = new Date();
          const systemConfig = await getSystemConfig();
          const reservationWindowMinutes =
            systemConfig.reservation?.driverVisibleBeforeMinutes || 30;
          const imminentWindowEnd = new Date(
            now.getTime() + reservationWindowMinutes * 60 * 1000,
          );
          const activeRide = await Ride.findOne({
            userId,
            $or: [
              {
                rideType: { $ne: RIDE_TYPE.SCHEDULED },
                status: {
                  $in: [
                    RIDE_STATUS.DRIVER_ACCEPTED,
                    RIDE_STATUS.DRIVER_ON_THE_WAY,
                    RIDE_STATUS.DRIVER_ARRIVED,
                    RIDE_STATUS.STARTED,
                  ],
                },
              },
              {
                rideType: RIDE_TYPE.SCHEDULED,
                status: {
                  $in: [
                    RIDE_STATUS.DRIVER_ON_THE_WAY,
                    RIDE_STATUS.DRIVER_ARRIVED,
                    RIDE_STATUS.STARTED,
                  ],
                },
              },
              {
                rideType: RIDE_TYPE.SCHEDULED,
                status: RIDE_STATUS.DRIVER_ACCEPTED,
                scheduledAt: { $lte: imminentWindowEnd },
              },
            ],
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

    // Handle go-online event
    socket.on(
      "go-online",
      async (payloadOrCallback?: any, maybeCallback?: any) => {
        const callback =
          typeof payloadOrCallback === "function"
            ? payloadOrCallback
            : maybeCallback;
        try {
          const userId = socket.data?.userId;
          if (!userId) {
            logger.warn(
              "go-online socket event failed: No userId in socket data",
            );
            if (typeof callback === "function") {
              callback({ success: false, message: "User not authenticated" });
            }
            return;
          }

          const {
            DriverServices,
          } = require("../app/modules/driver/driver.service");
          const result = await DriverServices.updateDriverFromDB(userId, {
            driverAvailabilityStatus: "online",
          });
          logger.info(`Driver ${userId} went online via socket.`);

          // Recalculate and update availability when driver goes online
          try {
            const {
              DriverDutyPolicyServices,
            } = require("../app/modules/driverDutyPolicy/driverDutyPolicy.service");
            await DriverDutyPolicyServices.updateDriverAvailability(userId);
          } catch (err: any) {
            logger.error(
              `Error updating driver availability on go-online: ${err.message}`,
            );
          }

          const responseData = result
            ? {
                _id: result._id,
                userId: result.userId,
                location: result.location,
                lastOnlineAt: result.lastOnlineAt,
                lastOfflineAt: result.lastOfflineAt,
                driverAvailabilityStatus: result.driverAvailabilityStatus,
              }
            : undefined;

          if (typeof callback === "function") {
            callback({
              success: true,
              message: "Went online successfully",
              data: responseData,
            });
          }
        } catch (error: any) {
          logger.error(
            `Error in go-online socket event: ${error.message || error}`,
          );
          if (typeof callback === "function") {
            callback({
              success: false,
              message: error.message || "Failed to go online",
            });
          }
        }
      },
    );

    // Handle go-offline event
    socket.on(
      "go-offline",
      async (payloadOrCallback?: any, maybeCallback?: any) => {
        const callback =
          typeof payloadOrCallback === "function"
            ? payloadOrCallback
            : maybeCallback;
        try {
          const userId = socket.data?.userId;
          if (!userId) {
            logger.warn(
              "go-offline socket event failed: No userId in socket data",
            );
            if (typeof callback === "function") {
              callback({ success: false, message: "User not authenticated" });
            }
            return;
          }

          const {
            DriverServices,
          } = require("../app/modules/driver/driver.service");
          const result = await DriverServices.updateDriverFromDB(userId, {
            driverAvailabilityStatus: "offline",
          });
          logger.info(`Driver ${userId} went offline via socket.`);

          const responseData = result
            ? {
                _id: result._id,
                userId: result.userId,
                location: result.location,
                lastOnlineAt: result.lastOnlineAt,
                lastOfflineAt: result.lastOfflineAt,
                driverAvailabilityStatus: result.driverAvailabilityStatus,
              }
            : undefined;

          if (typeof callback === "function") {
            callback({
              success: true,
              message: "Went offline successfully",
              data: responseData,
            });
          }
        } catch (error: any) {
          logger.error(
            `Error in go-offline socket event: ${error.message || error}`,
          );
          if (typeof callback === "function") {
            callback({
              success: false,
              message: error.message || "Failed to go offline",
            });
          }
        }
      },
    );

    // disconnect
    socket.on("disconnect", (reason) => {
      const userId = socket.data?.userId;
      const role = socket.data?.role;
      if (userId) {
        socketMap.delete(userId);
        logger.info(
          colors.red(`User ${userId} disconnected. Reason: ${reason}`),
        );

        const handleDriverDisconnect = () => {
          if (disconnectTimeouts.has(userId)) {
            clearTimeout(disconnectTimeouts.get(userId));
          }

          const timeout = setTimeout(async () => {
            try {
              if (!socketMap.has(userId)) {
                const {
                  DriverServices,
                } = require("../app/modules/driver/driver.service");
                await DriverServices.updateDriverFromDB(userId, {
                  driverAvailabilityStatus: "offline",
                });
                logger.info(
                  `Driver ${userId} marked offline automatically after grace period.`,
                );
              }
              disconnectTimeouts.delete(userId);
            } catch (err: any) {
              logger.error(
                `Failed to automatically set disconnected driver ${userId} to offline: ${err.message}`,
              );
              disconnectTimeouts.delete(userId);
            }
          }, 60000); // 60 seconds grace period

          disconnectTimeouts.set(userId, timeout);
          logger.info(
            `Started 60-second offline grace period for disconnected Driver: ${userId}`,
          );
        };

        if (role === "driver") {
          handleDriverDisconnect();
        } else if (!role) {
          const { Driver } = require("../app/modules/driver/driver.model");
          Driver.findOne({ userId })
            .then((driver: any) => {
              if (driver) {
                handleDriverDisconnect();
              }
            })
            .catch((err: any) => {
              logger.error(
                `Error checking driver profile on disconnect: ${err.message}`,
              );
            });
        }
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
    notificationUiLogger.logSocketEvent({
      status: "DELIVERED",
      event,
      recipient: key,
      data,
    });
    return true;
  }
  notificationUiLogger.logSocketEvent({
    status: "OFFLINE",
    event,
    recipient: key,
    data,
    note: "User is not currently connected to Socket.IO",
  });
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

/**
 * Helper to check if a connecting driver has an active ride,
 * and if so, restore their status in the database to 'on_trip'.
 */
const checkAndRestoreDriverOnTrip = async (userId: string, role?: string) => {
  try {
    const { Driver } = require("../app/modules/driver/driver.model");
    const isDriver = role === "driver" || (await Driver.findOne({ userId }));
    if (!isDriver) return;

    const { Ride } = require("../app/modules/ride/ride.model");
    const { RIDE_STATUS } = require("../app/modules/ride/ride.constant");

    const activeRide = await Ride.findOne({
      driverId: userId,
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
      const {
        DriverServices,
      } = require("../app/modules/driver/driver.service");
      await DriverServices.updateDriverFromDB(userId, {
        driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS.ON_TRIP,
      });
      logger.info(
        colors.cyan(
          `Driver ${userId} reconnected with active ride ${activeRide._id}. Restored status to on_trip.`,
        ),
      );
    }
  } catch (err: any) {
    logger.error(`Error in checkAndRestoreDriverOnTrip: ${err.message}`);
  }
};

export const socketHelper = {
  socket,
  sendToUser,
  sendToUsers,
};
