# Public Properties Endpoint

## Overview
The public properties endpoint allows unauthenticated users to view published property listings.

## Endpoint Details

**URL:** `GET /api/properties/public`

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `page` (optional, number): Page number for pagination (default: 1)
- `limit` (optional, number): Number of items per page (default: 10)

## Response Format

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Beautiful Apartment",
      "description": "A spacious 3-bedroom apartment...",
      "type": "apartment",
      "address": "123 Main Street",
      "city": "Paris",
      "postalCode": "75001",
      "price": 350000,
      "size": 120.5,
      "rooms": 4,
      "bedrooms": 3,
      "bathrooms": 2,
      "status": "published",
      "seoTitle": "3BR Apartment in Paris",
      "seoDescription": "...",
      "seoKeywords": ["apartment", "paris", "3-bedroom"],
      "images": [
        {
          "id": "uuid",
          "propertyId": "uuid",
          "filename": "image1.jpg",
          "url": "/uploads/image1.jpg",
          "order": 0,
          "createdAt": "2025-01-10T10:00:00Z"
        }
      ],
      "createdAt": "2025-01-10T10:00:00Z",
      "updatedAt": "2025-01-10T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

## Features

1. **No Authentication Required**: The endpoint is publicly accessible without JWT token
2. **Published Properties Only**: Only properties with status "published" are returned
3. **Images Included**: Property images are included in the response with proper ordering
4. **Ordered by Date**: Properties are ordered by creation date (newest first)
5. **Agency Data Excluded**: Internal agency information (agencyId) is not exposed
6. **Pagination Support**: Results are paginated for better performance

## Example Requests

### Get first page (default)
```bash
curl http://localhost:3000/api/properties/public
```

### Get specific page with custom limit
```bash
curl http://localhost:3000/api/properties/public?page=2&limit=20
```

## Implementation Details

- **Controller**: `PropertiesController.findPublicProperties()`
- **Service**: `PropertiesService.findPublicProperties()`
- **Decorator**: `@Public()` - Bypasses JWT authentication
- **Route Order**: Placed before `:id` route to prevent conflicts

## Requirements Satisfied

- ✅ Requirement 9: Property advertisement capabilities
- ✅ Requirement 13: Public property listings with detailed information
