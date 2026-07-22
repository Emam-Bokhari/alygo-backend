import { model, Schema } from "mongoose";
import { ILostAndFound, LostAndFoundModel } from "./lostAndFound.interface";
import {
  ITEM_NOT_FOUND_REASON,
  LOST_AND_FOUND_STATUS,
  RETURN_METHOD,
} from "./lostAndFound.constant";

const lostAndFoundSchema = new Schema<ILostAndFound, LostAndFoundModel>(
  {
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    reporterId: {
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
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(LOST_AND_FOUND_STATUS),
      default: LOST_AND_FOUND_STATUS.REPORTED,
      index: true,
    },
    driverResolution: {
      isFound: {
        type: Boolean,
        required: false,
      },
      notFoundReason: {
        type: String,
        enum: Object.values(ITEM_NOT_FOUND_REASON),
        required: false,
      },
      notes: {
        type: String,
        trim: true,
        default: "",
      },
      resolvedAt: {
        type: Date,
        required: false,
      },
    },
    returnArrangement: {
      method: {
        type: String,
        enum: Object.values(RETURN_METHOD),
        required: false,
      },
      location: {
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
      date: {
        type: String,
        trim: true,
      },
      time: {
        type: String,
        trim: true,
      },
      deliveryFee: {
        type: Number,
        min: 0,
        default: 0,
      },
      estimatedArrival: {
        type: String,
        trim: true,
      },
      isPassengerConfirmed: {
        type: Boolean,
        default: false,
      },
      passengerConfirmedAt: {
        type: Date,
      },
      isDriverHandoverCompleted: {
        type: Boolean,
        default: false,
      },
      driverHandoverCompletedAt: {
        type: Date,
      },
      isPassengerHandoverCompleted: {
        type: Boolean,
        default: false,
      },
      passengerHandoverCompletedAt: {
        type: Date,
      },
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

export const LostAndFound = model<ILostAndFound, LostAndFoundModel>(
  "LostAndFound",
  lostAndFoundSchema,
);
