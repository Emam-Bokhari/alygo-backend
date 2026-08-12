import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { Schema, model } from "mongoose";
import { IPermission, PermissionModel } from "./permission.interface";

const permissionSchema = new Schema<IPermission, PermissionModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      default: "manage",
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    isSystem: {
      type: Boolean,
      required: true,
      default: true,
    },
    // Backward compatibility fields
    key: {
      type: String,
      trim: true,
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
  },
);

// Pre-validate hook to auto-populate and normalize fields for compatibility
permissionSchema.pre("validate", function (next) {
  let lookupName = this.name || this.key || "";

  // Prefer key if set
  if (this.key && !this.name) {
    lookupName = this.key;
  }

  if (lookupName) {
    const parts = lookupName.split(".");
    if (parts.length >= 2) {
      if (!this.resource) this.resource = parts[0];
      if (!this.action) this.action = parts[1];
      this.name = `${this.resource}.${this.action}`.toLowerCase();
    } else {
      if (!this.resource) this.resource = lookupName.toLowerCase();
      if (!this.action) this.action = "manage";
      this.name = this.resource.toLowerCase();
    }
    this.key = this.name;
  }

  // Sync status and isActive
  if (this.status) {
    this.isActive = this.status === "active";
  } else if (this.isActive !== undefined) {
    this.status = this.isActive ? "active" : "inactive";
  } else {
    this.isActive = true;
    this.status = "active";
  }

  if (this.isSystem === undefined) {
    this.isSystem = true;
  }

  next();
});

permissionSchema.index({ name: 1 }, { unique: true });
permissionSchema.index({ resource: 1 });
permissionSchema.index({ module: 1 });
permissionSchema.index({ action: 1 });
permissionSchema.index({ key: 1 });
permissionSchema.index({ status: 1 });

permissionSchema.plugin(softDeletePlugin);

export const Permission = model<IPermission, PermissionModel>(
  "Permission",
  permissionSchema,
);
