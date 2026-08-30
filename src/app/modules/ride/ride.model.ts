import { DateTime } from "luxon";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { model, Schema } from "mongoose";
import { IRide, RideModel } from "./rider.interface";
import {
  CANCELLED_BY,
  DRIVER_MATCHING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  RIDE_STATUS,
  RIDE_TYPE,
  VERIFICATION_METHOD,
} from "./ride.constant";

const convertDateToTimezone = (date: any, timezone?: string) => {
  if (!date || !timezone) return date;
  try {
    const dt =
      date instanceof Date ? DateTime.fromJSDate(date) : DateTime.fromISO(date);
    return dt.isValid ? dt.setZone(timezone).toISO() : date;
  } catch {
    return date;
  }
};

const rideSchema = new Schema<IRide, RideModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: false,
    },
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: false,
    },
    serviceCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceCategory",
      required: false,
    },
    rideCategory: {
      categoryId: {
        type: Schema.Types.ObjectId,
        ref: "RideCategory",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      commissionRate: {
        type: Number,
        required: true,
      },
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
        isCompleted: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          required: false,
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
    routeInfo: {
      totalDistanceKm: {
        type: Number,
        required: true,
      },
      totalDurationMinutes: {
        type: Number,
        required: true,
      },
      googleRouteId: {
        type: String,
        required: false,
      },
      polyline: {
        type: String,
        required: false,
      },
    },
    driverMatching: {
      requestExpireSeconds: {
        type: Number,
        required: true,
      },
      searchRadiusKm: {
        type: Number,
        required: true,
      },
      requiredDriverCount: {
        type: Number,
        required: true,
      },
      notifiedDrivers: [
        {
          driverId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
          },
          sentAt: {
            type: Date,
            required: true,
          },
          respondedAt: {
            type: Date,
            required: false,
          },
          status: {
            type: String,
            enum: Object.values(DRIVER_MATCHING_STATUS),
            required: true,
          },
        },
      ],
    },
    rideType: {
      type: String,
      enum: Object.values(RIDE_TYPE),
      default: RIDE_TYPE.INSTANT,
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: false,
    },
    timezone: {
      type: String,
      required: false,
      trim: true,
    },
    reservationStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "expired"],
      default: "pending",
    },
    reservationConfirmedAt: {
      type: Date,
      required: false,
    },
    reservationAssignedAt: {
      type: Date,
      required: false,
    },
    reservationAcceptedAt: {
      type: Date,
      required: false,
    },
    reservationExpiresAt: {
      type: Date,
      required: false,
    },
    assignedDriverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    reservationReminderSent: {
      "24h": { type: Boolean, default: false },
      "1h": { type: Boolean, default: false },
      "30m": { type: Boolean, default: false },
      "15m": { type: Boolean, default: false },
    },
    reservationCancelledReason: {
      type: String,
      required: false,
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    isSharingActive: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(RIDE_STATUS),
      required: true,
      index: true,
    },
    pickupVerification: {
      method: {
        type: String,
        enum: Object.values(VERIFICATION_METHOD),
        required: true,
      },
      otp: {
        code: {
          type: String,
          required: false,
        },
        expiresAt: {
          type: Date,
          required: false,
        },
        createdAt: {
          type: Date,
          required: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: {
          type: Date,
          required: false,
        },
        attempts: {
          type: Number,
          default: 0,
        },
      },
      phoneLastFourDigits: {
        value: {
          type: String,
          required: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: {
          type: Date,
          required: false,
        },
      },
      verificationAttempts: [
        {
          method: {
            type: String,
            enum: Object.values(VERIFICATION_METHOD),
          },
          attemptedAt: {
            type: Date,
            default: Date.now,
          },
          success: {
            type: Boolean,
          },
          ipAddress: {
            type: String,
          },
        },
      ],
    },
    dropVerification: {
      method: {
        type: String,
        enum: Object.values(VERIFICATION_METHOD),
        required: true,
      },
      otp: {
        code: {
          type: String,
          required: false,
        },
        expiresAt: {
          type: Date,
          required: false,
        },
        createdAt: {
          type: Date,
          required: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: {
          type: Date,
          required: false,
        },
        attempts: {
          type: Number,
          default: 0,
        },
      },
      phoneLastFourDigits: {
        value: {
          type: String,
          required: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: {
          type: Date,
          required: false,
        },
      },
      verificationAttempts: [
        {
          method: {
            type: String,
            enum: Object.values(VERIFICATION_METHOD),
          },
          attemptedAt: {
            type: Date,
            default: Date.now,
          },
          success: {
            type: Boolean,
          },
          ipAddress: {
            type: String,
          },
        },
      ],
    },
    fare: {
      baseFare: {
        type: Number,
        required: true,
      },
      distanceFare: {
        type: Number,
        required: true,
      },
      timeFare: {
        type: Number,
        required: true,
      },
      stopWaitingCharge: {
        type: Number,
        required: true,
      },
      cancellationFee: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        required: true,
      },
      subtotal: {
        type: Number,
        required: true,
      },
      commission: {
        type: Number,
        required: true,
      },
      driverEarning: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      surgeMultiplier: {
        type: Number,
        required: false,
        default: 1.0,
      },
      surgeApplied: {
        type: Number,
        required: false,
        default: 0.0,
      },
      rideFare: {
        type: Number,
        required: false,
      },
      pendingCancellationFee: {
        type: Number,
        required: false,
      },
    },
    payment: {
      method: {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
        required: false,
      },
      status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        required: false,
      },
      stripePaymentIntentId: {
        type: String,
        required: false,
      },
      stripeCheckoutSessionId: {
        type: String,
        required: false,
      },
      paidAt: {
        type: Date,
        required: false,
      },
    },
    cancellation: {
      cancelledBy: {
        type: String,
        enum: Object.values(CANCELLED_BY),
        required: false,
      },
      cancellationReasonId: {
        type: Schema.Types.ObjectId,
        ref: "CancellationReason",
        required: false,
      },
      cancellationReasonName: {
        type: String,
        required: false,
      },
      cancellationFee: {
        type: Number,
        required: false,
      },
      driverCompensation: {
        type: Number,
        required: false,
      },
      platformShare: {
        type: Number,
        required: false,
      },
      cancellationPolicy: {
        scenario: { type: String, required: false },
        policyName: { type: String, required: false },
        cancellationFee: { type: Number, required: false },
        driverCompensation: { type: Number, required: false },
        platformShare: { type: Number, required: false },
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "paid", "voided"],
        required: false,
      },
      paymentCollectionMode: {
        type: String,
        required: false,
      },
      rideStatusBeforeCancellation: {
        type: String,
        required: false,
      },
      surgeSnapshot: {
        multiplier: { type: Number, default: 1.0 },
        amount: { type: Number, default: 0.0 },
      },
      fareSnapshot: {
        type: Schema.Types.Mixed,
        required: false,
      },
      cancelledAt: {
        type: Date,
        required: false,
      },
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    acceptedAt: {
      type: Date,
      required: false,
    },
    userApprovedAt: {
      type: Date,
      required: false,
    },
    arrivedAt: {
      type: Date,
      required: false,
    },
    startedAt: {
      type: Date,
      required: false,
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
        // Security: Never expose phoneLastFourDigits.value in JSON responses
        // The value is stored for verification but must never be sent to clients
        if (ret.pickupVerification?.phoneLastFourDigits) {
          delete ret.pickupVerification.phoneLastFourDigits.value;
        }
        if (ret.dropVerification?.phoneLastFourDigits) {
          delete ret.dropVerification.phoneLastFourDigits.value;
        }
        // Also clear OTP code after verification to prevent reuse
        if (ret.pickupVerification?.otp?.code) {
          delete ret.pickupVerification.otp.code;
        }
        if (ret.dropVerification?.otp?.code) {
          delete ret.dropVerification.otp.code;
        }

        // Timezone conversion for all output date/time fields
        if (ret.timezone) {
          const tz = ret.timezone;
          if (ret.scheduledAt)
            ret.scheduledAt = convertDateToTimezone(ret.scheduledAt, tz);
          if (ret.requestedAt)
            ret.requestedAt = convertDateToTimezone(ret.requestedAt, tz);
          if (ret.acceptedAt)
            ret.acceptedAt = convertDateToTimezone(ret.acceptedAt, tz);
          if (ret.startedAt)
            ret.startedAt = convertDateToTimezone(ret.startedAt, tz);
          if (ret.completedAt)
            ret.completedAt = convertDateToTimezone(ret.completedAt, tz);
          if (ret.createdAt)
            ret.createdAt = convertDateToTimezone(ret.createdAt, tz);
          if (ret.updatedAt)
            ret.updatedAt = convertDateToTimezone(ret.updatedAt, tz);
          if (ret.reservationExpiresAt)
            ret.reservationExpiresAt = convertDateToTimezone(
              ret.reservationExpiresAt,
              tz,
            );
          if (ret.reservationConfirmedAt)
            ret.reservationConfirmedAt = convertDateToTimezone(
              ret.reservationConfirmedAt,
              tz,
            );
          if (ret.reservationAssignedAt)
            ret.reservationAssignedAt = convertDateToTimezone(
              ret.reservationAssignedAt,
              tz,
            );
          if (ret.reservationAcceptedAt)
            ret.reservationAcceptedAt = convertDateToTimezone(
              ret.reservationAcceptedAt,
              tz,
            );
          if (ret.cancellation?.cancelledAt) {
            ret.cancellation.cancelledAt = convertDateToTimezone(
              ret.cancellation.cancelledAt,
              tz,
            );
          }
        }
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        // Security: Never expose phoneLastFourDigits.value in JSON responses
        // The value is stored for verification but must never be sent to clients
        if (ret.pickupVerification?.phoneLastFourDigits) {
          delete ret.pickupVerification.phoneLastFourDigits.value;
        }
        if (ret.dropVerification?.phoneLastFourDigits) {
          delete ret.dropVerification.phoneLastFourDigits.value;
        }
        // Also clear OTP code after verification to prevent reuse
        if (ret.pickupVerification?.otp?.code) {
          delete ret.pickupVerification.otp.code;
        }
        if (ret.dropVerification?.otp?.code) {
          delete ret.dropVerification.otp.code;
        }

        // Timezone conversion for all output date/time fields
        if (ret.timezone) {
          const tz = ret.timezone;
          if (ret.scheduledAt)
            ret.scheduledAt = convertDateToTimezone(ret.scheduledAt, tz);
          if (ret.requestedAt)
            ret.requestedAt = convertDateToTimezone(ret.requestedAt, tz);
          if (ret.acceptedAt)
            ret.acceptedAt = convertDateToTimezone(ret.acceptedAt, tz);
          if (ret.startedAt)
            ret.startedAt = convertDateToTimezone(ret.startedAt, tz);
          if (ret.completedAt)
            ret.completedAt = convertDateToTimezone(ret.completedAt, tz);
          if (ret.createdAt)
            ret.createdAt = convertDateToTimezone(ret.createdAt, tz);
          if (ret.updatedAt)
            ret.updatedAt = convertDateToTimezone(ret.updatedAt, tz);
          if (ret.reservationExpiresAt)
            ret.reservationExpiresAt = convertDateToTimezone(
              ret.reservationExpiresAt,
              tz,
            );
          if (ret.reservationConfirmedAt)
            ret.reservationConfirmedAt = convertDateToTimezone(
              ret.reservationConfirmedAt,
              tz,
            );
          if (ret.reservationAssignedAt)
            ret.reservationAssignedAt = convertDateToTimezone(
              ret.reservationAssignedAt,
              tz,
            );
          if (ret.reservationAcceptedAt)
            ret.reservationAcceptedAt = convertDateToTimezone(
              ret.reservationAcceptedAt,
              tz,
            );
          if (ret.cancellation?.cancelledAt) {
            ret.cancellation.cancelledAt = convertDateToTimezone(
              ret.cancellation.cancelledAt,
              tz,
            );
          }
        }
        return ret;
      },
    },
  },
);

