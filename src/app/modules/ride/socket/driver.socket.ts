import { socketHelper } from "../../../../helpers/socketHelper";

/**
 * Socket.io events wrapper for the driver side of the ride module
 */
const emitRideRequest = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "ride-request", data);
};

const emitRideRequestCancelled = (driverIds: string[], data: any): void => {
  socketHelper.sendToUsers(driverIds, "ride-request-cancelled", data);
};

const emitRideStarted = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "ride-started", data);
};

const emitRideCompleted = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "ride-completed", data);
};

const emitWalletUpdated = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "wallet-updated", data);
};

const emitDriverWalletCredited = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "driver-wallet-credited", data);
};

const emitPaymentCompleted = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "payment-completed", data);
};

const emitPaymentSuccess = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "payment-success", data);
};

const emitReservationCancelled = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "reservation-cancelled", data);
};

const emitRideCancelled = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "ride-cancelled", data);
};

const emitDriverAvailable = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "driver-available", data);
};

const emitRideRequestExpired = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "ride-request-expired", data);
};

const emitStopsAdded = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "stops-added", data);
};

const emitReservationReminder = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "reservation-reminder", data);
};

const emitUserLocationUpdated = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "user-location-updated", data);
};

const emitDriverOnTheWay = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "driver-on-the-way", data);
};

const emitDriverArrived = (driverId: string, data: any): boolean => {
  return socketHelper.sendToUser(driverId, "driver-arrived", data);
};

export const rideDriverSocketHelper = {
  emitRideRequest,
  emitRideRequestCancelled,
  emitRideStarted,
  emitRideCompleted,
  emitWalletUpdated,
  emitDriverWalletCredited,
  emitPaymentCompleted,
  emitPaymentSuccess,
  emitReservationCancelled,
  emitRideCancelled,
  emitDriverAvailable,
  emitRideRequestExpired,
  emitStopsAdded,
  emitReservationReminder,
  emitUserLocationUpdated,
  emitDriverOnTheWay,
  emitDriverArrived,
};

