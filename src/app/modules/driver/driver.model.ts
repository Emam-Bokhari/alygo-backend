import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";
import { model, Schema } from "mongoose";
import { IDriver, DriverModel } from "./driver.interface";
import {
  CLASSIFICATION,
  DOCUMENT_TYPE,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_BLOCK_REASON,
  TAX_ID_TYPE,
  VERIFICATION_STATUS,
} from "./driver.constant";
import { DRIVER_STATUS } from "../../../enums/user";

const driverSchema = new Schema<IDriver, DriverModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
        index: "2dsphere",
      },
      address: {
        type: String,
        default: "",
      },
    },
    stripeConnectedAccountId: {
      type: String,
      required: false,
    },
    isStripeOnboarded: {
      type: Boolean,
      default: false,
    },

    liveSelfie: {
      type: String,
      default: "",
    },

    drivingLicense: {
      type: String,
      default: "",
    },

    drivingLicenseNumber: {
      type: String,
      default: "",
    },

    ssn: {
      type: String,
      default: "",
    },

    ssnCard: {
      type: String,
      default: "",
    },

    taxDocument: {
      type: String,
      default: "",
    },

    documentsStatus: {
      profilePhoto: { type: Boolean, default: false },
      liveSelfie: { type: Boolean, default: false },
      ssn: { type: Boolean, default: false },
      drivingLicense: { type: Boolean, default: false },
      taxDocuments: { type: Boolean, default: false },
    },

    // Service Area
    serviceAreaId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceArea",
      default: null,
    },
    serviceAreaAssignedAt: {
      type: Date,
      default: null,
    },
    serviceAreaChangedAt: {
      type: Date,
      default: null,
    },



    taxClassification: {
      type: String,
      enum: Object.values(CLASSIFICATION),
      default: CLASSIFICATION.INDIVIDUAL,
    },

    taxLegalName: {
      type: String,
      default: "",
    },

    taxBusinessName: {
      type: String,
      default: "",
    },

    taxIdType: {
      type: String,
      enum: Object.values(TAX_ID_TYPE),
      default: TAX_ID_TYPE.SSN,
    },

    taxIdValue: {
      type: String,
      default: "",
    },

    taxEmail: {
      type: String,
      default: "",
      lowercase: true,
    },

    taxPhone: {
      type: String,
      default: "",
    },

    taxStreet: {
      type: String,
      default: "",
    },

    taxCity: {
      type: String,
      default: "",
    },

    taxState: {
      type: String,
      default: "",
    },

    taxZipCode: {
      type: String,
      default: "",
    },

    taxCountry: {
      type: String,
      default: "",
    },

    receiveTaxDocumentsDigitally: {
      type: Boolean,
      default: true,
    },

    driverAvailabilityStatus: {
      type: String,
      enum: Object.values(DRIVER_AVAILABILITY_STATUS),
      default: DRIVER_AVAILABILITY_STATUS.OFFLINE,
    },
    recentDestinations: {
      type: [
        {
          title: {
            type: String,
            default: "",
          },
          placeId: {
            type: String,
            default: "",
          },
          location: {
            type: {
              type: String,
              enum: ["Point"],
              default: "Point",
            },
            coordinates: {
              type: [Number],
              default: [0, 0],
              index: "2dsphere",
            },
            address: {
              type: String,
              default: "",
            },
          },
          lastVisitedAt: {
            type: Date,
            default: Date.now,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    lastOnlineAt: {
      type: Date,
      default: null,
    },

    lastOfflineAt: {
      type: Date,
      default: null,
    },
    totalCancellations: {
      type: Number,
      default: 0,
    },
    consecutiveCancellations: {
      type: Number,
      default: 0,
    },
    lastCancellationTime: {
      type: Date,
      default: null,
    },
    cancellationHistory: {
      type: [
        {
          rideId: {
            type: Schema.Types.ObjectId,
            ref: "Ride",
            required: true,
          },
          cancellationReasonId: {
            type: Schema.Types.ObjectId,
            ref: "CancellationReason",
            required: false,
          },
          cancellationReasonName: {
            type: String,
            required: true,
          },
          cancelledAt: {
            type: Date,
            required: true,
            default: Date.now,
          },
          cancellationFee: {
            type: Number,
            required: false,
          },
          platformShare: {
            type: Number,
            required: false,
          },
          driverCompensation: {
            type: Number,
            required: false,
          },
          pointsDeducted: {
            type: Number,
            required: false,
          },
          cancellationPolicy: {
            scenario: { type: String, required: false },
            policyName: { type: String, required: false },
            cancellationFee: { type: Number, required: false },
            driverCompensation: { type: Number, required: false },
            platformShare: { type: Number, required: false },
          },
        },
      ],
      default: [],
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    averageAppreciation: {
      type: Number,
      default: 0,
    },
    totalAppreciationReceived: {
      type: Number,
      default: 0,
    },
    totalAppreciationAmount: {
      type: Number,
      default: 0,
    },
    availability: {
      canReceiveRide: {
        type: Boolean,
        default: true,
      },
      blockedReason: {
        type: String,
        enum: Object.values(DRIVER_BLOCK_REASON),
        default: null,
      },
      blockedUntil: {
        type: Date,
        default: null,
      },
    },
    currentPoints: {
      type: Number,
      default: 0,
    },
    lifetimePoints: {
      type: Number,
      default: 0,
    },
    currentTier: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      default: null,
    },
    nextTier: {
      type: Schema.Types.ObjectId,
      ref: "Tier",
      default: null,
    },
    progressPercentage: {
      type: Number,
      default: 0,
    },
    tierAchievedAt: {
      type: Date,
      default: null,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(DRIVER_STATUS),
      default: DRIVER_STATUS.PENDING,
    },
    backgroundCheckStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    mvrStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },
    licenseExpiryDate: {
      type: Date,
      default: null,
    },
    mvrVerifiedAt: {
      type: Date,
      default: null,
    },
    lastVerificationDate: {
      type: Date,
      default: null,
    },
    verificationSource: {
      type: String,
      default: "",
    },
    verificationNotes: {
      type: String,
      default: "",
    },
    checkrCandidateId: {
      type: String,
      default: "",
    },
    checkrMVRReportId: {
      type: String,
      default: "",
    },
    checkrBackgroundReportId: {
      type: String,
      default: "",
    },
    backgroundCheckPassed: {
      type: Boolean,
      default: false,
    },
    backgroundCheckPassedAt: {
      type: Date,
      default: null,
    },
    drivingLicenseState: {
      type: String,
      default: "",
    },
    suspension: {
      isSuspended: {
        type: Boolean,
        default: false,
      },
      suspendedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      suspendedAt: {
        type: Date,
        default: null,
      },
      reason: {
        type: String,
        default: "",
      },
      note: {
        type: String,
        default: "",
      },
    },
  },

  {
    timestamps: true,
    versionKey: false,
  },
);

// Create geospatial index for location-based queries
driverSchema.index({ location: "2dsphere" });
driverSchema.index({
  driverAvailabilityStatus: 1,
  approvalStatus: 1,
});

driverSchema.plugin(softDeletePlugin);

export const Driver = model<IDriver, DriverModel>("Driver", driverSchema);
