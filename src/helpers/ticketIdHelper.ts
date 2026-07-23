import { TripReport } from "../app/modules/tripReport/tripReport.model";
import { getSystemConfig } from "./systemConfigHelper";
import { DateTime } from "luxon";

/**
 * Generate a unique ticket ID for trip reports
 * Format: TRP-YYYYMMDD-XXXXXX (6-digit sequential number)
 * Example: TRP-20260719-000001
 */
export const generateTicketId = async (): Promise<string> => {
  const systemConfig = await getSystemConfig();
  const timezone = systemConfig.driverRewards?.timezone || "Asia/Dhaka";
  const today = DateTime.now().setZone(timezone);
  const datePrefix = today.toFormat("yyyyMMdd");

  // Find the last ticket ID for today
  const lastReport = await TripReport.findOne({
    ticketId: new RegExp(`^TRP-${datePrefix}-`),
  }).sort({ ticketId: -1 });

  let sequentialNumber = 1;

  if (lastReport && lastReport.ticketId) {
    // Extract the sequential number from the last ticket ID
    const parts = lastReport.ticketId.split("-");
    const lastNumber = parseInt(parts[2], 10);
    if (!isNaN(lastNumber)) {
      sequentialNumber = lastNumber + 1;
    }
  }

  // Format the sequential number as 6 digits with leading zeros
  const formattedNumber = String(sequentialNumber).padStart(6, "0");

  return `TRP-${datePrefix}-${formattedNumber}`;
};
