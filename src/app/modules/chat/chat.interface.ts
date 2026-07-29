import { Types } from "mongoose";
import { CHAT_COMMUNICATION_TYPE } from "./chat.constant";

export type IChat = {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId | null;
  read?: boolean;
  readBy: Types.ObjectId[];
  deletedBy: Types.ObjectId[];
  isDeleted: boolean;
  status: "ACTIVE" | "DELETED";
  pinnedMessages: Types.ObjectId[]; // Pinned message IDs
  communicationType?: CHAT_COMMUNICATION_TYPE;
  referenceId?: Types.ObjectId;
};
