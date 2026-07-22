"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Banner = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const bannerSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    status: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
bannerSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Banner = (0, mongoose_1.model)("Banner", bannerSchema);
