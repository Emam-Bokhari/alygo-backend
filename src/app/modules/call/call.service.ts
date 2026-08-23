import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Call } from "./call.model";
import { ICall } from "./call.interface";
import { CALL_STATUS, CALL_TYPE, COMMUNICATION_TYPE } from "./call.constant";
import { agoraProvider } from "./providers/agora.provider";
import { callPermissionHelper } from "./helpers/callPermission.helper";
import { callSocketHelper } from "./socket/call.socket";
import { notificationHelper } from "../../../app/builder/pushNotification";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { User } from "../user/user.model";
import config from "../../../config";

/**
 * Initiates a voice call under a generic communication context
 */
const initiateCallToDB = async (
  callerId: string | Types.ObjectId,
  payload: {
    communicationType: COMMUNICATION_TYPE;
    referenceId: string;
    receiverId: string;
    callType?: CALL_TYPE;
  },
): Promise<any> => {
  const {
    communicationType,
    referenceId,
    receiverId,
    callType = CALL_TYPE.VOICE,
  } = payload;

  if (callerId.toString() === receiverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You cannot call yourself.");
  }

  // 1. Centralized permission check
  const permission = await callPermissionHelper.checkCallPermission(
    callerId,
    receiverId,
    communicationType,
    referenceId,
  );

  if (!permission.allowed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, permission.reason);
  }

  const callerUser = await User.findById(callerId);
  const receiverUser = await User.findById(receiverId);

  if (!callerUser || !receiverUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User or participant not found.");
  }

  // 2. Generate Agora configs
  const channelName = agoraProvider.generateChannelName();
  const agoraUidCaller = agoraProvider.generateAgoraUid();
  const agoraUidReceiver = agoraProvider.generateAgoraUid();

  const callerToken = agoraProvider.generateAgoraToken(
    channelName,
    agoraUidCaller,
  );
  const receiverToken = agoraProvider.generateAgoraToken(
    channelName,
    agoraUidReceiver,
  );

  const expiresAt = new Date(
    Date.now() + (config.agora.tokenExpireSeconds || 3600) * 1000,
  );

  // 3. Create Call record in DB
  const callData: Partial<ICall> = {
    referenceId: new Types.ObjectId(referenceId),
    communicationType,
    channelName,
    agoraUidCaller,
    agoraUidReceiver,
    callerId: new Types.ObjectId(callerId.toString()),
    receiverId: new Types.ObjectId(receiverId),
    callerRole: callerUser.role,
    receiverRole: receiverUser.role,
    status: CALL_STATUS.INITIATED,
    callType,
    ringStartedAt: new Date(),
    tokenVersion: "v1",
  };

  // If the context has a rideId (e.g. REGULAR_RIDE, SCHEDULED_RIDE, RESERVATION), populate it
  if (
    communicationType === COMMUNICATION_TYPE.REGULAR_RIDE ||
    communicationType === COMMUNICATION_TYPE.SCHEDULED_RIDE ||
    communicationType === COMMUNICATION_TYPE.RESERVATION
  ) {
    callData.rideId = new Types.ObjectId(referenceId);
  }

  const callRecord = await Call.create(callData);

  // 4. Emit WebSockets events
  const socketDataCaller = {
    callId: callRecord._id,
    channelName,
    uid: agoraUidCaller,
    token: callerToken,
    expiresAt,
    callerId: callerId.toString(),
    receiverId: receiverId.toString(),
    callerName: callerUser.name,
    callerProfileImage: callerUser.profileImage || null,
    receiverName: receiverUser.name,
    receiverProfileImage: receiverUser.profileImage || null,
    communicationType,
    status: CALL_STATUS.INITIATED,
  };

  const socketDataReceiver = {
    callId: callRecord._id,
    channelName,
    uid: agoraUidReceiver,
    token: receiverToken,
    expiresAt,
    callerId: callerId.toString(),
    receiverId: receiverId.toString(),
    callerName: callerUser.name,
    callerProfileImage: callerUser.profileImage || null,
    receiverName: receiverUser.name,
    receiverProfileImage: receiverUser.profileImage || null,
    communicationType,
    status: CALL_STATUS.INITIATED,
  };

  callSocketHelper.emitCallInitiated(callerId.toString(), socketDataCaller);
  callSocketHelper.emitIncomingCall(receiverId, socketDataReceiver);
  callSocketHelper.emitCallRinging(callerId.toString(), {
    callId: callRecord._id,
    callerId: callerId.toString(),
    receiverId: receiverId.toString(),
    callerName: callerUser.name,
    callerProfileImage: callerUser.profileImage || null,
    receiverName: receiverUser.name,
    receiverProfileImage: receiverUser.profileImage || null,
    token: callerToken,
    uid: agoraUidCaller,
    channel: channelName,
    channelName,
  });

  // 5. Send FCM Push Notification to the receiver
  try {
    const isReceiverDriver = receiverUser.role === "driver";
    const notificationTitle = "Incoming Call";
    const notificationBody =
      callerUser.role === "driver"
        ? "Driver is calling..."
        : "Passenger is calling...";

    await notificationHelper.sendToUser(receiverId, {
      title: notificationTitle,
      body: notificationBody,
      type: isReceiverDriver
        ? NOTIFICATION_TYPE.DRIVER
        : NOTIFICATION_TYPE.USER,
      data: {
        type: "incoming-call",
        callId: callRecord._id.toString(),
        channelName,
        uid: agoraUidReceiver.toString(),
        token: receiverToken,
        callerId: callerId.toString(),
        receiverId: receiverId.toString(),
        callerName: callerUser.name || "",
        callerProfileImage: callerUser.profileImage || "",
        receiverName: receiverUser.name || "",
        receiverProfileImage: receiverUser.profileImage || "",
      },
    });
  } catch (error: any) {
    // Audit log error but do not block call flow
    console.error("FCM failed during call initiation:", error.message);
  }

  return {
    callId: callRecord._id,
    channel: channelName,
    token: callerToken,
    uid: agoraUidCaller,
    expiresAt,
    callerId: callerId.toString(),
    receiverId: receiverId.toString(),
    callerName: callerUser.name,
    callerProfileImage: callerUser.profileImage || null,
    receiverName: receiverUser.name,
    receiverProfileImage: receiverUser.profileImage || null,
  };
};

