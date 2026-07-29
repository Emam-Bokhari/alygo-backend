import { RtcTokenBuilder, RtcRole } from "agora-token";
import config from "../../../../config";
import crypto from "crypto";

/**
 * Generate Agora RTC Token for standard publisher voice calls
 */
const generateAgoraToken = (
  channelName: string,
  uid: number,
): string => {
  const appId = config.agora.appId;
  const appCertificate = config.agora.appCertificate;

  if (!appId || !appCertificate) {
    throw new Error("Agora App ID and Certificate are not configured.");
  }

  const expireSeconds = config.agora.tokenExpireSeconds || 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireSeconds;

  // In voice calls, both participants publish their audio streams
  const rtcRole = RtcRole.PUBLISHER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    privilegeExpiredTs,
    privilegeExpiredTs // privilege expiration
  );

  return token;
};

/**
 * Generate a unique and secure channel name
 */
const generateChannelName = (): string => {
  return `call_${crypto.randomBytes(12).toString("hex")}`;
};

/**
 * Generate a random 32-bit unsigned integer Agora UID
 */
const generateAgoraUid = (): number => {
  return Math.floor(Math.random() * 2000000000) + 1;
};

export const agoraProvider = {
  generateAgoraToken,
  generateChannelName,
  generateAgoraUid,
};
