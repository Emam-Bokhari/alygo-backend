"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/user/user.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const rule_route_1 = require("../modules/rule/rule.route");
const faq_route_1 = require("../modules/faq/faq.route");
const review_route_1 = require("../modules/review/review.route");
const chat_routes_1 = require("../modules/chat/chat.routes");
const message_routes_1 = require("../modules/message/message.routes");
const support_route_1 = require("../modules/support/support.route");
const banner_route_1 = require("../modules/banner/banner.route");
const stripe_route_1 = require("../modules/stripe/stripe.route");
const notification_routes_1 = require("../modules/notification/notification.routes");
const fcmToken_route_1 = require("../modules/fcmToken/fcmToken.route");
const referral_route_1 = require("../modules/referral/referral.route");
const driver_route_1 = require("../modules/driver/driver.route");
const car_routes_1 = require("../modules/car/car.routes");
const serviceArea_route_1 = require("../modules/serviceArea/serviceArea.route");
const cancellationReason_route_1 = require("../modules/cancellationReason/cancellationReason.route");
const driverDutyPolicy_route_1 = require("../modules/driverDutyPolicy/driverDutyPolicy.route");
const emergencyHelpline_route_1 = require("../modules/emergencyHelpline/emergencyHelpline.route");
const emergencyContact_route_1 = require("../modules/emergencyContact/emergencyContact.route");
const reportIssueCategory_route_1 = require("../modules/reportIssueCategory/reportIssueCategory.route");
const platformSettings_route_1 = require("../modules/platformSettings/platformSettings.route");
const serviceCategory_route_1 = require("../modules/serviceCategory/serviceCategory.route");
const tier_route_1 = require("../modules/tier/tier.route");
const notificationPreference_route_1 = require("../modules/notificationPreference/notificationPreference.route");
const rideCategory_route_1 = require("../modules/rideCategory/rideCategory.route");
const surgeRule_route_1 = require("../modules/surgeRule/surgeRule.route");
const peakHour_route_1 = require("../modules/peakHour/peakHour.route");
const holiday_route_1 = require("../modules/holiday/holiday.route");
const event_route_1 = require("../modules/event/event.route");
const fareConfiguration_route_1 = require("../modules/fareConfiguration/fareConfiguration.route");
const cancellationPolicy_route_1 = require("../modules/cancellationPolicy/cancellationPolicy.route");
const lostAndFoundItemCategory_route_1 = require("../modules/lostAndFoundItemCategory/lostAndFoundItemCategory.route");
const lostAndFound_route_1 = require("../modules/lostAndFound/lostAndFound.route");
const ride_route_1 = require("../modules/ride/ride.route");
const tracking_route_1 = require("../modules/tracking/tracking.route");
const recentDestination_route_1 = require("../modules/recentDestination/recentDestination.route");
const wallet_route_1 = require("../modules/wallet/wallet.route");
const payout_route_1 = require("../modules/payout/payout.route");
const driverRewards_route_1 = require("../modules/tier/driverRewards.route");
const adminRewards_route_1 = require("../modules/tier/adminRewards.route");
const pendingPayment_route_1 = require("../modules/pendingPayment/pendingPayment.route");
const systemConfiguration_route_1 = require("../modules/systemConfiguration/systemConfiguration.route");
const tripReport_route_1 = require("../modules/tripReport/tripReport.route");
const router = express_1.default.Router();
const apiRoutes = [
    {
        path: "/users",
        route: user_routes_1.UserRoutes,
    },
    {
        path: "/auth",
        route: auth_routes_1.AuthRoutes,
    },
    {
        path: "/rules",
        route: rule_route_1.RuleRoutes,
    },
    {
        path: "/faqs",
        route: faq_route_1.FaqRoutes,
    },
    {
        path: "/reviews",
        route: review_route_1.ReviewRoutes,
    },
    {
        path: "/chats",
        route: chat_routes_1.ChatRoutes,
    },
    {
        path: "/messages",
        route: message_routes_1.MessageRoutes,
    },
    {
        path: "/supports",
        route: support_route_1.SupportRoutes,
    },
    {
        path: "/banners",
        route: banner_route_1.BannerRoutes,
    },
    {
        path: "/stripe",
        route: stripe_route_1.StripeRoutes,
    },
    {
        path: "/notifications",
        route: notification_routes_1.NotificationRoutes,
    },
    {
        path: "/fcmTokens",
        route: fcmToken_route_1.FcmTokenRoutes,
    },
    {
        path: "/referrals",
        route: referral_route_1.ReferralRoutes,
    },
    {
        path: "/drivers",
        route: driver_route_1.DriverRoutes,
    },
    {
        path: "/cars",
        route: car_routes_1.CarRoutes,
    },
    {
        path: "/service-areas",
        route: serviceArea_route_1.ServiceAreaRoutes,
    },
    {
        path: "/cancellation-reasons",
        route: cancellationReason_route_1.CancellationReasonRoutes,
    },
    {
        path: "/driver-duty-policies",
        route: driverDutyPolicy_route_1.DriverDutyPolicyRoutes,
    },
    {
        path: "/emergency-helplines",
        route: emergencyHelpline_route_1.EmergencyHelplineRoutes,
    },
    {
        path: "/emergency-contacts",
        route: emergencyContact_route_1.EmergencyContactRoutes,
    },
    {
        path: "/report-issue-categories",
        route: reportIssueCategory_route_1.ReportIssueCategoryRoutes,
    },
    {
        path: "/platform-settings",
        route: platformSettings_route_1.PlatformSettingsRoutes,
    },
    {
        path: "/service-categories",
        route: serviceCategory_route_1.ServiceCategoryRoutes,
    },
    {
        path: "/tiers",
        route: tier_route_1.TierRoutes,
    },
    {
        path: "/notification-preferences",
        route: notificationPreference_route_1.NotificationPreferenceRoutes,
    },
    {
        path: "/ride-categories",
        route: rideCategory_route_1.RideCategoryRoutes,
    },
    {
        path: "/surge-rules",
        route: surgeRule_route_1.SurgeRuleRoutes,
    },
    {
        path: "/peak-hours",
        route: peakHour_route_1.PeakHourRoutes,
    },
    {
        path: "/holidays",
        route: holiday_route_1.HolidayRoutes,
    },
    {
        path: "/events",
        route: event_route_1.EventRoutes,
    },
    {
        path: "/fare-configurations",
        route: fareConfiguration_route_1.FareConfigurationRoutes,
    },
    {
        path: "/cancellation-policies",
        route: cancellationPolicy_route_1.CancellationPolicyRoutes,
    },
    {
        path: "/lost-and-found-item-categories",
        route: lostAndFoundItemCategory_route_1.LostAndFoundItemCategoryRoutes,
    },
    {
        path: "/lost-found",
        route: lostAndFound_route_1.LostAndFoundRoutes,
    },
    {
        path: "/rides",
        route: ride_route_1.RideRoutes,
    },
    {
        path: "/tracking",
        route: tracking_route_1.TrackingRoutes,
    },
    {
        path: "/recent-destinations",
        route: recentDestination_route_1.RecentDestinationRoutes,
    },
    {
        path: "/wallet",
        route: wallet_route_1.WalletRoutes,
    },
    {
        path: "/driver/wallet",
        route: wallet_route_1.DriverWalletRoutes,
    },
    {
        path: "/driver",
        route: driverRewards_route_1.DriverRewardsRoutes,
    },
    {
        path: "/admin/rewards",
        route: adminRewards_route_1.AdminRewardsRoutes,
    },
    {
        path: "/payout",
        route: payout_route_1.PayoutRoutes,
    },
    {
        path: "/pending-payments",
        route: pendingPayment_route_1.PendingPaymentRoutes,
    },
    {
        path: "/system-configurations",
        route: systemConfiguration_route_1.SystemConfigurationRoutes,
    },
    {
        path: "/trip-reports",
        route: tripReport_route_1.TripReportRoutes,
    },
];
apiRoutes.forEach((route) => router.use(route.path, route.route));
exports.default = router;
