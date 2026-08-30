# Alygo System Configuration Guide (Detailed EJS Version)

This guide provides a comprehensive overview of the **System Configuration** module in the **Alygo Backend**, detailing exactly how each database field maps to real-time dispatch workers, reservation engines, tracking modules, billing layers, and AI services.

* **Live HTML Documentation URL**: [http://localhost:5005/api/v1/system-configurations/docs](http://localhost:5005/api/v1/system-configurations/docs) (Served dynamically via EJS with brand-accurate theme colors)
* **Template Path**: [views/system_configuration_docs.ejs](file:///c:/Moshfiqur%20Rahman/Projects/alygo-backend/views/system_configuration_docs.ejs) (Editable HTML/CSS template mapped with brand orange `#EA580C` and emerald `#00b389`)

---

## 1. Driver Matching Config (`driverMatching`)
Controls the Geolocation search grid and assignment logic for matching passengers with active drivers.

| Field Name | Default | Validation | Core Purpose & Backend Integration |
| :--- | :--- | :--- | :--- |
| `Driver Matching -> Initial Search Radius Km` | 5 km | Min: 0.1 | **Purpose**: The starting search area. <br> **Integration**: Used . The dispatch queue runs a Mongo query using GeoJSON coordinates to find free drivers within this initial radius. |
| `Driver Matching -> Radius Expansion Distance Km` | 3 km | Min: 0.1 | **Purpose**: How much the search area expands if no driver accepts on the first try.<br>**Integration**: When a matching tick completes without an accepting driver, expands the search radius by this increment. |
| `Driver Matching -> Max Search Radius Km` | 50 km | Min: 1 | **Purpose**: The maximum limit for matching search area.<br>**Integration**: Prevents infinite search loop resource consumption. If the search reaches this limit without any matches, the request is marked as unfulfilled. |
| `Driver Matching -> Driver Visibility Duration Seconds` | 60s | Min: 10 | **Purpose**: Time the request is shown on a driver's screen for live rides.<br>**Integration**: Monitored by a Redis timer. If no response is received within this visibility duration, the socket server triggers a timeout and routes the request to the next driver. |
| `Driver Matching -> Reservation Driver Visibility Duration Seconds` | 300s | Min: 10 | **Purpose**: Screen visibility timer for reservation bookings.<br>**Integration**: Drivers are given a longer window (5 minutes) to review schedule compatibility before accepting. |
| `Driver Matching -> Ride Request Lifetime Seconds` | 300s | Min: 60 | **Purpose**: Total lifespan of a live ride request.<br>**Integration**: Evaluated in . If a ride remains unaccepted past this duration, it is marked as `EXPIRED` or `CANCELLED`. |
| `Driver Matching -> Reservation Ride Request Lifetime Seconds` | 1800s | Min: 60 | **Purpose**: Total lifespan of a reservation request.<br>**Integration**: Stops background matching queues and notifies the passenger if no driver accepts within 30 minutes. |

---

## 2. Tracking Config (`tracking`)
Optimizes GPS telemetry, map visualization, and real-time updates over Socket.IO.

| Field Name | Default | Validation | Core Purpose & Backend Integration |
| :--- | :--- | :--- | :--- |
| `Tracking -> Min Location Update Interval Seconds` | 2s | Min: 1 | **Purpose**: Frequency of driver location transmission.<br>**Integration**: Filters and limits how frequently the mobile client can stream coordinate changes to the socket server. |
| `Tracking -> Min Movement Distance Meters` | 10m | Min: 1 | **Purpose**: Distance driver must travel to trigger a database update.<br>**Integration**: Prevents server overload when a vehicle is stuck in traffic. Telemetry is ignored unless movement exceeds this value. |
| `Tracking -> Max Gps Accuracy Tolerance Meters` | 50m | Min: 1 | **Purpose**: Rejection threshold for weak GPS signals.<br>**Integration**: Discards low-accuracy updates (e.g. from tunnels) to keep cars moving smoothly on the map without jumping. |
| `Tracking -> Arrival Radius Meters` | 30m | Min: 5 | **Purpose**: Threshold for auto-detecting passenger pickup arrival.<br>**Integration**: When distance to pickup drops below this value, the backend updates the state to `ARRIVED` and emits a socket alert. |
| `Tracking -> Eta Refresh Interval Seconds` | 10s | Min: 1 | **Purpose**: Frequency of recalculating arrival time (ETA).<br>**Integration**: Updates the passenger's app real-time progress bar. |
| `Tracking -> Enable Socket Optimization` | True | - | **Purpose**: Master switch for telemetry connection improvements.<br>**Integration**: If true, coordinates are batch-sent to connected clients to reduce active network packets. |

---

## 3. Reservation Config (`reservation`)
Governs advanced bookings, booking validation rules, and automated reminders.

| Field Name | Default | Validation | Core Purpose & Backend Integration |
| :--- | :--- | :--- | :--- |
| `Lost & Found -> Enabled` | True | - | **Purpose**: Master toggle for reservations. |
| `Reservation -> Min Advance Minutes` | 30 mins | Min: 0 | **Purpose**: The minimal notice time before scheduling a ride.<br>**Integration**: Enforced at booking validation. Rides scheduled less than 30 minutes in advance are rejected. |
| `Reservation -> Max Advance Days` | 30 days | Min: 1 | **Purpose**: Maximum booking timeframe. |
| `Reservation -> Driver Visible Before Minutes` | 60 mins | Min: 0 | **Purpose**: When matching opens for a scheduled ride.<br>**Integration**: The cron job queries trips starting within this time and publishes them to the driver search pipeline. |
| `reminder24h / 1h / 30m / 15m` | True | - | **Purpose**: Automatic push notification schedules.<br>**Integration**: Dispatched by scheduled cron systems in the backend reminder pipeline. |

---

## 4. Lost & Found Config (`lostFound`)
Coordinates forgotten items workflows.

| Field Name | Default | Validation | Core Purpose & Backend Integration |
| :--- | :--- | :--- | :--- |
| `Lost & Found -> Enabled` | True | - | **Purpose**: Toggles passenger-side lost & found reports. |
| `Lost & Found -> Report Window Days` | 7 days | Min: 1 | **Purpose**: Days after a ride ends to report lost items.<br>**Integration**: Checked during verification. Form submissions for older trips are blocked. |
| `Lost & Found -> Default Delivery Fee` | 0 | Min: 0 | **Purpose**: Base delivery price credited to the driver for returning items. |
| `Lost & Found -> Auto Close Days` | 30 days | Min: 1 | **Purpose**: Automatic closure of stagnant tickets.<br>**Integration**: Cron sweeps and closes tickets after 30 days of inactivity. |

---

## 5. Referral Config (`referral`)
Manages invitation rewards, currencies, and qualification criteria.

* **Passenger Referral (`passenger`)**:
 * `Referral -> Passenger -> Reward Amount` (Default: 20 USD): Bonus given to inviter.
 * `Referral -> Passenger -> Required Completed Trips` (Default: 1): Trips the invitee must complete before inviter is rewarded.
 * `Referral -> Passenger -> Qualification Days` (Default: 30 days): Period the invitee has to complete their trips.
 * `Referral -> Passenger -> Auto Reward Enabled` (Default: True): Triggers immediate wallet payout upon target completion.
* **Driver Referral (`driver`)**:
 * `Referral -> Passenger -> Reward Amount` (Default: 100 USD): Bonus for referring a new driver.
 * `Referral -> Passenger -> Required Completed Trips` (Default: 10): Trips required by the new driver.
 * `Referral -> Driver -> Payout Delay Hours` (Default: 0): Payout cooldown period in hours.

---

## 6. Driver Rewards Config (`driverRewards`)
Runs driver levels, quota resets, and destination matches.

| Field Name | Default | Core Purpose & Backend Integration |
| :--- | :--- | :--- |
| `Driver Rewards -> Tier Promotion` | True | Automatic upgrade of drivers once milestone points are reached. |
| `Driver Rewards -> Auto Downgrade` | True | Automatically drops tier status if monthly point targets are missed. |
| `Driver Rewards -> Daily Quota Reset Time` | "00:00" | Resets ride/online logs to zero. Aligned with timezone (`Asia/Dhaka`). |
| `Driver Rewards -> Destination Filter Radius Default`| 5 km | Matches destination modes |

---

## 7. AI Support Config (`aiSupport`)
Configures the generative customer service assistant (Gemini/GPT wrapper).

* `AI Support -> Provider` (Default: "google") & `AI Support -> Model` (Default: "gemini-2.5-flash").
* `AI Support -> Temperature` (Default: 0.2): Controls hallucination; low values lock responses strictly to company documents.
* `rateLimit.dailyLimit` (Default: 100): Prevents token abuse via Redis transaction counters.
* `prompts.safetyPrompt`: Stops injection prompt attacks from leaking endpoints or databases.

---

## 8. Driver Selfie Verification
Protects platform identity.

* `Driver Selfie Verification -> Driver Selfie Verification Interval Minutes` (Default: 720 mins / 12 hours): Recurrence cycle. Checked when drivers try to toggle online mode. Triggers Amazon Rekognition face verification locks if the time has passed.
