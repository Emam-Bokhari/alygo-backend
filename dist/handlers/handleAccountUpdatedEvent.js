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
exports.handleAccountUpdatedEvent = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../errors/ApiErrors"));
const stripe_1 = __importDefault(require("../config/stripe"));
const User = "";
const handleAccountUpdatedEvent = (data) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Find the user by Stripe account ID
    const existingUser = yield User.findOne({
      "stripeAccountInfo.accountId": data.id,
    });
    if (!existingUser) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        `User not found for account ID: ${data.id}`,
      );
    }
    // Check if the onboarding is complete
    if (data.charges_enabled) {
      const loginLink = yield stripe_1.default.accounts.createLoginLink(
        data.id,
      );
      // Save Stripe account information to the user record
      yield User.findByIdAndUpdate(
        existingUser === null || existingUser === void 0
          ? void 0
          : existingUser._id,
        {
          stripeAccountInfo: {
            accountId: data.id,
            loginUrl: loginLink.url,
          },
        },
      );
    }
  });
exports.handleAccountUpdatedEvent = handleAccountUpdatedEvent;