/**
 * Accept / Answer an incoming call
 */
const answerCallInDB = async (
  userId: string | Types.ObjectId,
  callId: string,
): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  if (call.receiverId.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to answer this call.",
    );
  }

  if (
    call.status !== CALL_STATUS.INITIATED &&
    call.status !== CALL_STATUS.RINGING
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot answer call in status: ${call.status}`,
    );
  }

  const now = new Date();
  call.status = CALL_STATUS.ACCEPTED;
  call.answeredAt = now;
  call.startedAt = now;
  await call.save();

  const callerUser = await User.findById(call.callerId).select(
    "name profileImage",
  );
  const receiverUser = await User.findById(call.receiverId).select(
    "name profileImage",
  );

  // Emit accepted/connected socket events
  const callerToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidCaller,
  );
  const receiverToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidReceiver,
  );

  const callerPayload = {
    callId,
    status: CALL_STATUS.ACCEPTED,
    answeredAt: now,
    callerId: call.callerId.toString(),
    receiverId: call.receiverId.toString(),
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: callerToken,
    uid: call.agoraUidCaller,
    channel: call.channelName,
    channelName: call.channelName,
  };

  const receiverPayload = {
    callId,
    status: CALL_STATUS.ACCEPTED,
    answeredAt: now,
    callerId: call.callerId.toString(),
    receiverId: call.receiverId.toString(),
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: receiverToken,
    uid: call.agoraUidReceiver,
    channel: call.channelName,
    channelName: call.channelName,
  };

  callSocketHelper.emitCallAccepted(call.callerId.toString(), callerPayload);
  callSocketHelper.emitCallConnected(call.callerId.toString(), callerPayload);
  callSocketHelper.emitCallConnected(call.receiverId.toString(), receiverPayload);

  return call;
};

/**
 * Reject an incoming call
 */
const rejectCallInDB = async (
  userId: string | Types.ObjectId,
  callId: string,
  reason?: string,
): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  if (call.receiverId.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to reject this call.",
    );
  }

  const now = new Date();
  call.status = CALL_STATUS.REJECTED;
  call.endedAt = now;
  call.rejected = true;
  call.endedBy = new Types.ObjectId(userId.toString());
  call.endReason = reason || "rejected";
  await call.save();

  const callerUser = await User.findById(call.callerId).select(
    "name profileImage",
  );
  const receiverUser = await User.findById(call.receiverId).select(
    "name profileImage",
  );

  // Emit socket events
  const callerToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidCaller,
  );

  const payload = {
    callId,
    status: CALL_STATUS.REJECTED,
    reason: call.endReason,
    callerId: call.callerId.toString(),
    receiverId: call.receiverId.toString(),
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: callerToken,
    uid: call.agoraUidCaller,
    channel: call.channelName,
    channelName: call.channelName,
  };
  callSocketHelper.emitCallRejected(call.callerId.toString(), payload);
  callSocketHelper.emitCallEnded(call.callerId.toString(), payload);

  // Send FCM push notifications for rejected call
  try {
    const isCallerDriver = call.callerRole === "driver";
    await notificationHelper.sendToUser(call.callerId.toString(), {
      title: "Call Rejected",
      body: `Your call was declined.`,
      type: isCallerDriver ? NOTIFICATION_TYPE.DRIVER : NOTIFICATION_TYPE.USER,
      data: {
        type: "call-rejected",
        callId,
      },
    });
  } catch (error: any) {
    console.error("FCM failed during call rejection:", error.message);
  }

  return call;
};

/**
 * Cancel call before it gets answered
 */
const cancelCallInDB = async (
  userId: string | Types.ObjectId,
  callId: string,
): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  if (call.callerId.toString() !== userId.toString()) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to cancel this call.",
    );
  }

  if (
    call.status === CALL_STATUS.ACCEPTED ||
    call.status === CALL_STATUS.CONNECTED
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Call is already answered. Please end the call instead.",
    );
  }

  const now = new Date();
  call.status = CALL_STATUS.CANCELLED;
  call.endedAt = now;
  call.cancelled = true;
  call.endedBy = new Types.ObjectId(userId.toString());
  call.endReason = "cancelled";
  await call.save();

  const callerUser = await User.findById(call.callerId).select(
    "name profileImage",
  );
  const receiverUser = await User.findById(call.receiverId).select(
    "name profileImage",
  );

  // Emit socket events
  const receiverToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidReceiver,
  );

  const payload = {
    callId,
    status: CALL_STATUS.CANCELLED,
    callerId: call.callerId.toString(),
    receiverId: call.receiverId.toString(),
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: receiverToken,
    uid: call.agoraUidReceiver,
    channel: call.channelName,
    channelName: call.channelName,
  };
  callSocketHelper.emitCallCancelled(call.receiverId.toString(), payload);
  callSocketHelper.emitCallEnded(call.receiverId.toString(), payload);

  // Send FCM push notifications for cancelled call
  try {
    const isReceiverDriver = call.receiverRole === "driver";
    await notificationHelper.sendToUser(call.receiverId.toString(), {
      title: "Call Cancelled",
      body: `The incoming call was cancelled.`,
      type: isReceiverDriver
        ? NOTIFICATION_TYPE.DRIVER
        : NOTIFICATION_TYPE.USER,
      data: {
        type: "call-cancelled",
        callId,
      },
    });
  } catch (error: any) {
    console.error("FCM failed during call cancellation:", error.message);
  }

  return call;
};

/**
 * End an active call
 */
const endCallInDB = async (
  userId: string | Types.ObjectId,
  callId: string,
): Promise<ICall> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  const callerStr = call.callerId.toString();
  const receiverStr = call.receiverId.toString();
  const userIdStr = userId.toString();

  if (callerStr !== userIdStr && receiverStr !== userIdStr) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not a participant in this call.",
    );
  }

  // If already ended, just return
  const finalStatuses = [
    CALL_STATUS.ENDED,
    CALL_STATUS.REJECTED,
    CALL_STATUS.CANCELLED,
    CALL_STATUS.TIMEOUT,
    CALL_STATUS.FAILED,
  ];
  if (finalStatuses.includes(call.status)) {
    return call;
  }

  const now = new Date();
  const callStartTime = call.startedAt || call.answeredAt || call.createdAt;
  const durationSec = Math.floor(
    (now.getTime() - callStartTime.getTime()) / 1000,
  );

  const endingUserRole =
    (userIdStr === callerStr ? call.callerRole : call.receiverRole) || "user";

  call.status = CALL_STATUS.ENDED;
  call.endedAt = now;
  call.endedBy = new Types.ObjectId(userIdStr);
  call.durationSeconds = durationSec;
  call.endReason = `ended_by_${endingUserRole}`;
  await call.save();

  const callerUser = await User.findById(call.callerId).select(
    "name profileImage",
  );
  const receiverUser = await User.findById(call.receiverId).select(
    "name profileImage",
  );

  // Emit socket events
  const callerToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidCaller,
  );
  const receiverToken = agoraProvider.generateAgoraToken(
    call.channelName,
    call.agoraUidReceiver,
  );

  const callerPayload = {
    callId,
    status: CALL_STATUS.ENDED,
    durationSeconds: durationSec,
    callerId: callerStr,
    receiverId: receiverStr,
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: callerToken,
    uid: call.agoraUidCaller,
    channel: call.channelName,
    channelName: call.channelName,
  };

  const receiverPayload = {
    callId,
    status: CALL_STATUS.ENDED,
    durationSeconds: durationSec,
    callerId: callerStr,
    receiverId: receiverStr,
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    token: receiverToken,
    uid: call.agoraUidReceiver,
    channel: call.channelName,
    channelName: call.channelName,
  };

  callSocketHelper.emitCallEnded(callerStr, callerPayload);
  callSocketHelper.emitCallEnded(receiverStr, receiverPayload);

  // Send FCM notifications if necessary
  try {
    const peerId = callerStr === userIdStr ? receiverStr : callerStr;
    const peerRole =
      callerStr === userIdStr ? call.receiverRole : call.callerRole;
    await notificationHelper.sendToUser(peerId, {
      title: "Call Ended",
      body: `Call duration: ${Math.floor(durationSec / 60)}m ${durationSec % 60}s.`,
      type:
        peerRole === "driver"
          ? NOTIFICATION_TYPE.DRIVER
          : NOTIFICATION_TYPE.USER,
      data: {
        type: "call-ended",
        callId,
      },
    });
  } catch (error: any) {
    console.error("FCM failed during call end:", error.message);
  }

  return call;
};

/**
 * Regenerate expired token for active call
 */
const getTokenFromDB = async (
  userId: string | Types.ObjectId,
  callId: string,
): Promise<any> => {
  const call = await Call.findById(callId);

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  const callerStr = call.callerId.toString();
  const receiverStr = call.receiverId.toString();
  const userIdStr = userId.toString();

  if (callerStr !== userIdStr && receiverStr !== userIdStr) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not a participant in this call.",
    );
  }

  const activeStatuses = [
    CALL_STATUS.INITIATED,
    CALL_STATUS.RINGING,
    CALL_STATUS.ACCEPTED,
    CALL_STATUS.CONNECTED,
  ];
  if (!activeStatuses.includes(call.status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot refresh token for inactive calls.",
    );
  }

  const userUid =
    callerStr === userIdStr ? call.agoraUidCaller : call.agoraUidReceiver;
  const token = agoraProvider.generateAgoraToken(call.channelName, userUid);
  const expiresAt = new Date(
    Date.now() + (config.agora.tokenExpireSeconds || 3600) * 1000,
  );

  const callerUser = await User.findById(call.callerId).select(
    "name profileImage",
  );
  const receiverUser = await User.findById(call.receiverId).select(
    "name profileImage",
  );

  // Emit refreshed socket
  callSocketHelper.emitCallTokenRefreshed(userIdStr, {
    callId,
    token,
    uid: userUid,
    expiresAt,
    callerId: callerStr,
    receiverId: receiverStr,
    callerName: callerUser?.name || "",
    callerProfileImage: callerUser?.profileImage || null,
    receiverName: receiverUser?.name || "",
    receiverProfileImage: receiverUser?.profileImage || null,
    channel: call.channelName,
    channelName: call.channelName,
  });

  return {
    callId: call._id,
    token,
    uid: userUid,
    expiresAt,
  };
};

/**
 * Get call history of a user with filters and pagination
 */
const getHistoryFromDB = async (
  userId: string | Types.ObjectId,
  query: Record<string, any>,
): Promise<any> => {
  const {
    page = 1,
    limit = 10,
    status,
    communicationType,
    startDate,
    endDate,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  // Query constraints: user is either caller or receiver
  const filter: Record<string, any> = {
    $or: [
      { callerId: new Types.ObjectId(userId.toString()) },
      { receiverId: new Types.ObjectId(userId.toString()) },
    ],
  };

  if (status) {
    filter.status = status;
  }

  if (communicationType) {
    filter.communicationType = communicationType;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  const data = await Call.find(filter)
    .populate("callerId", "name email phone profileImage role")
    .populate("receiverId", "name email phone profileImage role")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Call.countDocuments(filter);

  return {
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPage: Math.ceil(total / Number(limit)),
    },
    data,
  };
};

/**
 * Retrieve details of a single call
 */
const getCallFromDB = async (
  userId: string | Types.ObjectId,
  callId: string,
): Promise<ICall> => {
  const call = await Call.findById(callId)
    .populate("callerId", "name email phone profileImage role")
    .populate("receiverId", "name email phone profileImage role");

  if (!call) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Call record not found.");
  }

  const callerStr = call.callerId._id.toString();
  const receiverStr = call.receiverId._id.toString();
  const userIdStr = userId.toString();

  // Participant or Admin check
  const isAdmin =
    ["admin", "superAdmin"].includes(call.callerRole) ||
    ["admin", "superAdmin"].includes(call.receiverRole);
  // Wait, let's fetch the actual requesting user role
  const user = await User.findById(userIdStr);
  const isRequestingUserAdmin =
    user && ["admin", "superAdmin"].includes(user.role);

  if (
    callerStr !== userIdStr &&
    receiverStr !== userIdStr &&
    !isRequestingUserAdmin
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You do not have access to this call history.",
    );
  }

  return call;
};

export const CallService = {
  initiateCallToDB,
  answerCallInDB,
  rejectCallInDB,
  cancelCallInDB,
  endCallInDB,
  getTokenFromDB,
  getHistoryFromDB,
  getCallFromDB,
};