"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stripe_1 = __importDefault(require("../../../config/stripe"));
const user_model_1 = require("../user/user.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const config_1 = __importDefault(require("../../../config"));
class StripeService {
    // get or create customer helper
    getOrCreateCustomer(userId, email, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_model_1.User.findById(userId);
            if (!user)
                throw new ApiErrors_1.default(404, "User not found");
            if (user.stripeCustomerId)
                return user.stripeCustomerId;
            const customer = yield stripe_1.default.customers.create({
                email,
                name,
                metadata: { userId },
            });
            user.stripeCustomerId = customer.id;
            yield user.save();
            return customer.id;
        });
    }
    // create checkout session helper
    createCheckoutSession(amount, currency, metadata, stripeCustomerId, successUrl, cancelUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionParams = {
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: currency || config_1.default.stripe.currency || "usd",
                            product_data: {
                                name: metadata.type === "wallet_topup"
                                    ? "Alygo Wallet Top-up"
                                    : metadata.type === "cancellation_fee"
                                        ? "Alygo Ride Cancellation Fee"
                                        : metadata.type === "driver_appreciation"
                                            ? "Alygo Driver Appreciation"
                                            : "Alygo Ride Payment",
                            },
                            unit_amount: Math.round(amount * 100),
                        },
                        quantity: 1,
                    },
                ],
                metadata,
                payment_intent_data: {
                    metadata,
                },
                success_url: successUrl ||
                    `${config_1.default.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: cancelUrl ||
                    `${config_1.default.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
            };
            if (stripeCustomerId) {
                sessionParams.customer = stripeCustomerId;
            }
            return yield stripe_1.default.checkout.sessions.create(sessionParams);
        });
    }
    // retrieve payment intent
    retrievePaymentIntent(paymentIntentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield stripe_1.default.paymentIntents.retrieve(paymentIntentId);
        });
    }
    // retrieve checkout session
    retrieveSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield stripe_1.default.checkout.sessions.retrieve(sessionId);
        });
    }
    // expire checkout session
    expireSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield stripe_1.default.checkout.sessions.expire(sessionId);
        });
    }
    // refund payment helper
    refundPayment(paymentIntentId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const refundParams = {
                payment_intent: paymentIntentId,
            };
            if (amount !== undefined) {
                refundParams.amount = Math.round(amount * 100);
            }
            return yield stripe_1.default.refunds.create(refundParams);
        });
    }
    // create a connected account for the vendor
    createConnectedAccount(email, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield stripe_1.default.accounts.create({
                type: "express",
                email,
                capabilities: {
                    transfers: { requested: true },
                    card_payments: { requested: true },
                },
                metadata: { userId },
            });
            return account;
        });
    }
    // generate the account onboarding link for the vendor
    createAccountLink(accountId, returnUrl, refreshUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const accountLink = yield stripe_1.default.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: "account_onboarding",
            });
            return accountLink.url;
        });
    }
    // Stripe Express Dashboard login link
    createLoginLink(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const loginLink = yield stripe_1.default.accounts.createLoginLink(accountId);
            return loginLink.url;
        });
    }
    // retrieve account details
    retrieveAccount(accountId) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield stripe_1.default.accounts.retrieve(accountId);
            return account;
        });
    }
}
exports.default = new StripeService();
