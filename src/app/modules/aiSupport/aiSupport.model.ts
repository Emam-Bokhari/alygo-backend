import { model, Schema } from "mongoose";
import { IAiSupport, AiSupportModel } from "./aiSupport.interface";

const aiSupportSchema = new Schema<IAiSupport, AiSupportModel>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
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

// Index to fetch a driver's Q&A support history quickly in order
aiSupportSchema.index({ driverId: 1, createdAt: -1 });

export const AiSupport = model<IAiSupport, AiSupportModel>(
  "AiSupport",
  aiSupportSchema,
);
