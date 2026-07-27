# Lost & Found System 

This document describes the Lost & Found System, including passenger and driver flows, status lifecycles, delivery configurations, and payments integration.

---

## 1. Business Overview

### Plain English Summary
It is common for passengers to accidentally leave items in vehicles. The **Lost & Found System** provides a structured way to report and return lost items.

- **Passengers** can report lost items from their completed rides, providing descriptions and pictures.
- **Drivers** are notified. They check their vehicle and mark the item as either **Found** or **Not Found**.
- If the item is found, the driver and passenger arrange the return:
  - **Passenger Pickup**: The passenger picks up the item from the driver for free.
  - **Driver Delivery**: The driver delivers the item to the passenger. The driver can specify a delivery fee to compensate for their time.
- If a delivery fee is specified, the passenger must pay it (via Stripe) before the driver delivers the item. The fee is added to the driver's wallet once the return is confirmed.

---

## 2. Technical Overview

### Architecture
The Lost & Found module integrates with the **Ride**, **Wallet**, **Transaction**, and **Stripe** modules. Real-time updates are synchronized via WebSockets and push notifications.

```
+--------------------+
|  Passenger/Driver  |
|  Lost-Found Action |
+---------+----------+
          |
          v
+---------+----------+      (Payment Checkout)      +--------------------+
|  Lost & Found Serv | ---------------------------> |   Stripe Service   |
+---------+----------+                              +---------+----------+
          |                                                   |
          v (Webhook: payment success)                        |
+---------+----------+                                        |
| Transaction &      | <--------------------------------------+
| Wallet Updates     |
+---------+----------+
          |
          v (Real-time updates)
+---------+----------+
|  Socket Helper /   |
|  Push Notification |
+--------------------+
```

---

## 3. Database Design

### Collections & Key Fields

#### `lostfounds` Collection
Defines a lost & found case transaction.
- `_id`: `ObjectId`
- `rideId`: `ObjectId` -> References `Ride`
- `passengerId`: `ObjectId` -> References `User`
- `driverId`: `ObjectId` -> References `User`
- `reportNumber`: `String` (Unique alphanumeric identifier, e.g. `LF-20260727-4029`)
- `itemName`: `String`
- `itemCategory`: `ObjectId` -> References `LostAndFoundItemCategory`
- `itemDescription`: `String`
- `uploadedFiles`: `Array` of `{ fileUrl: String, fileName: String, uploadedAt: Date }`
- `reportStatus`: `String` (Enum: `reported`, `under_review`, `found`, `not_found`, `waiting_payment`, `payment_completed`, `return_scheduled`, `return_in_progress`, `return_completed`, `received`, `closed`, `cancelled`)
- `foundStatus`: `String` (Enum: `pending`, `found`, `not_found`)
- `recoveryMethod`: `String` (Enum: `passenger_pickup`, `driver_delivery`)
- `deliveryFee`: `Number`
- `paymentStatus`: `String` (Enum: `not_required`, `pending`, `paid`, `failed`, `refunded`)
- `paymentIntentId`: `String`
- `passengerConfirmed`: `Boolean`
- `driverConfirmed`: `Boolean`
- `auditLogs`: `Array` of `{ action: String, actor: ObjectId, actorRole: String, details: Object, timestamp: Date }`

---

## 4. Complete Workflow

```mermaid
sequenceDiagram
    autonumber
    actor P as Passenger App
    participant S as Server (LostFoundService)
    actor D as Driver App
    participant ST as Stripe API
    participant W as Wallet / Transaction Services

    P->>S: Report Lost Item (rideId, itemName, category)
    activate S
    S->>S: Validate ride is completed & under 7-day reporting window
    S->>DB: Save LostFound report (status: reported)
    S->>D: Socket: new-lost-item-request & Push Alert
    S-->>P: Return report details
    deactivate S

    Note over D: Driver checks car & finds item:
    D->>S: Mark Found (notes)
    activate S
    S->>DB: Update status to FOUND
    S->>P: Socket: lost-found-found & Push Alert
    deactivate S

    Note over D: Driver configures recovery arrangement:
    D->>S: Configure Recovery (recoveryMethod: 'driver_delivery', deliveryFee: 15.00)
    activate S
    S->>DB: Update status to WAITING_PAYMENT, paymentStatus: PENDING
    S->>P: Socket: lost-found-payment-required & Push Alert
    deactivate S

    Note over P: Passenger pays fee:
    P->>S: Request Payment Session (reportId)
    activate S
    S->>ST: Create Checkout Session
    ST-->>S: Return checkout URL
    S-->>P: Return URL to passenger
    deactivate S

    P->>ST: Pay $15.00
    ST-->>S: Stripe Webhook (payment_intent.succeeded)
    activate S
    S->>W: Create Transaction (type: 'lost_found_delivery')
    S->>W: Credit $15.00 to driver's Wallet balance
    S->>DB: Update status to RETURN_SCHEDULED, paymentStatus: PAID
    S->>D: Socket: lost-found-return-scheduled & Push Alert
    deactivate S

    Note over D: Driver delivers item:
    D->>S: Mark Returned (driverConfirmed = true)
    activate S
    S->>DB: Update status to RETURN_COMPLETED
    S->>P: Socket: lost-found-return-completed & Push Alert
    deactivate S

    Note over P: Passenger receives item:
    P->>S: Confirm Received (passengerConfirmed = true)
    activate S
    S->>DB: Update status to CLOSED
    S->>D: Socket: return-confirmed
    deactivate S
```

