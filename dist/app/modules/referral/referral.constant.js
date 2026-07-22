"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFERRAL_RULES = exports.REFERRAL_CONSTANTS = void 0;
exports.REFERRAL_CONSTANTS = {
  USER_REFERRAL_REWARD: 10, // $10 discount per join
  DRIVER_REFERRAL_REWARD: 100, // $100 payout per completed referral
  DRIVER_REQUIRED_RIDES: 10, // Must complete 10 rides
  DRIVER_VALIDITY_DAYS: 30, // Within 30 days
};
exports.REFERRAL_RULES = {
  user: [
    {
      title: "Share Your Code",
      description:
        "Send your unique referral code or link to friends in your community.",
    },
    {
      title: "Friends Join",
      description:
        "Ensure your friends register using your referral code and complete their profile verification.",
    },
    {
      title: "Receive Discount",
      description:
        "Once verified, your subscription discount ($10 per friend) is automatically applied to your account.",
    },
  ],
  driver: [
    {
      title: "Share Your Code",
      description:
        "Send your unique referral code or link to experienced drivers in your community.",
    },
    {
      title: "Complete Rides",
      description: `The referee must register using your code and complete ${exports.REFERRAL_CONSTANTS.DRIVER_REQUIRED_RIDES} verified passenger trips within ${exports.REFERRAL_CONSTANTS.DRIVER_VALIDITY_DAYS} days.`,
    },
    {
      title: "Receive Payout",
      description: `Once verified, your bonus reward ($${exports.REFERRAL_CONSTANTS.DRIVER_REFERRAL_REWARD} per driver) is directly deposited into your payout account within 48 hours.`,
    },
  ],
};
