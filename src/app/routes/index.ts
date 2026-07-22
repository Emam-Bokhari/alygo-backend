import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { RuleRoutes } from "../modules/rule/rule.route";
import { FaqRoutes } from "../modules/faq/faq.route";
import { ReviewRoutes } from "../modules/review/review.route";
import { ChatRoutes } from "../modules/chat/chat.routes";
import { MessageRoutes } from "../modules/message/message.routes";
import { SupportRoutes } from "../modules/support/support.route";
import { BannerRoutes } from "../modules/banner/banner.route";
import { StripeRoutes } from "../modules/stripe/stripe.route";
import { NotificationRoutes } from "../modules/notification/notification.routes";
import { FcmTokenRoutes } from "../modules/fcmToken/fcmToken.route";
import { ReferralRoutes } from "../modules/referral/referral.route";
import { DriverRoutes } from "../modules/driver/driver.route";
import { CarRoutes } from "../modules/car/car.routes";
import { ServiceAreaRoutes } from "../modules/serviceArea/serviceArea.route";
import { CancellationReasonRoutes } from "../modules/cancellationReason/cancellationReason.route";
import { DriverDutyPolicyRoutes } from "../modules/driverDutyPolicy/driverDutyPolicy.route";
import { EmergencyHelplineRoutes } from "../modules/emergencyHelpline/emergencyHelpline.route";
import { EmergencyContactRoutes } from "../modules/emergencyContact/emergencyContact.route";
import { ReportIssueCategoryRoutes } from "../modules/reportIssueCategory/reportIssueCategory.route";
import { PlatformSettingsRoutes } from "../modules/platformSettings/platformSettings.route";
import { ServiceCategoryRoutes } from "../modules/serviceCategory/serviceCategory.route";
import { TierRoutes } from "../modules/tier/tier.route";
import { NotificationPreferenceRoutes } from "../modules/notificationPreference/notificationPreference.route";
import { RideCategoryRoutes } from "../modules/rideCategory/rideCategory.route";
import { SurgeRuleRoutes } from "../modules/surgeRule/surgeRule.route";
import { PeakHourRoutes } from "../modules/peakHour/peakHour.route";
import { HolidayRoutes } from "../modules/holiday/holiday.route";
import { EventRoutes } from "../modules/event/event.route";
import { FareConfigurationRoutes } from "../modules/fareConfiguration/fareConfiguration.route";
import { CancellationPolicyRoutes } from "../modules/cancellationPolicy/cancellationPolicy.route";
import { LostAndFoundItemCategoryRoutes } from "../modules/lostAndFoundItemCategory/lostAndFoundItemCategory.route";
import { RideRoutes } from "../modules/ride/ride.route";
import { TrackingRoutes } from "../modules/tracking/tracking.route";
import { RecentDestinationRoutes } from "../modules/recentDestination/recentDestination.route";
import { WalletRoutes, DriverWalletRoutes } from "../modules/wallet/wallet.route";
import { PayoutRoutes } from "../modules/payout/payout.route";
import { PendingPaymentRoutes } from "../modules/pendingPayment/pendingPayment.route";
import { SystemConfigurationRoutes } from "../modules/systemConfiguration/systemConfiguration.route";
import { TripReportRoutes } from "../modules/tripReport/tripReport.route";

const router = express.Router();

const apiRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/rules",
    route: RuleRoutes,
  },
  {
    path: "/faqs",
    route: FaqRoutes,
  },
  {
    path: "/reviews",
    route: ReviewRoutes,
  },
  {
    path: "/chats",
    route: ChatRoutes,
  },
  {
    path: "/messages",
    route: MessageRoutes,
  },
  {
    path: "/supports",
    route: SupportRoutes,
  },
  {
    path: "/banners",
    route: BannerRoutes,
  },
  {
    path: "/stripe",
    route: StripeRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/fcmTokens",
    route: FcmTokenRoutes,
  },
  {
    path: "/referrals",
    route: ReferralRoutes,
  },
  {
    path: "/drivers",
    route: DriverRoutes,
  },
  {
    path: "/cars",
    route: CarRoutes,
  },
  {
    path: "/service-areas",
    route: ServiceAreaRoutes,
  },
  {
    path: "/cancellation-reasons",
    route: CancellationReasonRoutes,
  },
  {
    path: "/driver-duty-policies",
    route: DriverDutyPolicyRoutes,
  },
  {
    path: "/emergency-helplines",
    route: EmergencyHelplineRoutes,
  },
  {
    path: "/emergency-contacts",
    route: EmergencyContactRoutes,
  },
  {
    path: "/report-issue-categories",
    route: ReportIssueCategoryRoutes,
  },
  {
    path: "/platform-settings",
    route: PlatformSettingsRoutes,
  },
  {
    path: "/service-categories",
    route: ServiceCategoryRoutes,
  },
  {
    path: "/tiers",
    route: TierRoutes,
  },
  {
    path: "/notification-preferences",
    route: NotificationPreferenceRoutes,
  },
  {
    path: "/ride-categories",
    route: RideCategoryRoutes,
  },
  {
    path: "/surge-rules",
    route: SurgeRuleRoutes,
  },
  {
    path: "/peak-hours",
    route: PeakHourRoutes,
  },
  {
    path: "/holidays",
    route: HolidayRoutes,
  },
  {
    path: "/events",
    route: EventRoutes,
  },
  {
    path: "/fare-configurations",
    route: FareConfigurationRoutes,
  },
  {
    path: "/cancellation-policies",
    route: CancellationPolicyRoutes,
  },
  {
    path: "/lost-and-found-item-categories",
    route: LostAndFoundItemCategoryRoutes,
  },
  {
    path: "/rides",
    route: RideRoutes,
  },
  {
    path: "/tracking",
    route: TrackingRoutes,
  },
  {
    path: "/recent-destinations",
    route: RecentDestinationRoutes,
  },
  {
    path: "/wallet",
    route: WalletRoutes,
  },
  {
    path: "/driver/wallet",
    route: DriverWalletRoutes,
  },
  {
    path: "/payout",
    route: PayoutRoutes,
  },
  {
    path: "/pending-payments",
    route: PendingPaymentRoutes,
  },
  {
    path: "/system-configurations",
    route: SystemConfigurationRoutes,
  },
  {
    path: "/trip-reports",
    route: TripReportRoutes,
  },
];

apiRoutes.forEach((route) => router.use(route.path, route.route));
export default router;
