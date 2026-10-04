# Hub Entity References

This document lists all entities and fields that reference hub entities across the alygo-backend codebase.

## Hub: `Ride` (9 referencing entities, 12 reference fields)

| Module | Referencing Entity | Field Path | Kind |
| :--- | :--- | :--- | :--- |
| `call` | `Call` | `rideId` | single ref |
| `driver` | `Driver_CancellationHistory` | `rideId` | single ref |
| `lostAndFound` | `LostFound` | `rideId` | single ref |
| `pendingPayment` | `PendingPayment` | `paidWithRideId` | single ref |
| `pendingPayment` | `PendingPayment` | `rideId` | single ref |
| `review` | `Review` | `rideId` | single ref |
| `tier` | `DriverPointHistory` | `metadata.type.rideId` | embedded path (dotted field) |
| `tier` | `DriverPointHistory` | `rideId` | single ref |
| `tracking` | `Tracking` | `rideId` | single ref |
| `transaction` | `Transaction` | `bookingId` | single ref |
| `transaction` | `Transaction` | `rideId` | single ref |
| `tripReport` | `TripReport` | `rideId` | single ref |

## Hub: `User` (41 referencing entities, 66 reference fields)

| Module | Referencing Entity | Field Path | Kind |
| :--- | :--- | :--- | :--- |
| `aiKnowledge` | `AiKnowledge` | `createdBy` | single ref |
| `aiKnowledge` | `AiKnowledge` | `publishedBy` | single ref |
| `aiKnowledge` | `AiKnowledge` | `updatedBy` | single ref |
| `aiSupport` | `AiAuditLog` | `performedBy` | single ref |
| `aiSupport` | `AiConversation` | `driverId` | single ref |
| `aiSupport` | `AiSupport` | `driverId` | single ref |
| `auditLog` | `AuditLog` | `performedBy` | single ref |
| `broadcast` | `Broadcast` | `createdBy` | single ref |
| `broadcast` | `Broadcast` | `targetFilters.userIds` | array of refs |
| `call` | `Call` | `callerId` | single ref |
| `call` | `Call` | `endedBy` | single ref |
| `call` | `Call` | `receiverId` | single ref |
| `chat` | `Chat` | `deletedBy` | array of refs |
| `chat` | `Chat` | `participants` | array of refs |
| `chat` | `Chat` | `readBy` | array of refs |
| `driver` | `Driver` | `suspension.suspendedBy` | embedded path (dotted field) |
| `driver` | `Driver` | `userId` | single ref |
| `emergencyContact` | `EmergencyContact` | `userId` | single ref |
| `event` | `Event` | `createdBy` | single ref |
| `fareConfiguration` | `FareConfiguration` | `createdBy` | single ref |
| `fcmToken` | `DeviceToken` | `userId` | single ref |
| `holiday` | `Holiday` | `createdBy` | single ref |
| `lostAndFound` | `LostAndFound_AuditLogSchema` | `actor` | single ref |
| `lostAndFound` | `LostFound` | `createdBy` | single ref |
| `lostAndFound` | `LostFound` | `driverId` | single ref |
| `lostAndFound` | `LostFound` | `passengerId` | single ref |
| `message` | `Message` | `pinnedBy` | single ref |
| `message` | `Message` | `sender` | single ref |
| `notification` | `Notification` | `receiver` | single ref |
| `notification` | `Notification` | `sender` | single ref |
| `notificationPreference` | `NotificationPreference` | `userId` | one-to-one (unique) |
| `payout` | `Payout` | `userId` | single ref |
| `pendingPayment` | `PendingPayment` | `userId` | single ref |
| `recentDestination` | `RecentDestination` | `userId` | single ref |
| `referral` | `Referral` | `refereeId` | one-to-one (unique) |
| `referral` | `Referral` | `referredUserId` | single ref |
| `referral` | `Referral` | `referrerId` | single ref |
| `referral` | `referralAuditLogSchema` | `actor` | single ref |
| `resetToken` | `Token` | `user` | single ref |
| `review` | `Review` | `receiverId` | single ref |
| `review` | `Review` | `reviewById` | single ref |
| `review` | `Review` | `reviewerId` | single ref |
| `review` | `Review` | `reviewForId` | single ref |
| `ride` | `Ride` | `assignedDriverId` | single ref |
| `ride` | `Ride` | `driverId` | single ref |
| `ride` | `Ride` | `userId` | single ref |
| `ride` | `Ride_NotifiedDrivers` | `driverId` | single ref |
| `rideCategory` | `RideCategory` | `createdBy` | single ref |
| `role` | `Role` | `createdBy` | single ref |
| `role` | `Role` | `updatedBy` | single ref |
| `support` | `Support` | `userId` | single ref |
| `surgeRule` | `SurgeRule` | `createdBy` | single ref |
| `tier` | `DestinationFilter` | `driverId` | single ref |
| `tier` | `DriverPointHistory` | `createdBy` | single ref |
| `tier` | `DriverPointHistory` | `driverId` | single ref |
| `tier` | `DriverPointHistory` | `metadata.type.adminId` | embedded path (dotted field) |
| `tier` | `TierHistory` | `driverId` | single ref |
| `tracking` | `Tracking` | `driverId` | single ref |
| `tracking` | `Tracking` | `userId` | single ref |
| `transaction` | `Transaction` | `userId` | single ref |
| `tripReport` | `adminNoteSchema` | `adminId` | single ref |
| `tripReport` | `TripReport` | `reporterId` | single ref |
| `tripReport` | `TripReport` | `resolvedBy` | single ref |
| `tripReport` | `TripReport` | `rideSnapshot.driverId` | embedded path (dotted field) |
| `tripReport` | `TripReport_AuditLogSchema` | `actor` | single ref |
| `wallet` | `Wallet` | `userId` | one-to-one (unique) |

