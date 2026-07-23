import { model, Schema, Types } from "mongoose";

export interface IDestinationFilter {
  driverId: Types.ObjectId;
  tierId: Types.ObjectId;
  destination: {
    address: string;
    location: {
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  coordinates: [number, number]; // [longitude, latitude] for index
  arrivalTime: Date;
  radiusKm: number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "COMPLETED";
  remainingQuota: number;
  activatedAt: Date;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const destinationFilterSchema = new Schema<IDestinationFilter>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tierId: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      required: true,
    },
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
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: "2dsphere",
    },
    arrivalTime: {
      type: Date,
      required: true,
    },
    radiusKm: {
      type: Number,
      required: true,
      default: 5,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "EXPIRED", "CANCELLED", "COMPLETED"],
      default: "ACTIVE",
    },
    remainingQuota: {
      type: Number,
      required: true,
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const DestinationFilter = model<IDestinationFilter>(
  "DestinationFilter",
  destinationFilterSchema,
);
