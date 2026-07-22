import { Schema, model } from "mongoose";
import {
  ILostAndFoundItemCategory,
  LostAndFoundItemCategoryModel,
} from "./lostAndFoundItemCategory.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const lostAndFoundItemCategorySchema = new Schema<ILostAndFoundItemCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes
lostAndFoundItemCategorySchema.index({ name: 1, status: 1 });

lostAndFoundItemCategorySchema.plugin(softDeletePlugin);

export const LostAndFoundItemCategory = model<
  ILostAndFoundItemCategory,
  LostAndFoundItemCategoryModel
>("LostAndFoundItemCategory", lostAndFoundItemCategorySchema);
