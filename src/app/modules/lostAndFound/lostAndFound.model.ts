import { model, Schema } from "mongoose";
import { ILostFound, LostFoundModel } from "./lostAndFound.interface";
import {
  REPORT_STATUS,
  RECOVERY_METHOD,
  FOUND_STATUS,
  PAYMENT_STATUS,
} from "./lostAndFound.constant";

const auditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const lostFoundSchema = new Schema<ILostFound, LostFoundModel>(
  {
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    passengerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    itemCategory: {
      type: Schema.Types.ObjectId,
      ref: "LostAndFoundItemCategory",
      required: true,
    },
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedFiles: {
      type: [
        {
          fileUrl: {
            type: String,
            required: true,
          },
          fileName: {
            type: String,
          },
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    lastSeenLocation: {
      type: String,
      required: true,
      trim: true,
    },
    reportStatus: {
      type: String,
      enum: Object.values(REPORT_STATUS),
      default: REPORT_STATUS.REPORTED,
      index: true,
    },
    foundStatus: {
      type: String,
      enum: Object.values(FOUND_STATUS),
      default: FOUND_STATUS.PENDING,
      index: true,
    },
    recoveryMethod: {
      type: String,
      enum: Object.values(RECOVERY_METHOD),
      required: false,
    },
    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: false,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    deliveryLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: false,
      },
      address: {
        type: String,
        trim: true,
      },
    },
    scheduledAt: {
      type: Date,
      required: false,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.NOT_REQUIRED,
      index: true,
    },
    paymentIntentId: {
      type: String,
      required: false,
    },
    paymentTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: false,
    },
    paymentReference: {
      type: String,
      required: false,
    },
    paymentAmount: {
      type: Number,
      required: false,
    },
    paymentCurrency: {
      type: String,
      required: false,
    },
    passengerConfirmed: {
      type: Boolean,
      default: false,
    },
    driverConfirmed: {
      type: Boolean,
      default: false,
    },
    passengerRated: {
      type: Boolean,
      default: false,
    },
    passengerRating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    passengerReview: {
      type: String,
      trim: true,
      required: false,
    },
    adminNotes: {
      type: String,
      trim: true,
      required: false,
    },
    driverNotes: {
      type: String,
      trim: true,
      required: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    auditLogs: {
      type: [auditLogSchema],
      default: [],
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

export const LostFound = model<ILostFound, LostFoundModel>(
  "LostFound",
  lostFoundSchema,
);
