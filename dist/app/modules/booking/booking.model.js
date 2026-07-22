"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Booking = void 0;
const mongoose_1 = require("mongoose");
const booking_constant_1 = require("./booking.constant");
const ride_constant_1 = require("../ride/ride.constant");
const bookingSchema = new mongoose_1.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Driver",
      required: false,
      index: true,
    },
    carId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Car",
      required: false,
      index: true,
    },
    transactionId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
      index: true,
    },
    bookingStatus: {
      type: String,
      enum: Object.values(booking_constant_1.BOOKING_STATUS),
      default: booking_constant_1.BOOKING_STATUS.PENDING,
      required: true,
      index: true,
    },
    pickup: {
      address: {
        type: String,
        required: true,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
          index: "2dsphere",
        },
      },
    },
    stops: [
      {
        order: {
          type: Number,
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        location: {
          type: {
            type: String,
            enum: ["Point"],
            default: "Point",
            required: true,
          },
          coordinates: {
            type: [Number],
            required: true,
          },
        },
      },
    ],
    destination: {
      address: {
        type: String,
        required: true,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
          index: "2dsphere",
        },
      },
    },
    isPaid: {
      type: Boolean,
      default: false,
      required: true,
    },
    paidAt: {
      type: Date,
      required: false,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(ride_constant_1.PAYMENT_METHOD),
      required: false,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(ride_constant_1.PAYMENT_STATUS),
      required: false,
    },
    cancelledBy: {
      type: String,
      enum: Object.values(ride_constant_1.CANCELLED_BY),
      required: false,
    },
    cancellationReason: {
      type: String,
      required: false,
    },
    cancellationFee: {
      type: Number,
      default: 0,
    },
    baseFare: {
      type: Number,
      required: true,
      default: 0,
    },
    distanceFare: {
      type: Number,
      required: true,
      default: 0,
    },
    timeFare: {
      type: Number,
      required: true,
      default: 0,
    },
    stopWaitingCharge: {
      type: Number,
      required: true,
      default: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      default: 0,
    },
    driverEarning: {
      type: Number,
      required: true,
      default: 0,
    },
    adminCommission: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);
exports.Booking = (0, mongoose_1.model)("Booking", bookingSchema);
