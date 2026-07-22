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
exports.handleSubscriptionCreated = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiErrors_1 = __importDefault(require("../errors/ApiErrors"));
const stripe_1 = __importDefault(require("../config/stripe"));
const User = "";
const PricingPlan = "";
const Subscription = "";
const handleSubscriptionCreated = (data) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Retrieve the subscription from Stripe
    const subscription = yield stripe_1.default.subscriptions.retrieve(data.id);
    // Retrieve the customer associated with the subscription
    const customer = yield stripe_1.default.customers.retrieve(
      subscription.customer,
    );
    // Extract the price ID from the subscription items
    const priceId =
      (_b =
        (_a = subscription.items.data[0]) === null || _a === void 0
          ? void 0
          : _a.price) === null || _b === void 0
        ? void 0
        : _b.id;
    // Retrieve the invoice to get the transaction ID and amount paid
    const invoice = yield stripe_1.default.invoices.retrieve(
      subscription.latest_invoice,
    );
    const trxId =
      invoice === null || invoice === void 0 ? void 0 : invoice.payment_intent;
    const amountPaid =
      (invoice === null || invoice === void 0 ? void 0 : invoice.total) / 100;
    if (customer === null || customer === void 0 ? void 0 : customer.email) {
      const existingUser = yield User.findOne({
        email:
          customer === null || customer === void 0 ? void 0 : customer.email,
      });
      if (existingUser) {
        // Find the pricing plan by priceId
        const pricingPlan = yield PricingPlan.findOne({ priceId });
        if (pricingPlan) {
          // Find the current active subscription
          const currentActiveSubscription = yield Subscription.findOne({
            userId: existingUser._id,
            status: "active",
          });
          if (currentActiveSubscription) {
            throw new ApiErrors_1.default(
              http_status_codes_1.StatusCodes.CONFLICT,
              "User already has an active subscription.",
            );
          }
          // Create a new subscription record
          const newSubscription = new Subscription({
            userId: existingUser._id,
            customerId:
              customer === null || customer === void 0 ? void 0 : customer.id,
            packageId: pricingPlan._id,
            status: "active",
            amountPaid,
            trxId,
          });
          yield newSubscription.save();
          // Update the user to reflect the active subscription
          yield User.findByIdAndUpdate(
            existingUser._id,
            {
              isSubscribed: true,
              hasAccess: true,
            },
            { new: true },
          );
        } else {
          throw new ApiErrors_1.default(
            http_status_codes_1.StatusCodes.NOT_FOUND,
            `Pricing plan with Price ID: ${priceId} not found!`,
          );
        }
      } else {
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.NOT_FOUND,
          `Invalid User!`,
        );
      }
    } else {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        "No email found for the customer!",
      );
    }
  });
exports.handleSubscriptionCreated = handleSubscriptionCreated;
