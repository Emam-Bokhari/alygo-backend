# Service Area GeoJSON Migration Summary

## Overview

This document summarizes the refactoring of the Service Area implementation to use GeoJSON coordinates instead of relying only on city/airport names.

## Changes Made

### 1. Core Model Updates

- **File**: `src/app/modules/serviceArea/serviceArea.model.ts`
- **Changes**:
  - Added `location` field with GeoJSON Point structure
  - Added `coverageRadiusKm` field for coverage radius in kilometers
  - Added 2dsphere index on `location` for geospatial queries

### 2. Interface Updates

- **File**: `src/app/modules/serviceArea/serviceArea.interface.ts`
- **Changes**:
  - Added `location` field with GeoJSON Point type
  - Added `coverageRadiusKm` field

### 3. Service Layer Updates

- **File**: `src/app/modules/serviceArea/serviceArea.service.ts`
- **New Methods**:
  - `findServiceAreaByCoordinates(longitude, latitude)` - Find service area by coordinates
  - `findAllServiceAreasByCoordinates(longitude, latitude)` - Find all matching service areas
  - `isPointInServiceArea(serviceAreaId, longitude, latitude)` - Check if point is in service area
  - `calculateDistance(lat1, lon1, lat2, lon2)` - Haversine distance calculation
  - `toRad(degrees)` - Degree to radian conversion helper

### 4. Controller Updates

- **File**: `src/app/modules/serviceArea/serviceArea.controller.ts`
- **New Methods**:
  - `findServiceAreaByCoordinates` - GET endpoint for coordinate-based lookup
  - `findAllServiceAreasByCoordinates` - GET endpoint for all matching areas
  - `isPointInServiceArea` - GET endpoint for point-in-area check

### 5. Route Updates

- **File**: `src/app/modules/serviceArea/serviceArea.route.ts`
- **New Routes**:
  - `GET /by-coordinates?longitude=&latitude=` - Find service area by coordinates
  - `GET /all-by-coordinates?longitude=&latitude=` - Find all matching service areas
  - `GET /:serviceAreaId/check-point?longitude=&latitude=` - Check if point is in service area

### 6. Ride Service Updates

- **File**: `src/app/modules/ride/ride.service.ts`
- **Changes**:
  - Updated `estimateFareAndRoute` to use coordinate-based Service Area matching
  - Added fallback to reverse geocoding for backward compatibility
  - Imported `ServiceAreaServices` for coordinate-based lookups

### 7. Driver Matching Updates

- **File**: `src/services/driverMatchingService.ts`
- **Changes**:
  - Updated driver duty policy lookup to use coordinate-based Service Area matching
  - Now checks driver's current GPS location to determine applicable service area
  - Maintains backward compatibility with type-based ID lookups

### 8. Data Migration Script

- **File**: `src/migrations/migrateServiceAreaToGeoJSON.ts`
- **Purpose**: Migrate existing Service Area documents to GeoJSON format
- **Features**:
  - Geocodes existing city/airport names to coordinates
  - Sets default coverage radius (10km for airports, 25km for cities)
  - Skips documents that already have valid coordinates
  - Provides detailed migration statistics
  - Handles errors gracefully with fallback coordinates

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Fallback Logic**: Ride estimation falls back to city-name-based lookup if coordinate-based lookup fails
2. **Type-Based IDs**: Driver duty policy still uses type-based IDs (cityId, zoneId, etc.) for policy matching
3. **Existing Fields**: All existing fields (country, state, city, zone, airport) are preserved
4. **Optional Coordinates**: Location and coverageRadiusKm are optional fields with sensible defaults

## New Service Area Structure

### City Example

```json
{
  "cityId": "...",
  "type": "city",
  "city": "Dhaka",
  "location": {
    "type": "Point",
    "coordinates": [90.4125, 23.8103]
  },
  "coverageRadiusKm": 25,
  "maxDrivers": 50
}
```

### Airport Example

```json
{
  "cityId": "...",
  "type": "airport",
  "city": "Dhaka",
  "airport": "Hazrat Shahjalal International Airport",
  "location": {
    "type": "Point",
    "coordinates": [90.3978, 23.8433]
  },
  "coverageRadiusKm": 10,
  "maxDrivers": 100
}
```

## Migration Steps

1. **Deploy Code Changes**: Deploy all the updated files to production
2. **Run Migration Script**: Execute the migration script to update existing Service Area documents
   ```bash
   ts-node src/migrations/migrateServiceAreaToGeoJSON.ts
   ```
3. **Verify Migration**: Check that all Service Areas have valid coordinates
4. **Monitor**: Monitor the application for any issues with coordinate-based matching
5. **Update Admin Panel**: Update admin panel to include coordinate fields when creating/editing Service Areas

## Testing Recommendations

1. **Unit Tests**: Test coordinate-based Service Area matching functions
2. **Integration Tests**: Test ride request flow with various pickup locations
3. **Driver Matching Tests**: Verify driver matching respects service area boundaries
4. **Edge Cases**: Test locations outside all service areas
5. **Performance**: Verify geospatial queries perform well with large datasets

## Rollback Plan

If issues arise, the system can be rolled back by:

1. Reverting code changes
2. The fallback logic ensures city-name-based matching still works
3. Existing Service Area documents retain all original fields

## Notes

- The system now primarily uses MongoDB geospatial queries for Service Area matching
- Google Maps API remains the primary source for route, distance, and ETA calculations
- The Haversine formula is used as a fallback for distance calculations
- All existing business logic, ride flows, and integrations remain unchanged
