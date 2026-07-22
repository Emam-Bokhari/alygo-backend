"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostAndFoundItemCategory = void 0;
const mongoose_1 = require("mongoose");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const lostAndFoundItemCategorySchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: Object.values(status_1.STATUS),
      default: status_1.STATUS.ACTIVE,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
// Indexes
lostAndFoundItemCategorySchema.index({ name: 1, status: 1 });
lostAndFoundItemCategorySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.LostAndFoundItemCategory = (0, mongoose_1.model)(
  "LostAndFoundItemCategory",
  lostAndFoundItemCategorySchema,
);