// Virtual field to calculate time remaining to pickup
rideSchema.virtual("timeRemainingToPickup").get(function (this: IRide) {
  if (this.rideType !== RIDE_TYPE.SCHEDULED || !this.scheduledAt) {
    return null;
  }
  const now = new Date();
  const scheduledTime = new Date(this.scheduledAt);
  const diffMs = scheduledTime.getTime() - now.getTime();
  if (diffMs <= 0) {
    return "0 minutes";
  }

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays} days ${remainingHours} hours remaining`;
  } else if (diffHours > 0) {
    const remainingMins = diffMins % 60;
    return `${diffHours} hours ${remainingMins} minutes remaining`;
  } else {
    return `${diffMins} minutes remaining`;
  }
});

// Virtual field to get scheduledAt in user's timezone for display
rideSchema.virtual("scheduledAtDisplay").get(function (this: IRide) {
  if (!this.scheduledAt || !this.timezone) {
    return this.scheduledAt;
  }
  try {
    const dt =
      this.scheduledAt instanceof Date
        ? DateTime.fromJSDate(this.scheduledAt)
        : DateTime.fromISO(this.scheduledAt);
    return dt.setZone(this.timezone).toISO();
  } catch (err) {
    return this.scheduledAt;
  }
});

rideSchema.plugin(softDeletePlugin);

export const Ride = model<IRide, RideModel>("Ride", rideSchema);
