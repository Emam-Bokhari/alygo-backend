"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const user_1 = require("../../../enums/user");
const bcrypt_1 = __importDefault(require("bcrypt"));
const config_1 = __importDefault(require("../../../config"));
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const userSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(user_1.USER_ROLES),
      default: user_1.USER_ROLES.USER,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    profileImage: {
      type: String,
      required: false,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      enum: Object.values(user_1.GENDER),
      default: user_1.GENDER.MALE,
    },
    password: {
      type: String,
      required: false,
      select: 0,
      minlength: 8,
    },
    status: {
      type: String,
      enum: Object.values(user_1.STATUS),
      default: user_1.STATUS.ACTIVE,
    },
    phone: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      required: true,
    },
    firebaseUid: {
      type: String,
      unique: true,
      sparse: true,
    },
    userName: {
      type: String,
      unique: true,
      sparse: true,
    },
    deviceToken: {
      type: String,
      required: false,
    },
    verified: {
      type: Boolean,
      default: false,
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
    stripeCustomerId: {
      type: String,
      required: false,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredById: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
        authType: {
          type: String,
          default: null,
        },
      },
      select: 0,
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
/* ================= PLUGIN ================= */
userSchema.plugin(softDeletePlugin_1.softDeletePlugin);
//exist user check
userSchema.statics.isExistUserById = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isExist = yield exports.User.findById(id);
    return isExist;
  });
userSchema.statics.isExistUserByEmail = (email) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isExist = yield exports.User.findOne({ email });
    return isExist;
  });
//account check
userSchema.statics.isAccountCreated = (id) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const isUserExist = yield exports.User.findById(id);
    return isUserExist.accountInformation.status;
  });
//is match password
userSchema.statics.isMatchPassword = (password, hashPassword) =>
  __awaiter(void 0, void 0, void 0, function* () {
    return yield bcrypt_1.default.compare(password, hashPassword);
  });
//check user
userSchema.pre("save", function (next) {
  return __awaiter(this, void 0, void 0, function* () {
    if (this.isNew) {
      // password hash
      if (this.password) {
        this.password = yield bcrypt_1.default.hash(
          this.password,
          Number(config_1.default.bcrypt_salt_rounds),
        );
      }
    } else {
      if (this.isModified("password") && this.password) {
        this.password = yield bcrypt_1.default.hash(
          this.password,
          Number(config_1.default.bcrypt_salt_rounds),
        );
      }
    }
    next();
  });
});
exports.User = (0, mongoose_1.model)("User", userSchema);
