import { Types } from "mongoose";
import {
  CLASSIFICATION,
  DOCUMENT_TYPE,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_BLOCK_REASON,
  EXTRACTION_STATUS,
  TAX_ID_TYPE,
  VERIFICATION_STATUS,
} from "./driver.constant";

export type IDriver = {
  userId: Types.ObjectId;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude],
    address: string;
  };
  stripeConnectedAccountId?: string;
  isStripeOnboarded?: boolean;
  liveSelfie?: string;
  drivingLicense?: string;
  ssn?: string;

  // Service Area
  serviceAreaId?: Types.ObjectId;
  serviceAreaAssignedAt?: Date;
  serviceAreaChangedAt?: Date;

  taxVerificationStatus: VERIFICATION_STATUS;
  taxVerified: boolean;
  taxVerifiedAt?: Date;

  taxClassification: CLASSIFICATION;

  taxLegalName: string;
  taxBusinessName?: string;

  taxIdType: TAX_ID_TYPE;
  taxIdValue: string;

  taxEmail: string;
  taxPhone: string;

  taxStreet?: string;
  taxCity?: string;
  taxState?: string;
  taxZipCode?: string;
  taxCountry?: string;

  receiveTaxDocumentsDigitally: boolean;

  taxDocuments: {
    documentType: DOCUMENT_TYPE;

    fileUrl: string;
    fileName: string;

    extractionStatus: EXTRACTION_STATUS;

    extractedData: Record<string, unknown>;

    uploadedAt: Date;
  }[];
  driverAvailabilityStatus: DRIVER_AVAILABILITY_STATUS;
  lastOnlineAt?: Date;
  lastOfflineAt?: Date;
  recentDestinations: {
    title: string;
    placeId?: string; // google place id
    location: {
      type: "Point";
      coordinates: [number, number]; // [longitude, latitude]
      address: string;
    };
    lastVisitedAt: Date;
    createdAt: Date;
  }[];
  totalCancellations?: number;
  consecutiveCancellations?: number;
  lastCancellationTime?: Date;
  cancellationHistory?: {
    rideId: Types.ObjectId;
    cancellationReasonId?: Types.ObjectId;
    cancellationReasonName: string;
    cancelledAt: Date;
    cancellationFee?: number;
    platformShare?: number;
    driverCompensation?: number;
    cancellationPolicy?: {
      scenario: string;
      policyName?: string;
      cancellationFee: number;
      driverCompensation: number;
      platformShare: number;
    };
  }[];
  averageRating?: number;
  totalRatings?: number;
  totalReviews?: number;
  averageAppreciation?: number;
  totalAppreciationReceived?: number;
  totalAppreciationAmount?: number;
  availability: {
    canReceiveRide: boolean;
    blockedReason?: DRIVER_BLOCK_REASON | null;
    blockedUntil?: Date | null;
  };
  currentPoints?: number;
  lifetimePoints?: number;
  currentTier?: Types.ObjectId;
  nextTier?: Types.ObjectId | null;
  progressPercentage?: number;
  tierAchievedAt?: Date;
};
