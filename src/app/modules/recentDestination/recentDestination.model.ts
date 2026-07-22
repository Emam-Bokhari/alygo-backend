import { model, Schema } from "mongoose";
import {
  IRecentDestination,
  IRecentDestinationModel,
} from "./recentDestination.interface";

const recentDestinationSchema = new Schema<
  IRecentDestination,
  IRecentDestinationModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    address: {
      type: String,
      required: true,
    },
    placeName: {
      type: String,
      required: false,
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
    lastUsedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    useCount: {
      type: Number,
      required: true,
      default: 1,
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

// 2dsphere index for geospatial queries on location field
recentDestinationSchema.index({ location: "2dsphere" });

// Compound index for efficient queries: userId + lastUsedAt
recentDestinationSchema.index({ userId: 1, lastUsedAt: -1 });

export const RecentDestination = model<
  IRecentDestination,
  IRecentDestinationModel
>("RecentDestination", recentDestinationSchema);
