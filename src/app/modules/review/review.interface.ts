import { Model, Types } from "mongoose";
import { REVIEW_STATUS } from "./review.constant";

export interface IReview {
  rideId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  reviewerRole: "user" | "driver";
  receiverId: Types.ObjectId;
  receiverRole: "user" | "driver";
  rating: number; // 1 | 2 | 3 | 4 | 5
  reviewText?: string;
  selectedTags?: string;
  appreciation: number;
  status: REVIEW_STATUS;
  rideSnapshot: {
    driverName: string;
    vehicleName: string;
    vehicleNumber: string;
    completedAt: Date;
    rideCategory: string;
    pickup: string;
    destination: string;
    fare: number;
  };
  reviewForId?: Types.ObjectId;
  reviewById?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReviewModel = Model<IReview>;

// Backward compatibility enum for user.service.ts
export enum REVIEW_TARGET_TYPE {
  DRIVER = "driver",
  USER = "user",
}
