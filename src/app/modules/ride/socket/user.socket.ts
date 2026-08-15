import { socketHelper } from "../../../../helpers/socketHelper";

/**
 * Socket.io events wrapper for the user (passenger) side of the ride module
 */
const emitReservationCreated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-created", data);
};

const emitReservationSearchingDriver = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-searching-driver", data);
};

const emitRideAccepted = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "ride-accepted", data);
};

const emitReservationConfirmed = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-confirmed", data);
};

const emitReservationDriverAssigned = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-driver-assigned", data);
};

const emitDriverOnTheWay = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "driver-on-the-way", data);
};

const emitDriverArrived = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "driver-arrived", data);
};

const emitStopArrived = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "stop-arrived", data);
};

const emitDriverLocationUpdated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "driver-location-updated", data);
};

const emitStartOtpGenerated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "start-otp-generated", data);
};

const emitRideStarted = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "ride-started", data);
};

const emitEndOtpGenerated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "end-otp-generated", data);
};

const emitRideCompleted = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "ride-completed", data);
};

const emitWalletUpdated = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "wallet-updated", data);
};

const emitPaymentCompleted = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "payment-completed", data);
};

const emitPaymentSuccess = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "payment-success", data);
};

const emitRideCancelled = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "ride-cancelled", data);
};

const emitReservationCancelled = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-cancelled", data);
};

const emitRideExpired = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "ride-expired", data);
};

const emitStopsAdded = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "stops-added", data);
};

const emitReservationReminder = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "reservation-reminder", data);
};

const emitNearbyDriversFound = (userId: string, data: any): boolean => {
  return socketHelper.sendToUser(userId, "nearby-drivers-found", data);
};

const emitNearbyDriverLocationUpdated = (
  userId: string,
  data: any,
): boolean => {
  return socketHelper.sendToUser(
    userId,
    "nearby-driver-location-updated",
    data,
  );
};

export const rideUserSocketHelper = {
  emitReservationCreated,
  emitReservationSearchingDriver,
  emitRideAccepted,
  emitReservationConfirmed,
  emitReservationDriverAssigned,
  emitDriverOnTheWay,
  emitDriverArrived,
  emitStopArrived,
  emitDriverLocationUpdated,
  emitStartOtpGenerated,
  emitRideStarted,
  emitEndOtpGenerated,
  emitRideCompleted,
  emitWalletUpdated,
  emitPaymentCompleted,
  emitPaymentSuccess,
  emitRideCancelled,
  emitReservationCancelled,
  emitRideExpired,
  emitStopsAdded,
  emitReservationReminder,
  emitNearbyDriversFound,
  emitNearbyDriverLocationUpdated,
};
