"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const messageSchema = new mongoose_1.Schema(
  {
    chatId: {
      type: mongoose_1.Schema.Types.ObjectId,
      required: true,
      ref: "Chat",
    },
    sender: {
      type: mongoose_1.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    text: {
      type: String,
    },
    image: {
      type: String,
      default: "",
    },
    read: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ["TEXT", "IMAGE", "DOC", "BOTH"],
      default: "TEXT",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedBy: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
    },
    pinnedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
exports.Message = (0, mongoose_1.model)("Message", messageSchema);
