import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import { io } from "socket.io-client";
import { User } from "../src/app/modules/user/user.model";
import { Chat } from "../src/app/modules/chat/chat.model";
import { Message } from "../src/app/modules/message/message.model";
import { jwtHelper } from "../src/helpers/jwtHelper";
import { USER_ROLES, STATUS } from "../src/enums/user";

dotenv.config();

const port = process.env.PORT || "5005";
const host = process.env.IP || "localhost";
const baseURL = `http://${host}:${port}`;
const jwtSecret = process.env.JWT_SECRET || "alygo_secret_key";

async function waitConnect(socket: any): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once("connect", () => resolve());
    socket.once("connect_error", (err: any) => reject(err));
    setTimeout(() => reject(new Error("Socket connection timeout")), 5000);
  });
}

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not defined in env");
    process.exit(1);
  }

  console.log("Connecting to Database...");
  await mongoose.connect(dbUrl);
  console.log("Connected to Database.");

  // Find or create User A (Sender)
  let userA = await User.findOne({ email: "test_user_a@example.com" });
  if (!userA) {
    console.log("Creating Test User A...");
    userA = await User.create({
      name: "Test User A",
      email: "test_user_a@example.com",
      phone: "+1234567890",
      countryCode: "+1",
      status: STATUS.ACTIVE,
      role: USER_ROLES.USER,
      verified: true,
    });
  }
  console.log(`User A (Sender): ID=${userA._id}, Role=${userA.role}`);

  // Find or create User B (Receiver)
  let userB = await User.findOne({ email: "test_user_b@example.com" });
  if (!userB) {
    console.log("Creating Test User B...");
    userB = await User.create({
      name: "Test User B",
      email: "test_user_b@example.com",
      phone: "+1987654321",
      countryCode: "+1",
      status: STATUS.ACTIVE,
      role: USER_ROLES.USER,
      verified: true,
    });
  }
  console.log(`User B (Receiver): ID=${userB._id}, Role=${userB.role}`);

  // Generate JWT tokens
  const tokenA = jwtHelper.createToken(
    { id: userA._id.toString(), role: userA.role },
    jwtSecret,
    "1h",
  );
  const tokenB = jwtHelper.createToken(
    { id: userB._id.toString(), role: userB.role },
    jwtSecret,
    "1h",
  );
  console.log("Tokens generated.");

  // Connect sockets
  console.log(`Connecting User B socket to ${baseURL}...`);
  const socketB = io(baseURL, {
    query: { token: `Bearer ${tokenB}` },
    transports: ["websocket"],
    forceNew: true,
  });

  try {
    await waitConnect(socketB);
    console.log("User B socket successfully connected!");
  } catch (err: any) {
    console.error("Failed to connect User B socket:", err.message);
    socketB.disconnect();
    await mongoose.disconnect();
    process.exit(1);
  }

  // Setup event listeners for User B
  const receivedEvents: string[] = [];
  const eventsPayloads: any = {};

  socketB.on(`newChat::${userB._id}`, (data) => {
    console.log(`[SOCKET EVENT] newChat received!`);
    receivedEvents.push("newChat");
    eventsPayloads.newChat = data;
  });

  socketB.on(`newMessage::${userB._id}`, (data) => {
    console.log(`[SOCKET EVENT] newMessage received!`);
    receivedEvents.push("newMessage");
    eventsPayloads.newMessage = data;
  });

  socketB.on(`unreadCountUpdate::${userB._id}`, (data) => {
    console.log(`[SOCKET EVENT] unreadCountUpdate received!`);
    receivedEvents.push("unreadCountUpdate");
    eventsPayloads.unreadCountUpdate = data;
  });

  socketB.on(`chatListUpdate::${userB._id}`, (data) => {
    console.log(`[SOCKET EVENT] chatListUpdate received!`);
    receivedEvents.push("chatListUpdate");
    eventsPayloads.chatListUpdate = data;
  });

  // REST API Steps
  let chatId: string = "";
  try {
    // 1. Create chat
    console.log("\n--- Creating Chat via REST API ---");
    const createChatRes = await axios.post(
      `${baseURL}/api/v1/chats/create-chat`,
      {
        participant: userB._id.toString(),
        communicationType: "other",
      },
      {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      },
    );
    chatId = createChatRes.data.data._id;
    console.log("REST API Response (Create Chat):", createChatRes.data);
    console.log(`Chat ID Created: ${chatId}`);

    // Wait slightly to let sockets register the room or trigger newChat if applicable
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. Send Message
    console.log("\n--- Sending Message via REST API ---");
    const sendMessageRes = await axios.post(
      `${baseURL}/api/v1/messages/send-message/${chatId}`,
      {
        text: "Hello, this is a test message to verify the flow!",
      },
      {
        headers: {
          Authorization: `Bearer ${tokenA}`,
        },
      },
    );
    console.log("REST API Response (Send Message):", sendMessageRes.data);

    // Wait 2 seconds for sockets to transmit everything
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Query Chats
    console.log("\n--- Querying Chats via REST API ---");
    const getChatsRes = await axios.get(`${baseURL}/api/v1/chats`, {
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });
    console.log("User A Chats List Count:", getChatsRes.data.data.chats.length);

    // 4. Query Messages
    console.log("\n--- Querying Messages via REST API ---");
    const getMessagesRes = await axios.get(
      `${baseURL}/api/v1/messages/${chatId}`,
      {
        headers: {
          Authorization: `Bearer ${tokenB}`,
        },
      },
    );
    console.log(
      "User B Message List Count:",
      getMessagesRes.data.data.messages.length,
    );
    console.log(
      "Last Message Text:",
      getMessagesRes.data.data.messages[0]?.text,
    );
  } catch (error: any) {
    console.error("API Call error:", error.response?.data || error.message);
  }

  // Socket assertions
  console.log("\n--- Verification Summary ---");
  console.log("Received socket events:", receivedEvents);

  const testResults = {
    chatCreatedSuccessfully: !!chatId,
    newChatSocketEventReceived:
      receivedEvents.includes("newChat") ||
      receivedEvents.includes("chatListUpdate"), // depending on how socket room binds
    newMessageSocketEventReceived: receivedEvents.includes("newMessage"),
    unreadCountUpdateReceived: receivedEvents.includes("unreadCountUpdate"),
    chatListUpdateReceived: receivedEvents.includes("chatListUpdate"),
  };

  console.log("Test Results:", JSON.stringify(testResults, null, 2));

  // Cleanup
  console.log("\nCleaning up test data...");
  if (chatId) {
    await Message.deleteMany({ chatId });
    await Chat.deleteOne({ _id: chatId });
    console.log("Deleted temporary chat and message records.");
  }

  socketB.disconnect();
  await mongoose.disconnect();
  console.log("Disconnected all connections.");
}

run().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
