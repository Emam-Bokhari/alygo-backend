import { model, Schema } from "mongoose";
import {
  EmergencyContactModel,
  IEmergencyContact,
} from "./emergencyContact.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const emergencyContactSchema = new Schema<
  IEmergencyContact,
  EmergencyContactModel
>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: false,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

emergencyContactSchema.plugin(softDeletePlugin);

// Prevent duplicate contacts with the same number for a single user
emergencyContactSchema.index({ userId: 1, phone: 1 }, { unique: true });

export const EmergencyContact = model<IEmergencyContact, EmergencyContactModel>(
  "EmergencyContact",
  emergencyContactSchema,
);
