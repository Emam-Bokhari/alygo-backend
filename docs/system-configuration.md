# System Configuration Module

This document describes the design, database schema, caching strategy, and workflows of the **System Configuration System** in Alygo.

---

## 1. Business Overview

The **System Configuration** module serves as the central control panel for the entire Alygo application. Rather than hardcoding key business rules, radius thresholds, timers, and fees—or requiring server redeployments to change them—the platform stores these variables in a single database document.

This allows administrators to dynamically adjust system parameters at runtime, including:

- Driver search radius and expansion behaviors.
- GPS and location tracking update intervals.
- Lost and found window limits and fees.
- Referral reward values and payout conditions.
- AI customer support limits and model settings.

---

## 2. Technical Architecture & Design Patterns

### Single Document Constraint (Singleton-like)

By design, the database is intended to hold exactly **one** system configuration document. To enforce this, the service implements **self-healing logic** during fetch and update calls:

1. **Creation/Seeding**: If no configuration document exists, the service automatically seeds the database with a comprehensive set of default values.
2. **Duplicate Cleanup**: If duplicate documents are somehow created, the service automatically deletes the extra documents and keeps the primary one.

### Caching Mechanism (`systemConfigHelper.ts`)

To prevent performance bottlenecks (since settings like search radius or tracking parameters are queried frequently, e.g., on every socket update or driver ping), Alygo uses an in-memory caching system:

- **Cache Duration**: Configurations are cached in memory for **5 minutes** (`5 * 60 * 1000` ms).
- **Cache Invalidation**: Whenever the configuration is updated via the patch endpoint, `clearSystemConfigCache()` is invoked to invalidate the cache immediately so updates take effect.
- **Environment Fallback**: If the database is unreachable, the system automatically falls back to values defined in `.env` (via the local `config` object).

---

## 3. Directory Structure & Files

The module is organized under `src/app/modules/systemConfiguration/`:

- **[systemConfiguration.interface.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/app/modules/systemConfiguration/systemConfiguration.interface.ts)**: Declares all TypeScript interfaces and type definitions for configurations.
- **[systemConfiguration.model.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/app/modules/systemConfiguration/systemConfiguration.model.ts)**: Configures the Mongoose schema, validation rules, defaults, and links the Soft-Delete plugin.
- **[systemConfiguration.service.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/app/modules/systemConfiguration/systemConfiguration.service.ts)**: Handles the database CRUD operations, singleton self-healing logic, and default values mapping.
- **[systemConfiguration.controller.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/app/modules/systemConfiguration/systemConfiguration.controller.ts)**: Express controller wrapping request and response handling with async error middleware.
- **[systemConfiguration.route.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/app/modules/systemConfiguration/systemConfiguration.route.ts)**: Express routing definitions, applying authentication and role check middlewares.
- **[systemConfigHelper.ts](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/src/helpers/systemConfigHelper.ts)**: Handles global caching, cache clearing, and environment/database fallbacks.

---

## 4. Configuration Schema Breakdown

Below is the detailed list of configurations grouped by sub-system.

### A. Driver Matching Configuration (`driverMatching`)

Controls how rides are broadcasted to drivers.

| Property                          | Type     | Default | Description                                                                             |
| :-------------------------------- | :------- | :------ | :-------------------------------------------------------------------------------------- |
| `initialSearchRadiusKm`           | `Number` | `5`     | The starting search radius (in kilometers) to look for available drivers.               |
| `radiusExpansionDistanceKm`       | `Number` | `3`     | Increment distance (in kilometers) to expand search radius if no drivers are found.     |
| `driverVisibilityDurationSeconds` | `Number` | `60`    | The window of time a driver has to accept an offered ride before it is shown to others. |
| `rideRequestLifetimeSeconds`      | `Number` | `300`   | The total lifetime (in seconds) of a ride request before it automatically expires.      |
| `maxSearchRadiusKm`               | `Number` | `50`    | The absolute maximum limit (in kilometers) for the expanded matching radius.            |

---

### B. Tracking Configuration (`tracking`)

Handles parameters for GPS updates and ETA calculations.

| Property                           | Type      | Default | Description                                                                                                    |
| :--------------------------------- | :-------- | :------ | :------------------------------------------------------------------------------------------------------------- |
| `minLocationUpdateIntervalSeconds` | `Number`  | `2`     | The minimum duration (in seconds) between sequential GPS updates from driver apps.                             |
| `minMovementDistanceMeters`        | `Number`  | `10`    | The minimum movement distance (in meters) required to trigger a location update.                               |
| `maxGpsAccuracyToleranceMeters`    | `Number`  | `50`    | Maximum GPS horizontal accuracy error allowed. Updates with errors higher than this are discarded.             |
| `arrivalRadiusMeters`              | `Number`  | `30`    | The radius (in meters) around the pickup/destination point inside which the driver is marked as arrived.       |
| `etaRefreshIntervalSeconds`        | `Number`  | `10`    | Refresh frequency (in seconds) for real-time ETA recalculations.                                               |
| `averageSpeedKmh`                  | `Number`  | `40`    | Default average speed assumption for fallback ETA calculations when routing APIs are offline.                  |
| `enableSocketOptimization`         | `Boolean` | `true`  | When true, optimizes socket traffic for driver location updates (e.g. throttling updates to inactive clients). |

