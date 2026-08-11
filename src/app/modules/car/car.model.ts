import { Schema, model } from "mongoose";
import { ICar, CarModel } from "./car.interface";
import { softDeletePlugin } from "../../../DB/plugins/softDeletePlugin";

const carSchema = new Schema<ICar>(
  {
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
      index: true,
    },

    brand: {
      type: String,
      required: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: Number,
      required: true,
    },

    carType: {
      type: String,
      required: true,
      trim: true,
    },

    seatNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    licensePlate: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    vin: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    vehicleLicense: {
      type: String,
      default: "",
    },

    personalAutoInsurance: {
      type: String,
      default: "",
    },

    personalAutoInsuranceNumber: {
      type: String,
      default: "",
    },

    color: {
      type: String,
      default: "",
    },

    vehicleRegistration: {
      type: String,
      default: "",
    },

    vehicleRegistrationNumber: {
      type: String,
      default: "",
    },

    commercialInsurance: {
      type: String,
      default: "",
    },

    commercialInsuranceNumber: {
      type: String,
      default: "",
    },

    vehicleInspection: {
      type: String,
      default: "",
    },

    vehicleInspectionNumber: {
      type: String,
      default: "",
    },

    insuranceHub: {
      type: [
        {
          fileUrl: {
            type: String,
            required: true,
          },

          fileName: {
            type: String,
            default: "",
          },

          uploadedAt: {
            type: Date,
            default: null,
          },

          provider: {
            type: String,
            default: "",
          },
          policyNumber: {
            type: String,
            default: "",
          },
          policyHolder: {
            type: String,
            default: "",
          },
          coverageType: {
            type: String,
            default: "",
          },
          vehicleBound: {
            type: String,
            default: "",
          },
          effectiveDate: {
            type: Date,
            default: null,
          },
          expirationDate: {
            type: Date,
            default: null,
          },
          liabilityLimits: {
            type: String,
            default: "",
          },
          collisionDeductible: {
            type: String,
            default: "",
          },
          comprehensive: {
            type: String,
            default: "",
          },
        },
      ],
      default: [],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
  },
);

carSchema.plugin(softDeletePlugin);

export const Car = model<ICar, CarModel>("Car", carSchema);
