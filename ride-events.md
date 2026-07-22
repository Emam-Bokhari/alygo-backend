# Socket.IO Events Documentation

This document outlines the Socket.IO event schema used for communication between the backend and the Driver/Passenger mobile applications.

---

## Driver Events (Client → Server)

| Event Name               | Expected Payload                                      | Internal Behavior                                                                                        | Response Event                         | Ride Status                                                 |
| :----------------------- | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------- | :---------------------------------------------------------- |
| `register`               | `{ userId: string }`                                  | Manually registers socket connection with userId                                                         | None                                   | Connection                                                  |
| `driver-location-update` | `{ coordinates: [number, number], address?: string }` | Updates driver location; checks for active ride; triggers automatic status transitions (on-way, arrival) | `driver-location-updated` to Passenger | DRIVER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, STARTED |

---

## Passenger Events (Client → Server)

| Event Name             | Expected Payload                    | Internal Behavior                                                  | Response Event                    | Ride Status                                                 |
| :--------------------- | :---------------------------------- | :----------------------------------------------------------------- | :-------------------------------- | :---------------------------------------------------------- |
| `register`             | `{ userId: string }`                | Manually registers socket connection with userId                   | None                              | Connection                                                  |
| `user-location-update` | `{ coordinates: [number, number] }` | Updates user location in Tracking collection if active ride exists | `user-location-updated` to Driver | DRIVER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, STARTED |

---

## Backend → Driver Events

| Event Name               | Expected Payload                                                                                                               | Internal Behavior                                      | Ride Status                                                 |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------- | :---------------------------------------------------------- |
| `ride-request`           | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, pickup, destination, stops, fare, routeInfo, driverSearch, user }` | Sent to eligible drivers when passenger requests ride  | SEARCHING_DRIVER                                            |
| `ride-request-cancelled` | `{ rideId, message }`                                                                                                          | Sent to other notified drivers when one driver accepts | SEARCHING_DRIVER                                            |
| `user-location-updated`  | `{ rideId, userId, coordinates, updatedAt }`                                                                                   | Notifies driver of passenger's real-time location      | DRIVER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, STARTED |
| `ride-started`           | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, user }`                                                            | Notifies driver that ride has started                  | STARTED                                                     |
| `ride-completed`         | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, user }`                                                            | Notifies driver that ride is completed                 | COMPLETED                                                   |
| `payment-completed`      | `{ rideId, amount, paymentMethod, transactionId, paidAt }`                                                                     | Notifies driver that payment is processed              | COMPLETED                                                   |
| `ride-cancelled`         | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, cancelledBy, reason, user }`                                       | Notifies driver that ride was cancelled                | CANCELLED                                                   |

---

## Backend → Passenger Events

| Event Name                | Expected Payload                                                                                                                                                             | Internal Behavior                               | Ride Status                                                 |
| :------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :---------------------------------------------------------- |
| `driver-location-updated` | `{ rideId, driverId, driverName, driverProfileImage, driverLocation, remainingDistanceKm, estimatedArrivalMinutes, updatedAt }`                                              | Sends driver's real-time location and ETA       | DRIVER_ACCEPTED, DRIVER_ON_THE_WAY, DRIVER_ARRIVED, STARTED |
| `ride-accepted`           | `{ ride, rideType, scheduledAt, scheduledAtUtc, timezone, driver, driverSearch, pickupLocation, rideCategory, price, estimatedArrivalMinutes, remainingDistanceKm }`         | Notifies passenger that driver accepted request | DRIVER_ACCEPTED                                             |
| `driver-on-the-way`       | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, driver, pickupLocation, rideCategory, price, estimatedArrivalMinutes, remainingDistanceKm }`                     | Notifies passenger driver is en route to pickup | DRIVER_ON_THE_WAY                                           |
| `driver-arrived`          | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, driver, automaticDetection, pickupLocation, rideCategory, price, estimatedArrivalMinutes, remainingDistanceKm }` | Notifies passenger that driver reached pickup   | DRIVER_ARRIVED                                              |
| `stop-arrived`            | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, stopOrder, stopAddress, automaticDetection, driver }`                                                            | Notifies passenger driver arrived at stop       | STARTED                                                     |
| `start-otp-generated`     | `{ rideId, otp }`                                                                                                                                                            | Sends OTP for ride start verification           | DRIVER_ARRIVED                                              |
| `ride-started`            | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, verificationMethod, driver }`                                                                                    | Notifies passenger that ride has started        | STARTED                                                     |
| `end-otp-generated`       | `{ rideId, otp }`                                                                                                                                                            | Sends OTP for ride completion verification      | STARTED                                                     |
| `ride-completed`          | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, finalFare, verificationMethod, driver }`                                                                         | Notifies passenger that ride is completed       | COMPLETED                                                   |
| `payment-completed`       | `{ rideId, amount, paymentMethod, transactionId, paidAt }`                                                                                                                   | Notifies passenger that payment is processed    | COMPLETED                                                   |
| `ride-cancelled`          | `{ rideId, rideType, scheduledAt, scheduledAtUtc, timezone, cancelledBy, reason, driver }`                                                                                   | Notifies passenger that ride was cancelled      | CANCELLED                                                   |
