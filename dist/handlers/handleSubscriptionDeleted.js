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
exports.handleSubscriptionDeleted = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../errors/ApiErrors"));
const stripe_1 = __importDefault(require("../config/stripe"));
const User = "";
const Subscription = "";
const handleSubscriptionDeleted = (data) =>
  __awaiter(void 0, void 0, void 0, function* () {
    // Retrieve the subscription from Stripe
    const subscription = yield stripe_1.default.subscriptions.retrieve(data.id);
    // Find the current active subscription
    const userSubscription = yield Subscription.findOne({
      customerId: subscription.customer,
      status: "active",
    });
    if (userSubscription) {
      // Deactivate the subscription
      yield Subscription.findByIdAndUpdate(
        userSubscription._id,
        { status: "deactivated" },
        { new: true },
      );
      // Find the user associated with the subscription
      const existingUser = yield User.findById(
        userSubscription === null || userSubscription === void 0
          ? void 0
          : userSubscription.userId,
      );
      if (existingUser) {
        yield User.findByIdAndUpdate(
          existingUser._id,
          { hasAccess: false },
          { new: true },
        );
      } else {
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.NOT_FOUND,
          `User not found.`,
        );
      }
    } else {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        `Subscription not found.`,
      );
    }
  });
exports.handleSubscriptionDeleted = handleSubscriptionDeleted;
