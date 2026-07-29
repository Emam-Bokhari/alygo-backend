import mongoose, { Schema } from "mongoose";
import { IChat } from "./chat.interface";
import { CHAT_COMMUNICATION_TYPE } from "./chat.constant";

const chatSchema = new Schema<IChat>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message", default: null },
    read: {
      type: Boolean,
      default: false,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
    status: { type: String, enum: ["ACTIVE", "DELETED"], default: "ACTIVE" },
    pinnedMessages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    communicationType: {
      type: String,
      enum: Object.values(CHAT_COMMUNICATION_TYPE),
      default: CHAT_COMMUNICATION_TYPE.OTHER,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Chat = mongoose.model<IChat>("Chat", chatSchema);
