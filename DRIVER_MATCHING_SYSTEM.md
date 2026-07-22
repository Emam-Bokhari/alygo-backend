# Progressive Driver Matching System

## Overview

This document describes the progressive driver matching strategy implemented for the Alygo ride-sharing platform. The system uses a sophisticated approach to match passengers with drivers efficiently while ensuring optimal user experience.

## Key Features

### 1. Overall Ride Request Lifetime

- **Maximum Duration**: 5 minutes (configurable)
- **Behavior**: If no driver accepts within 5 minutes, the ride request automatically transitions to `EXPIRED` status
- **Notification**: Passenger is notified in real-time that no driver was found

### 2. Driver Request Visibility

- **Visibility Duration**: 60 seconds per driver (configurable)
- **Behavior**: Each eligible driver can see the request for only 60 seconds
- **Auto-Removal**: If a driver doesn't accept within 60 seconds, the request automatically disappears from their app
- **No Redispatch**: The same request doesn't continue to appear on that driver's screen unless intentionally redispatched by the matching strategy

### 3. Progressive Driver Search

- **Initial Radius**: Starts with smallest configured radius (default: 5km)
- **Event-Driven Expansion**:
  - **Immediate expansion when all drivers respond**: If all notified drivers respond (accept/reject) without any acceptance, immediately expand radius
  - **Immediate expansion on timeout**: If all drivers' visibility expires without response, immediately expand radius
  - **No fixed time intervals**: Eliminates inefficient waiting periods
  - Include next nearest eligible drivers in the expanded radius
  - Continue expanding until a driver accepts or the 5-minute lifetime expires
- **Smart Matching**: Only notifies drivers who haven't been previously notified

### 4. Acceptance Rules

- **First-Come-First-Served**: The first driver who successfully accepts becomes the assigned driver
- **Immediate Stop**: Matching process stops immediately upon acceptance
- **Broadcast Removal**: Request is instantly removed from every other driver's application
- **Real-time Notifications**: Both passenger and assigned driver are notified instantly

### 5. Race Condition Protection

- **Atomic Operations**: Uses MongoDB atomic `findOneAndUpdate` within transactions
- **Guaranteed Uniqueness**: Ensures only one driver can successfully accept a ride
- **Graceful Failures**: Subsequent acceptance attempts fail with appropriate error messages

### 6. Timeout Handling

- **Background Jobs**: Uses BullMQ/Redis for all timeout handling
- **Non-Blocking**: Matching process continues independently of client connections
- **Scalable**: Designed for high concurrency and fault tolerance

## Configuration

All matching parameters are configurable via environment variables:

```bash
# Initial search radius in kilometers (default: 5km)
INITIAL_SEARCH_RADIUS_KM=5

# Distance to expand radius in kilometers (default: 3km)
RADIUS_EXPANSION_DISTANCE_KM=3

# How long a driver can see a request in seconds (default: 60 seconds)
DRIVER_VISIBILITY_DURATION_SECONDS=60

# Overall ride request lifetime in seconds (default: 300 seconds = 5 minutes)
RIDE_REQUEST_LIFETIME_SECONDS=300

# Maximum search radius in kilometers (default: 50km)
MAX_SEARCH_RADIUS_KM=50
```

## Architecture

### Components

1. **BullMQ Queues** (`src/config/bullmq.ts`)
   - `ride-expiration`: Handles overall ride request expiration
   - `driver-visibility`: Manages per-driver visibility timeouts
   - `radius-expansion`: Controls progressive radius expansion

2. **Workers** (`src/workers/rideMatchingWorkers.ts`)
   - `rideExpirationWorker`: Processes ride expiration after 5 minutes
   - `driverVisibilityWorker`: Handles driver visibility timeouts (60 seconds)
   - `radiusExpansionWorker`: Manages progressive radius expansion

3. **Driver Matching Service** (`src/services/driverMatchingService.ts`)
   - `findEligibleDriversInRadius`: Finds eligible drivers within a specific radius
   - Handles all driver eligibility checks (availability, verification, vehicle requirements, duty policies)

4. **Ride Service Updates** (`src/app/modules/ride/ride.service.ts`)
   - `requestRide`: Updated to use progressive matching system
   - `acceptRide`: Updated to cancel BullMQ jobs upon acceptance

### Database Schema Changes

#### Ride Model Updates

- Added `EXPIRED` status to `RIDE_STATUS` enum
- Updated `driverMatching.requestExpireSeconds` to use configured lifetime
- Enhanced `driverMatching.notifiedDrivers` to track individual driver notification status