---

### C. Reservation Configuration (`reservation`)

Settings related to scheduled/reserved rides.

| Property                         | Type      | Default | Description                                                                                           |
| :------------------------------- | :-------- | :------ | :---------------------------------------------------------------------------------------------------- |
| `enabled`                        | `Boolean` | `true`  | Toggle switch to enable or disable the reservation system globally.                                   |
| `minAdvanceMinutes`              | `Number`  | `30`    | The minimum advance notice (in minutes) required to book a reserved ride.                             |
| `maxAdvanceDays`                 | `Number`  | `30`    | The maximum advance notice (in days) allowed for booking reservations.                                |
| `driverVisibleBeforeMinutes`     | `Number`  | `60`    | The duration prior to the reservation start when the ride becomes visible and assignable to drivers.  |
| `driverAssignmentTimeoutMinutes` | `Number`  | `5`     | The timeout duration to find and assign a driver to the reserved ride before escalation/cancellation. |
| `reminder24h`                    | `Boolean` | `true`  | Toggle to send a notification reminder 24 hours before the reservation starts.                        |
| `reminder1h`                     | `Boolean` | `true`  | Toggle to send a notification reminder 1 hour before the reservation starts.                          |
| `reminder30m`                    | `Boolean` | `true`  | Toggle to send a notification reminder 30 minutes before the reservation starts.                      |
| `reminder15m`                    | `Boolean` | `true`  | Toggle to send a notification reminder 15 minutes before the reservation starts.                      |

---

### D. Lost & Found Configuration (`lostFound`)

Governs the recovery policy for items forgotten by passengers.

| Property                  | Type      | Default | Description                                                                                                |
| :------------------------ | :-------- | :------ | :--------------------------------------------------------------------------------------------------------- |
| `enabled`                 | `Boolean` | `true`  | Toggle switch to enable or disable the Lost & Found module.                                                |
| `reportWindowDays`        | `Number`  | `7`     | The maximum number of days after a ride's completion during which a passenger can file a lost item report. |
| `maxFiles`                | `Number`  | `5`     | Maximum number of files (pictures, receipts) allowed to be uploaded per report.                            |
| `maxFileSizeMb`           | `Number`  | `10`    | Maximum file size limit (in Megabytes) for each uploaded file.                                             |
| `defaultDeliveryFee`      | `Number`  | `0`     | Default delivery fee added if the driver returns the item to the passenger.                                |
| `returnConfirmationHours` | `Number`  | `48`    | The window of time (in hours) within which passenger/driver must confirm delivery return completion.       |
| `autoCloseDays`           | `Number`  | `30`    | Period of inactive days after which open reports are automatically closed.                                 |

---

### E. Referral Configuration (`referral`)

Defines rewards parameters for passengers and drivers who invite new users to the platform.

#### Passenger Referral Settings (`referral.passenger`)

| Property                 | Type      | Default          | Description                                                                              |
| :----------------------- | :-------- | :--------------- | :--------------------------------------------------------------------------------------- |
| `enabled`                | `Boolean` | `true`           | Enables or disables passenger referrals.                                                 |
| `rewardAmount`           | `Number`  | `20`             | Reward amount given to the referrer passenger.                                           |
| `rewardCurrency`         | `String`  | `"USD"`          | Currency code of the reward payout.                                                      |
| `qualificationType`      | `String`  | `"rides"`        | Metric used to qualify (usually "rides" or "signups").                                   |
| `requiredCompletedTrips` | `Number`  | `1`              | Number of trips the referee passenger must complete to unlock the referrer's reward.     |
| `qualificationDays`      | `Number`  | `30`             | Time window (in days) for the referee passenger to complete the required trips.          |
| `allowMultipleRewards`   | `Boolean` | `false`          | If true, a referrer can receive multiple rewards from the same referee (not common).     |
| `maximumRewardsPerUser`  | `Number`  | `5`              | Cap on the maximum number of referral rewards a single passenger can earn.               |
| `autoRewardEnabled`      | `Boolean` | `true`           | If true, rewards are processed and credited automatically by the system upon completion. |
| `shareInstructions`      | `String`  | _(Instructions)_ | Help text shown to passengers explaining how to share referral codes.                    |
| `rewardTerms`            | `String`  | _(Terms)_        | Legal / Policy terms for the passenger rewards.                                          |

#### Driver Referral Settings (`referral.driver`)

