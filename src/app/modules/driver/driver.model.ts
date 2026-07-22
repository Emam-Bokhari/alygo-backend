import { model, Schema } from "mongoose";
import { IDriver } from "./driver.interface";
import {
  CLASSIFICATION,
  DOCUMENT_TYPE,
  DRIVER_AVAILABILITY_STATUS,
  DRIVER_BLOCK_REASON,
  EXTRACTION_STATUS,
  TAX_ID_TYPE,
  VERIFICATION_STATUS,
} from "./driver.constant";

const driverSchema = new Schema<IDriver>(
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

    ssn: {
      type: String,
      default: "",
    },

    // Service Area
    serviceAreaId: {
      type: Schema.Types.ObjectId,
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

    taxVerificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.PENDING,
    },

    taxVerified: {
      type: Boolean,
      default: false,
    },

    taxVerifiedAt: {
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

    taxDocuments: {
      type: [
        {
          documentType: {
            type: String,
            enum: Object.values(DOCUMENT_TYPE),
            required: true,
          },

          fileUrl: {
            type: String,
            required: true,
          },

          fileName: {
            type: String,
            default: "",
          },

          extractionStatus: {
            type: String,
            enum: Object.values(EXTRACTION_STATUS),
            default: EXTRACTION_STATUS.PENDING,
          },

          extractedData: {
            type: Schema.Types.Mixed,
            default: {},
          },

          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
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
  taxVerificationStatus: 1,
  taxVerified: 1,
});

export const Driver = model("Driver", driverSchema);
