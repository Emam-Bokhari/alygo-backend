import { Schema, model } from "mongoose";
import { IPermission } from "./permission.interface";

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

permissionSchema.index({ key: 1 }, { unique: true });
permissionSchema.index({ module: 1 });
permissionSchema.index({ status: 1 });

export const Permission = model<IPermission>("Permission", permissionSchema);
