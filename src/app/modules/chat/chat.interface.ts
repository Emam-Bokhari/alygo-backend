import { Types } from "mongoose";

export type IChat = {
  participants: Types.ObjectId[];
  lastMessage: Types.ObjectId;
  read: boolean;
  readBy: Types.ObjectId[];
  deletedBy: [Types.ObjectId];
  isDeleted: boolean;
  status: "ACTIVE" | "DELETED";
  pinnedMessages: Types.ObjectId[]; // Pinned message IDs
};
