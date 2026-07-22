import { Model, Types } from "mongoose";
import {
  ITEM_NOT_FOUND_REASON,
  LOST_AND_FOUND_STATUS,
  RETURN_METHOD,
} from "./lostAndFound.constant";

export interface ILostAndFound {
  rideId: Types.ObjectId;
  reporterId: Types.ObjectId; // Passenger who reported losing the item
  driverId: Types.ObjectId; // Driver who operated the ride

  itemName: string;
  category: string; // Phone, Wallet, Keys, etc.
  description: string;

  status: LOST_AND_FOUND_STATUS;

  driverResolution?: {
    isFound: boolean;
    notFoundReason?: ITEM_NOT_FOUND_REASON;
    notes?: string;
    resolvedAt?: Date;
  };

  returnArrangement?: {
    method: RETURN_METHOD;
    location?: {
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude]
      address: string;
    };
    date: string;
    time: string;
    deliveryFee?: number;
    estimatedArrival?: string;

    // Status trackers for schedule & handover confirmation
    isPassengerConfirmed: boolean;
    passengerConfirmedAt?: Date;

    isDriverHandoverCompleted: boolean;
    driverHandoverCompletedAt?: Date;

    isPassengerHandoverCompleted: boolean;
    passengerHandoverCompletedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

export type LostAndFoundModel = Model<ILostAndFound>;