| Property                  | Type      | Default   | Description                                                                           |
| :------------------------ | :-------- | :-------- | :------------------------------------------------------------------------------------ |
| `enabled`                 | `Boolean` | `true`    | Enables or disables driver referrals.                                                 |
| `rewardAmount`            | `Number`  | `100`     | Reward amount given to the referrer driver.                                           |
| `rewardCurrency`          | `String`  | `"USD"`   | Currency code of the driver reward payout.                                            |
| `requiredCompletedTrips`  | `Number`  | `10`      | Trips the referee driver must complete to qualify the referrer.                       |
| `qualificationDays`       | `Number`  | `30`      | Time window (in days) for the referee driver to complete the required trips.          |
| `payoutDelayHours`        | `Number`  | `0`       | Holding/delay period (in hours) before the referral reward is released to the wallet. |
| `autoRewardEnabled`       | `Boolean` | `true`    | Auto-trigger payout upon qualification.                                               |
| `maximumRewardsPerDriver` | `Number`  | `10`      | Cap on the maximum referral rewards a single driver can receive.                      |
| `termsAndConditions`      | `String`  | _(Terms)_ | Legal / Policy terms for the driver rewards.                                          |

---

### F. Driver Rewards Configuration (`driverRewards`)

Controls driver loyalty tiers and filters.

| Property                         | Type      | Default        | Description                                                                 |
| :------------------------------- | :-------- | :------------- | :-------------------------------------------------------------------------- |
| `enabled`                        | `Boolean` | `true`         | Enables/disables driver tier rewards.                                       |
| `tierPromotion`                  | `Boolean` | `true`         | Enables automatic promotion to higher driver tiers.                         |
| `autoDowngrade`                  | `Boolean` | `true`         | Enables automatic downgrading of driver tiers if quotas are missed.         |
| `dailyQuotaResetTime`            | `String`  | `"00:00"`      | Daily reset time (HH:MM format) for calculating quotas.                     |
| `timezone`                       | `String`  | `"Asia/Dhaka"` | Timezone reference for resets (e.g., `"Asia/Dhaka"`).                       |
| `destinationFilterRadiusDefault` | `Number`  | `5`            | The default filter radius (in kilometers) for driver destination filtering. |

---

### G. AI Support Configuration (`aiSupport`)

Parameters for the automated AI support chatbot.

| Property                   | Type       | Default              | Description                                                                              |
| :------------------------- | :--------- | :------------------- | :--------------------------------------------------------------------------------------- |
| `enabled`                  | `Boolean`  | `true`               | Enables AI Chatbot support globally.                                                     |
| `provider`                 | `String`   | `"google"`           | AI Provider: `"google"` (Gemini) or `"openai"` (GPT).                                    |
| `model`                    | `String`   | `"gemini-2.5-flash"` | The model identifier used for inference.                                                 |
| `temperature`              | `Number`   | `0.2`                | Creativity level (lower values are more deterministic and rule-bound).                   |
| `maxTokens`                | `Number`   | `800`                | The max output length cap for responses.                                                 |
| `historyLength`            | `Number`   | `5`                  | The number of previous messages to retain for chat context.                              |
| `enableConversationMemory` | `Boolean`  | `true`               | Toggles whether the agent remembers context across a chat session.                       |
| `minimumConfidence`        | `Number`   | `0.5`                | Threshold for answer validation confidence before sending fallback messages.             |
| `allowFallbackAnswer`      | `Boolean`  | `true`               | If true, fallbacks to static support options when AI doesn't know the answer.            |
| `defaultLanguage`          | `String`   | `"en"`               | Language default code.                                                                   |
| `enabledModules`           | `String[]` | _(List)_             | Modules AI can answer query topics for (e.g. "Ride", "Wallet", "Lost Found").            |
| `suggestedQuestions`       | `String[]` | _(List)_             | Prompt suggestions shown to users on the chatbot screen.                                 |
| `rateLimit`                | `Object`   | _Custom_             | Minute, hour, and daily limits to prevent API abuse.                                     |
| `prompts`                  | `Object`   | _Custom_             | Contains prompts: `systemPrompt`, `fallbackPrompt`, `safetyPrompt`, and `noMatchPrompt`. |

---

## 5. API Endpoints

### 1. Get System Configuration

Retrieve the active system configuration settings.

- **Route**: `/api/v1/system-configurations`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>` (User must be authenticated)
- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "System configuration retrieved successfully",
  "data": {
    "driverMatching": {
      "initialSearchRadiusKm": 5,
      "radiusExpansionDistanceKm": 3,
      ...
    },
    ...
  }
}
```

### 2. Update System Configuration

Update system parameters dynamically (or create them if not initialized).

- **Route**: `/api/v1/system-configurations`
- **Method**: `PATCH`
- **Headers**: `Authorization: Bearer <token>` (Requires Admin privileges)
- **Request Body**: (Allows partial updates)

```json
{
  "driverMatching": {
    "initialSearchRadiusKm": 6
  }
}
```

- **Response**:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "System configuration updated successfully",
  "data": {
    "driverMatching": {
      "initialSearchRadiusKm": 6,
      "radiusExpansionDistanceKm": 3,
      ...
    },
    ...
  }
}
```
