import { Model, Types } from "mongoose";
import {
  CANCELLED_BY,
  DRIVER_MATCHING_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  RIDE_STATUS,
  RIDE_TYPE,
  VERIFICATION_METHOD,
} from "./ride.constant";

export interface IRide {
  // =========================
  // Participants
  // =========================

  userId: Types.ObjectId;

  driverId?: Types.ObjectId;

  carId?: Types.ObjectId;

  serviceAreaId?: Types.ObjectId;

  serviceCategoryId?: Types.ObjectId;

  // =========================
  // Ride Category Snapshot
  // =========================

  rideCategory: {
    categoryId: Types.ObjectId;

    name: string;

    commissionRate: number;
  };

  // =========================
  // Route Information
  // =========================

  pickup: {
    address: string;

    location: {
      type: "Point";

      coordinates: [number, number];
    };
  };

  stops?: {
    order: number;

    address: string;

    location: {
      type: "Point";

      coordinates: [number, number];
    };

    isCompleted?: boolean;

    completedAt?: Date;
  }[];

  destination: {
    address: string;

    location: {
      type: "Point";

      coordinates: [number, number];
    };
  };

  // =========================
  // Google Map Information
  // =========================

  routeInfo: {
    totalDistanceKm: number;

    totalDurationMinutes: number;

    googleRouteId?: string;

    polyline?: string;
  };

  // =========================
  // Driver Matching
  // =========================

  driverMatching: {
    requestExpireSeconds: number;

    searchRadiusKm: number;

    requiredDriverCount: number;

    notifiedDrivers: {
      driverId: Types.ObjectId;

      sentAt: Date;

      respondedAt?: Date;

      status: DRIVER_MATCHING_STATUS;
    }[];
  };

  // =========================
  // Ride Details & Status
  // =========================

  rideType: RIDE_TYPE;

  scheduledAt?: Date;

  timezone?: string;

  reservationStatus?: "pending" | "confirmed" | "cancelled" | "expired";

  reservationConfirmedAt?: Date;

  reservationAssignedAt?: Date;

  reservationAcceptedAt?: Date;

  reservationExpiresAt?: Date;

  assignedDriverId?: Types.ObjectId;

  reservationReminderSent?: {
    "24h"?: boolean;
    "1h"?: boolean;
    "30m"?: boolean;
    "15m"?: boolean;
  };

  reservationCancelledReason?: string;

  shareToken?: string;

  isSharingActive?: boolean;

  timeRemainingToPickup?: string | null; // Mongoose Virtual

  status: RIDE_STATUS;

  // =========================
  // OTP Verification
  // =========================
  pickupVerification: {
    method: VERIFICATION_METHOD;

    // OTP Verification
    otp?: {
      code: string;

      expiresAt?: Date;

      createdAt?: Date;

      verified: boolean;

      verifiedAt?: Date;

      attempts?: number;
    };

    // User registered phone last 4 digit verification

    phoneLastFourDigits?: {
      value: string;

      verified: boolean;

      verifiedAt?: Date;
    };

    verificationAttempts?: {
      method: VERIFICATION_METHOD;

      attemptedAt: Date;

      success: boolean;

      ipAddress?: string;
    }[];
  };

  dropVerification: {
    method: VERIFICATION_METHOD;

    // OTP Verification

    otp?: {
      code: string;

      expiresAt?: Date;

      createdAt?: Date;

      verified: boolean;

      verifiedAt?: Date;

      attempts?: number;
    };

    // User registered phone last 4 digit verification

    phoneLastFourDigits?: {
      value: string;

      verified: boolean;

      verifiedAt?: Date;
    };

    verificationAttempts?: {
      method: VERIFICATION_METHOD;

      attemptedAt: Date;

      success: boolean;

      ipAddress?: string;
    }[];
  };

  // =========================
  // Fare Calculation
  // =========================

  fare: {
    baseFare: number;

    distanceFare: number;

    timeFare: number;

    stopWaitingCharge: number;

    cancellationFee: number;

    discount: number;

    subtotal: number;

    commission: number;

    driverEarning: number;

    total: number;

    surgeMultiplier?: number;

    surgeApplied?: number;

    rideFare?: number;

    pendingCancellationFee?: number;
  };

  // =========================
  // Payment
  // =========================

  payment: {
    method: PAYMENT_METHOD;

    status: PAYMENT_STATUS;

    stripePaymentIntentId?: string;

    stripeCheckoutSessionId?: string;

    paidAt?: Date;
  };

  // =========================
  // Cancellation
  // =========================

  cancellation?: {
    cancelledBy: CANCELLED_BY;

    cancellationReasonId?: Types.ObjectId;

    cancellationReasonName?: string;

    cancellationFee?: number;

    driverCompensation?: number;

    platformShare?: number;

    cancellationPolicy?: {
      scenario: string;
      policyName?: string;
      cancellationFee: number;
      driverCompensation: number;
      platformShare: number;
    };

    paymentStatus?: "pending" | "paid" | "voided";
    paymentCollectionMode?: string;

    rideStatusBeforeCancellation?: string;

    surgeSnapshot?: {
      multiplier: number;
      amount: number;
    };
    fareSnapshot?: any;

    cancelledAt: Date;
  };

  // =========================
  // Timeline
  // =========================

  requestedAt: Date;

  acceptedAt?: Date;

  userApprovedAt?: Date;

  arrivedAt?: Date;

  startedAt?: Date;

  completedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export type RideModel = Model<IRide>;
