import { socketHelper } from "../../../../helpers/socketHelper";

/**
 * Socket.io events wrapper for the calling module
 */
const emitCallInitiated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-initiated", data);
};

const emitIncomingCall = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "incoming-call", data);
};

const emitCallRinging = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-ringing", data);
};

const emitCallAccepted = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-accepted", data);
};

const emitCallConnected = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-connected", data);
};

const emitCallRejected = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-rejected", data);
};

const emitCallEnded = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-ended", data);
};

const emitCallCancelled = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-cancelled", data);
};

const emitCallTimeout = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-timeout", data);
};

const emitCallTokenRefreshed = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "call-token-refreshed", data);
};

export const callSocketHelper = {
  emitCallInitiated,
  emitIncomingCall,
  emitCallRinging,
  emitCallAccepted,
  emitCallConnected,
  emitCallRejected,
  emitCallEnded,
  emitCallCancelled,
  emitCallTimeout,
  emitCallTokenRefreshed,
};
