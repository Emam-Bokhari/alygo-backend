"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiSupport = void 0;
const mongoose_1 = require("mongoose");
const aiSupportSchema = new mongoose_1.Schema(
  {
    driverId: {
      type: mongoose_1.Schema.Types.ObjectId,
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
exports.AiSupport = (0, mongoose_1.model)("AiSupport", aiSupportSchema);
