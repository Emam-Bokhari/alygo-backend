import { Chat } from "./chat.model";
import mongoose from "mongoose";
import { User } from "../user/user.model";
import { Message } from "../message/message.model";
import ApiError from "../../../errors/ApiErrors";
import { CHAT_COMMUNICATION_TYPE } from "../../../enums/chat";
import { MESSAGE_TYPE } from "../../../enums/message";
import { chatSocketHelper } from "./socket/chat.socket";

const createChatIntoDB = async (
  participants: string[],
  communicationType?: CHAT_COMMUNICATION_TYPE,
  referenceId?: string,
) => {
  const query: any = {
    participants: { $all: participants },
    isDeleted: { $ne: true },
  };

  if (communicationType) {
    query.communicationType = communicationType;
  }
  if (referenceId) {
    query.referenceId = referenceId;
  }

  const isExistChat = await Chat.findOne(query);

  if (isExistChat) {
    return isExistChat;
  }
  const newChat = await Chat.create({
    participants: participants,
    lastMessage: null,
    communicationType: communicationType || CHAT_COMMUNICATION_TYPE.OTHER,
    referenceId: referenceId
      ? new mongoose.Types.ObjectId(referenceId)
      : undefined,
  });
  if (!newChat) {
    throw new Error("Failed to create chat");
  }

  newChat.participants.forEach((participant) => {
    chatSocketHelper.emitNewChat(participant.toString(), newChat);
  });
  return newChat;
};

const markChatAsRead = async (userId: string, chatId: string) => {
  // 1. Mark all messages in this chat sent by other participants as read
  await Message.updateMany(
    {
      chatId: new mongoose.Types.ObjectId(chatId),
      sender: { $ne: new mongoose.Types.ObjectId(userId) },
      read: false,
    },
    {
      $set: { read: true, readAt: new Date() },
    },
  );

  // 2. Add the user to the readBy list in the Chat document
  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { $addToSet: { readBy: userId } },
    { new: true },
  );

  // 3. Emit socket events to update unread count on the client
  chatSocketHelper.emitUnreadCountUpdate(userId, {
    chatId,
    action: "reset",
  });

  // Also emit a chat list update to the current user to update the unread count in the UI list
  try {
    const populatedChat = await Chat.findById(chatId)
      .populate("participants", "name role email profileImage")
      .populate("lastMessage")
      .lean();

    if (populatedChat) {
      const otherParticipants = populatedChat.participants.filter(
        (p: any) => p && p._id && p._id.toString() !== userId,
      );

      chatSocketHelper.emitChatListUpdate(userId, {
        chatId,
        chat: {
          ...populatedChat,
          participants: otherParticipants,
          isRead: true,
          unreadCount: 0,
        },
        action: "update",
      });
    }
  } catch (error) {
    console.error("Error emitting chat list update on markChatAsRead:", error);
  }

  return updatedChat;
};

// 5. Updated getAllChatsFromDB with better unread count calculation
const getAllChatsFromDB = async (
  userId: string,
  query: Record<string, any>,
) => {
  const searchTerm = query.searchTerm?.toLowerCase();
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  const chatQuery = {
    participants: { $in: [userId] },
    deletedBy: { $ne: userId },
    isDeleted: { $ne: true }, // new field
  };

  let chats;
  let totalChats;

  if (searchTerm) {
    const allChats = await Chat.find(chatQuery)
      .populate("lastMessage")
      .lean()
      .sort({ updatedAt: -1 });

    const allChatLists = await Promise.all(
      allChats.map(async (chat) => {
        const otherParticipantIds = chat.participants.filter(
          (participantId) => participantId && participantId.toString() !== userId,
        );

        const otherParticipants = await User.find({
          _id: { $in: otherParticipantIds },
        })
          .select("_id name profileImage email role")
          .lean();

        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          sender: { $ne: userId },
          read: false,
          isDeleted: false,
        });

        return {
          ...chat,
          participants: otherParticipants,
          isRead: unreadCount === 0, // Chat is read if no unread messages
          unreadCount,
        };
      }),
    );

    const filteredChats = allChatLists.filter((chat) => {
      return chat.participants.some((participant) =>
        participant.name && participant.name.toLowerCase().includes(searchTerm),
      );
    });

    totalChats = filteredChats.length;
    chats = filteredChats.slice(skip, skip + limit);
  } else {
    totalChats = await Chat.countDocuments(chatQuery);

    const rawChats = await Chat.find(chatQuery)
      .populate("lastMessage")
      .lean()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    chats = await Promise.all(
      rawChats.map(async (chat) => {
        const otherParticipantIds = chat.participants.filter(
          (participantId) =>
            participantId && participantId.toString() !== userId,
        );

        const otherParticipants = await User.find({
          _id: { $in: otherParticipantIds },
        })
          .select("_id name profileImage email role")
          .lean();

        // FIXED: Same unread count calculation
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          sender: { $ne: userId },
          read: false,
          isDeleted: false,
        });

        return {
          ...chat,
          participants: otherParticipants,
          isRead: unreadCount === 0,
          unreadCount,
        };
      }),
    );
  }

  // Calculate total unread counts across all active chats for this user (not just the paginated page)
  const allActiveChats = await Chat.find(chatQuery).select("_id").lean();
  const activeChatIds = allActiveChats.map((c) => c._id);

  const unreadStats = await Message.aggregate([
    {
      $match: {
        chatId: { $in: activeChatIds },
        sender: { $ne: new mongoose.Types.ObjectId(userId) },
        read: false,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$chatId",
        count: { $sum: 1 },
      },
    },
  ]);

  const unreadChatsCount = unreadStats.length;
  const totalUnreadMessages = unreadStats.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const totalPage = Math.ceil(totalChats / limit);

  return {
    data: chats,
    unreadChatsCount,
    totalUnreadMessages,
    meta: {
      limit,
      page,
      total: totalChats,
      totalPage,
    },
  };
};

const getChatImagesFromDB = async (chatId: string, userId: string) => {
  // check chat existence
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  // verify user is participant
  const isParticipant = chat.participants.some(
    (p: any) => p.toString() === userId.toString(),
  );
  if (!isParticipant) {
    throw new ApiError(403, "You are not a participant in this chat");
  }

  // ========================GET IMAGES DATA=======================
  const images = await Message.find({
    chatId,
    sender: userId,
    isDeleted: { $ne: true },
    $or: [{ type: MESSAGE_TYPE.IMAGE }, { type: MESSAGE_TYPE.BOTH }],
  })
    .sort({ createdAt: -1 })
    .select("image -_id")
    .lean();

  // return only image URLs as array
  return images.map((msg) => msg.image);
};

const softDeleteChatForUser = async (chatId: string, id: string) => {
  const userId = new mongoose.Types.ObjectId(id);
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat.participants.some((id) => id.toString() === userId.toString())) {
    throw new ApiError(401, "User is not authorized");
  }

  // If already deleted by this user, just return
  if (chat.deletedBy.some((id) => id.toString() === userId.toString())) {
    return chat;
  }

  // Add userId to deletedBy array
  chat.deletedBy.push(userId);

  // Optional: If all participants deleted, mark status deleted (soft delete for everyone)
  if (chat.deletedBy.length === chat.participants.length) {
    chat.isDeleted = true;
  }

  await chat.save();

  chat.participants.forEach((participant) => {
    chatSocketHelper.emitChatDeleted(participant.toString(), {
      chatId,
      userId,
    });
  });

  return chat;
};

export const ChatService = {
  createChatIntoDB,
  getAllChatsFromDB,
  markChatAsRead,
  softDeleteChatForUser,
  getChatImagesFromDB,
};
