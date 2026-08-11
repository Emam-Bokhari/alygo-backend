import { ISoftDeleteModel } from "../../../types/softDelete";
import { Types } from "mongoose";
import {
  CLASSIFICATION,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_BLOCK_REASON,
  TAX_ID_TYPE,
  VERIFICATION_STATUS,
} from "./driver.constant";
import { DRIVER_STATUS } from "../../../enums/user";

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
  drivingLicenseNumber?: string;
  ssn?: string;
  ssnCard?: string;
  taxDocument?: string;
  documentsStatus?: {
    profilePhoto: boolean;
    liveSelfie: boolean;
    ssn: boolean;
    drivingLicense: boolean;
    taxDocuments: boolean;
  };

  // Service Area
  serviceAreaId?: Types.ObjectId;
  serviceAreaAssignedAt?: Date;
  serviceAreaChangedAt?: Date;



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
    pointsDeducted?: number;
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

  // Driver approval and compliance
  approvalStatus?: DRIVER_STATUS;
  backgroundCheckStatus?: VERIFICATION_STATUS;
  mvrStatus?: VERIFICATION_STATUS;
  licenseExpiryDate?: Date;
  mvrVerifiedAt?: Date;
  lastVerificationDate?: Date;
  verificationSource?: string;
  verificationNotes?: string;
  checkrCandidateId?: string;
  checkrMVRReportId?: string;
  checkrBackgroundReportId?: string;
  backgroundCheckPassed?: boolean;
  backgroundCheckPassedAt?: Date;
  drivingLicenseState?: string;
  suspension?: {
    isSuspended: boolean;
    suspendedBy?: Types.ObjectId | null;
    suspendedAt?: Date | null;
    reason?: string;
    note?: string;
  };
};

export type DriverModel = ISoftDeleteModel<IDriver>;
