import { model, Schema } from "mongoose";
import {
  IServiceCategory,
  ServiceCategoryModel,
} from "./serviceCategory.interface";
import { STATUS } from "../../../constants/status";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const serviceCategorySchema = new Schema<
  IServiceCategory,
  ServiceCategoryModel
>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(STATUS),
      default: STATUS.ACTIVE,
    },
    supportsReservation: {
      type: Boolean,
      default: true,
    },
    minimumAdvanceBookingMinutes: {
      type: Number,
      default: 30,
      min: 0,
    },
    maximumAdvanceBookingDays: {
      type: Number,
      default: 30,
      min: 1,
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

serviceCategorySchema.index({ name: 1, status: 1 });

serviceCategorySchema.plugin(softDeletePlugin);

export const ServiceCategory = model<IServiceCategory, ServiceCategoryModel>(
  "ServiceCategory",
  serviceCategorySchema,
);
