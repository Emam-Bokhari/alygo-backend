import { Ride } from "../app/modules/ride/ride.model";
import { RIDE_TYPE, RIDE_STATUS } from "../app/modules/ride/ride.constant";
import { socketHelper } from "../helpers/socketHelper";
import { sendNotifications } from "../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../app/modules/notification/notification.constant";
import { getSystemConfig } from "../helpers/systemConfigHelper";
import { logger } from "../shared/logger";
import { utcToTimezone, getRideScheduleInfo } from "../shared/timezoneHelper";

export const processReservationReminders = async () => {
  try {
    const systemConfig = await getSystemConfig();
    const configRes = systemConfig.reservation;

    if (!configRes?.enabled) return;

    const now = new Date();
    const nowMs = now.getTime();

    // Query active/confirmed scheduled rides
    const rides = await Ride.find({
      rideType: RIDE_TYPE.SCHEDULED,
      status: {
        $in: [RIDE_STATUS.SEARCHING_DRIVER, RIDE_STATUS.DRIVER_ACCEPTED],
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
        await sendReminderNotifications(ride, "24 hours");
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
        await sendReminderNotifications(ride, "1 hour");
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
        await sendReminderNotifications(ride, "30 minutes");
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
        await sendReminderNotifications(ride, "15 minutes");
        reminderSent["15m"] = true;
        updated = true;
      }

      if (updated) {
        ride.reservationReminderSent = reminderSent;
        await ride.save();
      }
    }
  } catch (error: any) {
    logger.error(
      `[ReservationReminderService] Error processing reminders: ${error.message}`,
    );
  }
};

const sendReminderNotifications = async (ride: any, intervalLabel: string) => {
  const payload = {
    rideId: ride._id,
    ...getRideScheduleInfo(ride),
    pickup: ride.pickup,
    destination: ride.destination,
    message: `Reminder: Your reservation ride is scheduled in ${intervalLabel}.`,
  };

  // Socket notification to passenger
  socketHelper.sendToUser(
    ride.userId.toString(),
    "reservation-reminder",
    payload,
  );

  // Push notification to passenger
  await sendNotifications({
    title: "Reservation Reminder",
    text: `Your reservation ride is scheduled in ${intervalLabel}.`,
    receiver: ride.userId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: ride._id,
    referenceModel: "Ride" as any,
  });

  // Socket notification & push to assigned driver if exists
  const driverUserId = ride.assignedDriverId || ride.driverId;
  if (driverUserId) {
    socketHelper.sendToUser(
      driverUserId.toString(),
      "reservation-reminder",
      payload,
    );
    await sendNotifications({
      title: "Upcoming Reservation Reminder",
      text: `Reminder: You have an upcoming reservation ride scheduled in ${intervalLabel}.`,
      receiver: driverUserId,
      type: NOTIFICATION_TYPE.DRIVER,
      referenceId: ride._id,
      referenceModel: "Ride" as any,
    });
  }
};
