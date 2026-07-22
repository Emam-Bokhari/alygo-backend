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
Object.defineProperty(exports, "__esModule", { value: true });
exports.processReservationReminders = void 0;
const ride_model_1 = require("../app/modules/ride/ride.model");
const ride_constant_1 = require("../app/modules/ride/ride.constant");
const socketHelper_1 = require("../helpers/socketHelper");
const notificationsHelper_1 = require("../helpers/notificationsHelper");
const notification_constant_1 = require("../app/modules/notification/notification.constant");
const systemConfigHelper_1 = require("../helpers/systemConfigHelper");
const logger_1 = require("../shared/logger");
const timezoneHelper_1 = require("../shared/timezoneHelper");
const processReservationReminders = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    try {
      const systemConfig = yield (0, systemConfigHelper_1.getSystemConfig)();
      const configRes = systemConfig.reservation;
      if (
        !(configRes === null || configRes === void 0
          ? void 0
          : configRes.enabled)
      )
        return;
      const now = new Date();
      const nowMs = now.getTime();
      // Query active/confirmed scheduled rides
      const rides = yield ride_model_1.Ride.find({
        rideType: ride_constant_1.RIDE_TYPE.SCHEDULED,
        status: {
          $in: [
            ride_constant_1.RIDE_STATUS.SEARCHING_DRIVER,
            ride_constant_1.RIDE_STATUS.DRIVER_ACCEPTED,
          ],
        },
        scheduledAt: { $gt: now },
      });
      for (const ride of rides) {
        if (!ride.scheduledAt) continue;
        const scheduledMs = new Date(ride.scheduledAt).getTime();
        const diffMinutes = (scheduledMs - nowMs) / (1000 * 60);
        const reminderSent = ride.reservationReminderSent || {
          "24h": false,
          "1h": false,
          "30m": false,
          "15m": false,
        };
        let updated = false;
        // 24 Hours Reminder (between 1410 and 1470 minutes before)
        if (
          configRes.reminder24h &&
          !reminderSent["24h"] &&
          diffMinutes <= 1470 &&
          diffMinutes >= 1410
        ) {
          yield sendReminderNotifications(ride, "24 hours");
          reminderSent["24h"] = true;
          updated = true;
        }
        // 1 Hour Reminder (between 50 and 70 minutes before)
        if (
          configRes.reminder1h &&
          !reminderSent["1h"] &&
          diffMinutes <= 70 &&
          diffMinutes >= 50
        ) {
          yield sendReminderNotifications(ride, "1 hour");
          reminderSent["1h"] = true;
          updated = true;
        }
        // 30 Minutes Reminder (between 25 and 35 minutes before)
        if (
          configRes.reminder30m &&
          !reminderSent["30m"] &&
          diffMinutes <= 35 &&
          diffMinutes >= 25
        ) {
          yield sendReminderNotifications(ride, "30 minutes");
          reminderSent["30m"] = true;
          updated = true;
        }
        // 15 Minutes Reminder (between 10 and 20 minutes before)
        if (
          configRes.reminder15m &&
          !reminderSent["15m"] &&
          diffMinutes <= 20 &&
          diffMinutes >= 10
        ) {
          yield sendReminderNotifications(ride, "15 minutes");
          reminderSent["15m"] = true;
          updated = true;
        }
        if (updated) {
          ride.reservationReminderSent = reminderSent;
          yield ride.save();
        }
      }
    } catch (error) {
      logger_1.logger.error(
        `[ReservationReminderService] Error processing reminders: ${error.message}`,
      );
    }
  });
exports.processReservationReminders = processReservationReminders;
const sendReminderNotifications = (ride, intervalLabel) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Convert scheduledAt from UTC to user's timezone for display
    const scheduledAtDisplay = ride.timezone
      ? (0, timezoneHelper_1.utcToTimezone)(
          ride.scheduledAt,
          ride.timezone,
        ).toISO()
      : ride.scheduledAt;
    const payload = {
      rideId: ride._id,
      scheduledAt: scheduledAtDisplay,
      scheduledAtUtc: ride.scheduledAt,
      timezone: ride.timezone,
      pickup: ride.pickup,
      destination: ride.destination,
      message: `Reminder: Your reservation ride is scheduled in ${intervalLabel}.`,
    };
    // Socket notification to passenger
    socketHelper_1.socketHelper.sendToUser(
      ride.userId.toString(),
      "reservation-reminder",
      payload,
    );
    // Push notification to passenger
    yield (0, notificationsHelper_1.sendNotifications)({
      title: "Reservation Reminder",
      text: `Your reservation ride is scheduled in ${intervalLabel}.`,
      receiver: ride.userId,
      type: notification_constant_1.NOTIFICATION_TYPE.USER,
      referenceId: ride._id,
      referenceModel: "Ride",
    });
    // Socket notification & push to assigned driver if exists
    const driverUserId = ride.assignedDriverId || ride.driverId;
    if (driverUserId) {
      socketHelper_1.socketHelper.sendToUser(
        driverUserId.toString(),
        "reservation-reminder",
        payload,
      );
      yield (0, notificationsHelper_1.sendNotifications)({
        title: "Upcoming Reservation Reminder",
        text: `Reminder: You have an upcoming reservation ride scheduled in ${intervalLabel}.`,
        receiver: driverUserId,
        type: notification_constant_1.NOTIFICATION_TYPE.DRIVER,
        referenceId: ride._id,
        referenceModel: "Ride",
      });
    }
  });
