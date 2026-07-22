import { model, Schema } from "mongoose";
import { TSupport, SupportModel } from "./support.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const supportSchema = new Schema<TSupport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

supportSchema.plugin(softDeletePlugin);

export const Support = model<TSupport, SupportModel>("Support", supportSchema);
