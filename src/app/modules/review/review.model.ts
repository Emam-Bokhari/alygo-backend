import mongoose, { model, Schema } from "mongoose";
import { IReview, ReviewModel } from "./review.interface";
import { REVIEW_STATUS } from "./review.constant";

const reviewSchema = new Schema<IReview, ReviewModel>(
  {
    rideId: {
      type: Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
      index: true,
    },
    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewerRole: {
      type: String,
      enum: ["user", "driver"],
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverRole: {
      type: String,
      enum: ["user", "driver"],
      required: true,
    },
    rating: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
    reviewText: {
      type: String,
      trim: true,
      default: "",
    },
    selectedTags: {
      type: String,
      default: "",
    },
    appreciation: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.ACTIVE,
      required: true,
    },
    rideSnapshot: {
      driverName: { type: String, required: true },
      vehicleName: { type: String, required: true },
      vehicleNumber: { type: String, required: true },
      completedAt: { type: Date, required: true },
      rideCategory: { type: String, required: true },
      pickup: { type: String, required: true },
      destination: { type: String, required: true },
      fare: { type: Number, required: true },
    },
    reviewForId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    reviewById: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

// Prevent duplicate review: one reviewer can only review once per ride
reviewSchema.index({ rideId: 1, reviewerId: 1 }, { unique: true });

export const Review = model<IReview, ReviewModel>("Review", reviewSchema);

// Drop legacy index to support one review per ride
mongoose.connection.once("open", async () => {
  try {
    await mongoose.connection
      .db!.collection("reviews")
      .dropIndex("reviewForId_1_reviewById_1");
  } catch (err) {
    // Index might not exist or already dropped
  }
});