#### Driver Matching Status

- `SENT`: Request sent to driver
- `ACCEPTED`: Driver accepted the request
- `REJECTED`: Driver rejected the request
- `EXPIRED`: Driver visibility expired without action

### Event-Driven Benefits

- **Faster Matching**: No waiting for fixed time intervals
- **Efficient Resource Usage**: Immediate response to driver actions
- **Better User Experience**: Reduced waiting time for passengers
- **Optimal Driver Utilization**: Drivers are notified as soon as they're needed

## Flow Diagram

```
Passenger requests ride
        ↓
Initial driver search (5km radius)
        ↓
Notify eligible drivers (60-second visibility)
        ↓
Schedule BullMQ jobs:
  - Ride expiration (5 minutes)
  - Driver visibility timeouts (60 seconds each)
        ↓
┌───────────────┬───────────────┬───────────────┐
│   Driver A    │   Driver B    │   Driver C    │
│  (60 seconds) │  (60 seconds) │  (60 seconds) │
└───────────────┴───────────────┴───────────────┘
        ↓
Event-Driven Expansion Triggers:
  - All drivers respond (accept/reject), OR
  - All drivers' visibility expires
        ↓
Immediate radius expansion (+3km)
        ↓
Notify new eligible drivers
        ↓
Repeat until:
  - Driver accepts, OR
  - 5-minute lifetime expires
```

## Socket Events

### Client → Server Events

- `ride-request`: Driver accepts/rejects ride request
- `driver-location-update`: Real-time driver location updates
- `user-location-update`: Real-time passenger location updates

### Server → Client Events

- `ride-request`: New ride request notification to drivers
- `ride-accepted`: Ride accepted notification to passenger
- `ride-expired`: Ride expiration notification to passenger
- `ride-request-expired`: Driver visibility timeout notification
- `ride-request-cancelled`: Ride cancelled notification to other drivers
- `driver-location-updated`: Real-time driver location to passenger
- `user-location-updated`: Real-time passenger location to driver

## Error Handling

### Race Condition Protection

```typescript
// Atomic update in acceptRide function
const ride = await Ride.findOneAndUpdate(
  {
    _id: rideId,
    status: RIDE_STATUS.SEARCHING_DRIVER,
    driverId: { $exists: false },
  },
  {
    $set: {
      status: RIDE_STATUS.DRIVER_ACCEPTED,
      driverId: driverDoc.userId,
      acceptedAt: new Date(),
    },
  },
  { new: true, session },
);
```

### Job Cancellation

When a driver accepts a ride, all associated BullMQ jobs are cancelled:

- Ride expiration job
- All driver visibility jobs
- All radius expansion jobs

## Monitoring and Logging

The system includes comprehensive logging:

- Driver matching decisions
- Job scheduling and execution
- Error conditions
- Performance metrics

## Testing Recommendations

1. **Unit Tests**
   - Driver eligibility logic
   - Radius expansion calculations
   - Job scheduling logic

2. **Integration Tests**
   - End-to-end ride request flow
   - Driver acceptance race conditions
   - Timeout handling

3. **Load Tests**
   - High concurrency scenarios
   - Redis performance under load
   - Database query optimization

## Performance Considerations

1. **Database Indexes**
   - Ensure proper indexes on `Ride.status`, `Ride.requestedAt`
   - GeoSpatial indexes on driver locations

2. **Redis Configuration**
   - Configure Redis persistence for job durability
   - Monitor Redis memory usage
   - Consider Redis clustering for high-scale deployments

3. **Worker Concurrency**
   - Adjust worker concurrency based on load
   - Monitor worker queue lengths
   - Implement horizontal scaling if needed

## Troubleshooting

### Common Issues

1. **Drivers not receiving requests**
   - Check Redis connection
   - Verify worker processes are running
   - Check socket connection status

2. **Rides not expiring**
   - Verify BullMQ job scheduling
   - Check worker error logs
   - Ensure Redis is persistent

3. **Radius expansion not working**
   - Verify configuration values
   - Check driver eligibility logic
   - Monitor worker execution

## Future Enhancements

1. **Smart Matching**
   - Machine learning for driver-passenger compatibility
   - Historical acceptance rate analysis
   - Traffic pattern integration

2. **Dynamic Configuration**
   - Admin panel for real-time parameter adjustment
   - A/B testing framework
   - Geographic-based configuration

3. **Advanced Features**
   - Driver preference settings
   - Passenger driver ratings integration
   - Surge pricing integration

## Support

For issues or questions about the progressive driver matching system, please contact the development team or refer to the main project documentation.
