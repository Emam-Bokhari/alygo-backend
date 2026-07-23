"use strict";
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
exports.socketHelper = void 0;
const colors_1 = __importDefault(require("colors"));
const logger_1 = require("../shared/logger");
const jwtHelper_1 = require("./jwtHelper");
const config_1 = __importDefault(require("../config"));
const user_model_1 = require("../app/modules/user/user.model");
const ride_model_1 = require("../app/modules/ride/ride.model");
const ride_constant_1 = require("../app/modules/ride/ride.constant");
const tracking_model_1 = require("../app/modules/tracking/tracking.model");
// Map to store connected userId -> Socket object
const socketMap = new Map();
const socket = (io) => {
    io.on("connection", (socket) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        logger_1.logger.info(colors_1.default.blue("A User connected to Socket.IO"));
        // Attempt authentication via token in query or auth object
        const token = ((_a = socket.handshake.query) === null || _a === void 0 ? void 0 : _a.token) ||
            ((_b = socket.handshake.auth) === null || _b === void 0 ? void 0 : _b.token);
        if (token) {
            try {
                const decoded = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
                if (decoded && decoded.id) {
                    const userId = decoded.id.toString();
                    // Verify if the user exists in the database
                    const userExists = yield user_model_1.User.findById(userId);
                    if (!userExists) {
                        logger_1.logger.error(colors_1.default.red(`Socket authentication failed: User ${userId} does not exist in the database.`));
                        socket.disconnect();
                        return;
                    }
                    socketMap.set(userId, socket);
                    socket.data = { userId, role: decoded.role };
                    logger_1.logger.info(colors_1.default.green(`Socket successfully authenticated for User: ${userId} (${decoded.role})`));
                }
            }
            catch (err) {
                logger_1.logger.error(colors_1.default.yellow(`Socket connection token verification failed: ${err.message}`));
            }
        }
        // Explicit registration event fallback
        socket.on("register", (data) => {
            if (data === null || data === void 0 ? void 0 : data.userId) {
                const userId = data.userId.toString();
                socketMap.set(userId, socket);
                socket.data = Object.assign(Object.assign({}, socket.data), { userId });
                logger_1.logger.info(colors_1.default.green(`Socket manually registered User ID: ${userId}`));
            }
        });
        // Handle real-time driver location updates
        socket.on("driver-location-update", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                logger_1.logger.info("Driver location update received via WebSocket");
                const userId = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId) {
                    logger_1.logger.warn("No userId in socket data");
                    return;
                }
                const { coordinates, address } = data;
                if (!coordinates ||
                    !Array.isArray(coordinates) ||
                    coordinates.length !== 2) {
                    logger_1.logger.warn("Invalid coordinates received");
                    return;
                }
                if (typeof coordinates[0] !== "number" ||
                    typeof coordinates[1] !== "number") {
                    logger_1.logger.error(`Invalid coordinate types: ${typeof coordinates[0]}, ${typeof coordinates[1]}`);
                    return;
                }
                let coords = [coordinates[0], coordinates[1]];
                // Auto-swap if coordinates are provided as [latitude, longitude] instead of [longitude, latitude]
                if (Math.abs(coords[1]) > 90 && Math.abs(coords[0]) <= 90) {
                    logger_1.logger.info(`Coordinates auto-swapped from [lat, lng] to [lng, lat]: ${coords} -> [${coords[1]}, ${coords[0]}]`);
                    coords = [coords[1], coords[0]];
                }
                const { TrackingServices, } = require("../app/modules/tracking/tracking.service");
                yield TrackingServices.processDriverLocationUpdate(userId, {
                    coordinates: coords,
                    address: address || "",
                });
            }
            catch (error) {
                logger_1.logger.error(colors_1.default.red("Error handling driver-location-update in socketHelper: ") + ((error === null || error === void 0 ? void 0 : error.message) || error || "Unknown error"));
            }
        }));
        // Handle real-time passenger/user location updates
        socket.on("user-location-update", (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.userId;
                if (!userId)
                    return;
                const { coordinates } = data;
                if (!coordinates ||
                    !Array.isArray(coordinates) ||
                    coordinates.length !== 2) {
                    return;
                }
                let coords = [coordinates[0], coordinates[1]];
                // Auto-swap if coordinates are provided as [latitude, longitude] instead of [longitude, latitude]
                // GeoJSON standard expects [longitude, latitude].
                // Latitude must be between -90 and 90. If coords[1] is outside this range but coords[0] is within, they are swapped.
                if (Math.abs(coords[1]) > 90 && Math.abs(coords[0]) <= 90) {
                    logger_1.logger.info(`User coordinates auto-swapped from [lat, lng] to [lng, lat]: ${coords} -> [${coords[1]}, ${coords[0]}]`);
                    coords = [coords[1], coords[0]];
                }
                // Check if user has an active ride
                const now = new Date();
                const imminentWindowEnd = new Date(now.getTime() + 30 * 60 * 1000);
                const activeRide = yield ride_model_1.Ride.findOne({
                    userId,
                    $or: [
                        {
                            rideType: { $ne: ride_constant_1.RIDE_TYPE.SCHEDULED },
                            status: {
                                $in: [
                                    ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                                    ride_constant_1.RIDE_STATUS.STARTED,
                                ],
                            },
                        },
                        {
                            rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                            status: {
                                $in: [
                                    ride_constant_1.RIDE_STATUS.DRIVER_ON_THE_WAY,
                                    ride_constant_1.RIDE_STATUS.DRIVER_ARRIVED,
                                    ride_constant_1.RIDE_STATUS.STARTED,
                                ],
                            },
                        },
                        {
                            rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
                            status: ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
                            scheduledAt: { $lte: imminentWindowEnd },
                        },
                    ],
                });
                if (activeRide) {
                    // Update tracking table
                    yield tracking_model_1.Tracking.findOneAndUpdate({ rideId: activeRide._id }, {
                        $set: {
                            userId: activeRide.userId,
                            driverId: activeRide.driverId,
                            userLocation: {
                                type: "Point",
                                coordinates: [coords[0], coords[1]],
                            },
                            lastUpdatedAt: new Date(),
                        },
                    }, { upsert: true, new: true });
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
            }
            catch (error) {
                logger_1.logger.error("Error handling user-location-update: " + (error.message || error));
            }
        }));
        // disconnect
        socket.on("disconnect", (reason) => {
            var _a;
            const userId = (_a = socket.data) === null || _a === void 0 ? void 0 : _a.userId;
            if (userId) {
                socketMap.delete(userId);
                logger_1.logger.info(colors_1.default.red(`User ${userId} disconnected. Reason: ${reason}`));
            }
            else {
                logger_1.logger.info(colors_1.default.red(`A user disconnect. Reason: ${reason}`));
            }
        });
    }));
};
/**
 * Emit socket event to a specific user
 */
const sendToUser = (userId, event, data) => {
    if (!userId)
        return false;
    const key = userId.toString();
    const clientSocket = socketMap.get(key);
    if (clientSocket) {
        clientSocket.emit(event, data);
        logger_1.logger.info(colors_1.default.green(`Socket event '${event}' sent to user: ${key}`));
        return true;
    }
    logger_1.logger.warn(colors_1.default.yellow(`Socket event '${event}' FAILED - user ${key} not connected`));
    return false;
};
/**
 * Emit socket event to multiple users
 */
const sendToUsers = (userIds, event, data) => {
    for (const id of userIds) {
        sendToUser(id, event, data);
    }
};
exports.socketHelper = {
    socket,
    sendToUser,
    sendToUsers,
};