---

## 5. Internal Algorithms

### Lost & Found Status Transitions
The lifecycle diagram below outlines the valid status transitions.

```mermaid
stateDiagram-v2
    [*] --> REPORTED : Passenger submits report
    REPORTED --> FOUND : Driver marks found
    REPORTED --> NOT_FOUND : Driver marks not found
    FOUND --> WAITING_PAYMENT : Driver sets delivery fee > 0
    FOUND --> RETURN_SCHEDULED : Driver sets recovery as Passenger Pickup (Fee = 0)
    WAITING_PAYMENT --> PAYMENT_COMPLETED : Passenger pays via Stripe
    PAYMENT_COMPLETED --> RETURN_SCHEDULED : Auto transitions
    RETURN_SCHEDULED --> RETURN_IN_PROGRESS : Driver starts delivery
    RETURN_IN_PROGRESS --> RETURN_COMPLETED : Driver marks item returned
    RETURN_SCHEDULED --> RETURN_COMPLETED : Driver marks item returned
    RETURN_COMPLETED --> RECEIVED : Passenger confirms receipt
    RECEIVED --> CLOSED : Auto transitions
    NOT_FOUND --> CLOSED : Auto transitions (or after review)
    REPORTED --> CANCELLED : Passenger cancels report
```

---

## 6. Flowcharts

*Detailed in Section 5.*

---

## 7. Sequence Diagrams

*Detailed in Section 4.*

---

## 8. State Diagrams

*Detailed in Section 5.*

---

## 9. API & Socket Interaction

### API: Submit Driver Rating
`POST /api/v1/lost-found/rate/:reportId`
- **Request Payload**:
```json
{
  "rating": 5,
  "review": "Fast delivery! Driver was super friendly."
}
```

- **Response Payload**:
```json
{
  "success": true,
  "data": {
    "_id": "64ca9e836940d9c49a62657d",
    "passengerConfirmed": true,
    "passengerRated": true,
    "passengerRating": 5,
    "passengerReview": "Fast delivery! Driver was super friendly."
  }
}
```

---

## 10. Calculations

### Stripe Payment & Driver Wallet Calculations
- **Delivery Fee**: `$15.00`
- **Platform Fee**: `$0.00` (100% of the delivery fee goes to the driver)
- **Stripe Transaction**: Passenger pays `$15.00` + payment processing fees.
- **Driver Credit**: Driver's wallet balance increases by `$15.00`:
  $$\text{New Wallet Balance} = \text{Current Balance} + \text{Delivery Fee}$$

---

## 11. Matching Logic

The Lost & Found system matches reports to rides using the `rideId`. Only the passenger who booked the ride can file a report, and only the driver assigned to that ride is notified.

---

## 12. Timezone Handling

All dates (`startDate`, `endDate`, timestamps) are stored in UTC.

---

## 13. Security & Fraud Prevention

- **Upload Restrictions**: Passengers can upload a maximum of `5` files (images or PDFs) to prevent storage abuse.
- **Validation**: Reports must be submitted within `7` days of ride completion. Duplicate reports for the same ride are blocked.

---

## 14. Performance & Optimizations

- **Indexing**: Database indexes on `rideId`, `reportStatus`, and `paymentStatus` optimize lookup performance.
- **Transactions**: Payment processing, transaction creation, and wallet updates are wrapped in MongoDB transactions.
