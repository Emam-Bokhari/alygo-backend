import config from "../../../../config";
import { ICall } from "../call.interface";

/**
 * Checks if the Agora RTC token for a call has expired or is close to expiring
 */
const isTokenExpired = (call: ICall): boolean => {
  const expireSeconds = config.agora.tokenExpireSeconds || 3600;
  const tokenStartTime = call.startedAt || call.createdAt;
  const expiresAt = new Date(tokenStartTime.getTime() + expireSeconds * 1000);
  // Mark as expired if current time is equal or past the expiry time
  return new Date() >= expiresAt;
};

/**
 * Gets the expiration timestamp for the call token
 */
const getExpirationTime = (call: ICall): Date => {
  const expireSeconds = config.agora.tokenExpireSeconds || 3600;
  const tokenStartTime = call.startedAt || call.createdAt;
  return new Date(tokenStartTime.getTime() + expireSeconds * 1000);
};

export const callTokenHelper = {
  isTokenExpired,
  getExpirationTime,
};