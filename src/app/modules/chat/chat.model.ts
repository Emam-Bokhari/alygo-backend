import mongoose, { Schema } from "mongoose";
import { IChat } from "./chat.interface";

const chatSchema = new Schema<IChat>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    read: {
      type: Boolean,
      required: false,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["ACTIVE", "DELETED"], default: "ACTIVE" },
    pinnedMessages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Chat = mongoose.model<IChat>("Chat", chatSchema);
