import { Document, Model, Types } from "mongoose";

export interface IRecentDestination {
  userId: Types.ObjectId;
  address: string;
  placeName?: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  lastUsedAt: Date;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecentDestinationModel extends Model<IRecentDestination> {
  // Add any static methods here if needed
}

export type RecentDestinationModal = IRecentDestination & Document;
