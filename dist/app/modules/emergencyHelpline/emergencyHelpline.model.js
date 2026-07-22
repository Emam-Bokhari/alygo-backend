"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyHelpline = void 0;
const mongoose_1 = require("mongoose");
const emergencyHelplineSchema = new mongoose_1.Schema(
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
exports.EmergencyHelpline = (0, mongoose_1.model)(
  "EmergencyHelpline",
  emergencyHelplineSchema,
);
