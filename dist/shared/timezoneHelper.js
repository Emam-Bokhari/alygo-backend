"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommonTimezones =
  exports.isValidTimezone =
  exports.isEventActive =
  exports.isHolidayActive =
  exports.isPeakHourActive =
  exports.timezoneToUtc =
  exports.getCurrentTimeInTimezone =
  exports.utcToTimezone =
    void 0;
const luxon_1 = require("luxon");
/**
 * Timezone Helper Utility
 * Provides centralized timezone-aware date/time operations using Luxon
 * All times are stored in UTC in the database
 */
/**
 * Convert UTC date to a specific timezone
 * @param utcDate - UTC Date object or ISO string
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @returns DateTime in the specified timezone
 */
const utcToTimezone = (utcDate, timezone) => {
  return luxon_1.DateTime.fromJSDate(new Date(utcDate)).setZone(timezone);
};
exports.utcToTimezone = utcToTimezone;
/**
 * Get current time in a specific timezone
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @returns Current DateTime in the specified timezone
 */
const getCurrentTimeInTimezone = (timezone) => {
  return luxon_1.DateTime.now().setZone(timezone);
};
exports.getCurrentTimeInTimezone = getCurrentTimeInTimezone;
/**
 * Convert local time in a timezone to UTC
 * @param localDate - Date in the local timezone
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @returns DateTime in UTC
 */
const timezoneToUtc = (localDate, timezone) => {
  return luxon_1.DateTime.fromJSDate(new Date(localDate), {
    zone: timezone,
  }).setZone("UTC");
};
exports.timezoneToUtc = timezoneToUtc;
/**
 * Check if current UTC time falls within a peak hour window in a specific timezone
 * Handles overnight time ranges (e.g., 22:00 - 02:00)
 * @param startTime - Start time in HH:mm format (e.g., "08:00")
 * @param endTime - End time in HH:mm format (e.g., "10:00")
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @param applicableDays - Array of applicable day names in lowercase (e.g., ["monday", "tuesday"])
 * @returns true if current time is within the peak hour window
 */
const isPeakHourActive = (startTime, endTime, timezone, applicableDays) => {
  const nowInTimezone = (0, exports.getCurrentTimeInTimezone)(timezone);
  const currentDayName = nowInTimezone.toFormat("EEEE").toLowerCase(); // Full day name in lowercase (e.g., "monday")
  const currentTimeStr = nowInTimezone.toFormat("HH:mm");
  // Check if current day is applicable
  if (!applicableDays.includes(currentDayName)) {
    return false;
  }
  // Handle overnight time ranges (e.g., 22:00 - 02:00)
  if (startTime > endTime) {
    // Time range crosses midnight
    return currentTimeStr >= startTime || currentTimeStr <= endTime;
  } else {
    // Normal time range within same day
    return currentTimeStr >= startTime && currentTimeStr <= endTime;
  }
};
exports.isPeakHourActive = isPeakHourActive;
/**
 * Check if current UTC date falls within a holiday date range in a specific timezone
 * @param startDateTime - Start datetime in UTC
 * @param endDateTime - End datetime in UTC
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @returns true if current date is within the holiday range
 */
const isHolidayActive = (startDateTime, endDateTime, timezone) => {
  const nowInTimezone = (0, exports.getCurrentTimeInTimezone)(timezone);
  const startInTimezone = (0, exports.utcToTimezone)(
    startDateTime,
    timezone,
  ).startOf("day");
  const endInTimezone = (0, exports.utcToTimezone)(endDateTime, timezone).endOf(
    "day",
  );
  const nowStartOfDay = nowInTimezone.startOf("day");
  return nowStartOfDay >= startInTimezone && nowStartOfDay <= endInTimezone;
};
exports.isHolidayActive = isHolidayActive;
/**
 * Check if current UTC datetime falls within an event datetime range in a specific timezone
 * @param startDateTime - Start datetime in UTC
 * @param endDateTime - End datetime in UTC
 * @param timezone - IANA timezone identifier (e.g., "Asia/Dhaka")
 * @returns true if current datetime is within the event range
 */
const isEventActive = (startDateTime, endDateTime, timezone) => {
  const nowInTimezone = (0, exports.getCurrentTimeInTimezone)(timezone);
  const startInTimezone = (0, exports.utcToTimezone)(startDateTime, timezone);
  const endInTimezone = (0, exports.utcToTimezone)(endDateTime, timezone);
  return nowInTimezone >= startInTimezone && nowInTimezone <= endInTimezone;
};
exports.isEventActive = isEventActive;
/**
 * Validate IANA timezone identifier
 * @param timezone - Timezone string to validate
 * @returns true if valid IANA timezone
 */
const isValidTimezone = (timezone) => {
  try {
    return luxon_1.DateTime.now().setZone(timezone).isValid;
  } catch (_a) {
    return false;
  }
};
exports.isValidTimezone = isValidTimezone;
/**
 * Get list of common IANA timezones (for validation/dropdown)
 * @returns Array of common timezone identifiers
 */
const getCommonTimezones = () => {
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Dhaka",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Australia/Melbourne",
  ];
};
exports.getCommonTimezones = getCommonTimezones;
