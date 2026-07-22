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
exports.generateTicketId = void 0;
const tripReport_model_1 = require("../app/modules/tripReport/tripReport.model");
/**
 * Generate a unique ticket ID for trip reports
 * Format: TRP-YYYYMMDD-XXXXXX (6-digit sequential number)
 * Example: TRP-20260719-000001
 */
const generateTicketId = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${yyyy}${mm}${dd}`;
    // Find the last ticket ID for today
    const lastReport = yield tripReport_model_1.TripReport.findOne({
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
  });
exports.generateTicketId = generateTicketId;
