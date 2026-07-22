import { model, Schema } from "mongoose";
import {
  EmergencyHelplineModel,
  IEmergencyHelpline,
} from "./emergencyHelpline.interface";

const emergencyHelplineSchema = new Schema<
  IEmergencyHelpline,
  EmergencyHelplineModel
>(
  {
    callNumber: {
      type: String,
      required: true,
      trim: true,
    },
    textNumber: {
      type: String,
      required: true,
      trim: true,
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

export const EmergencyHelpline = model<
  IEmergencyHelpline,
  EmergencyHelplineModel
>("EmergencyHelpline", emergencyHelplineSchema);
