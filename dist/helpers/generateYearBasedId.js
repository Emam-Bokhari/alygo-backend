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
exports.generateBookingId = void 0;
const booking_model_1 = require("../app/modules/booking/booking.model");
// Find the last created booking's bookingId
const findLastBookingId = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const lastBooking = yield booking_model_1.Booking.findOne(
      {},
      { bookingId: 1, _id: 0 },
    )
      .sort({ createdAt: -1 })
      .lean();
    return (
      (lastBooking === null || lastBooking === void 0
        ? void 0
        : lastBooking.bookingId) || null
    );
  });
// Generate new booking ID
// Format: BKG-2026-0001
const generateBookingId = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const currentYear = new Date().getUTCFullYear().toString();
    let currentId = "0000"; // default
    const lastBookingId = yield findLastBookingId();
    if (lastBookingId) {
      // lastBookingId = "BKG-2026-0001"
      const [, lastYear, lastNumber] = lastBookingId.split("-");
      if (lastYear === currentYear) {
        currentId = (Number(lastNumber) + 1).toString().padStart(4, "0");
      }
    }
    return `BKG-${currentYear}-${currentId}`;
  });
exports.generateBookingId = generateBookingId;
