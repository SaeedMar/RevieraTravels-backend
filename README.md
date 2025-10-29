# Hotels Server

A comprehensive Express server that provides hotel search functionality with integration for DynamoDB, Ratehawk, and TBO APIs.

## Features

- **DynamoDB Integration**: CRUD operations for hotel data
- **Ratehawk Integration**: Hotel search and suggestions
- **TBO Integration**: Hotel search and suggestions
- **Combined Search**: Search both providers simultaneously
- **CORS Support**: Cross-origin requests enabled
- **Error Handling**: Comprehensive error handling and logging

## Setup

### 1. Install Dependencies

```bash
npm install express cors dotenv @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
npm install --save-dev nodemon
```

### 2. Environment Configuration

Copy the environment file and update with your credentials:

```bash
cp hotels.env .env
```

Update the following variables in `.env`:

```env
# Server Configuration
PORT=2314

# AWS Configuration
AWS_REGION=eu-north-1
DYNAMO_TABLE=partner_feed_hotels_imported

# Ratehawk Configuration
RATEHAWK_API_KEY=your_ratehawk_api_key_here
RATEHAWK_BASE_URL=https://api.ratehawk.com

# TBO Configuration
TBO_BASE_URL=http://api.tbotechnology.in/TBOHolidays_HotelAPI
TBO_USERNAME=Revieratravel
TBO_PASSWORD=Rev@79868189
```

### 3. Ratehawk Integration

Make sure you have the Ratehawk functions available. Create a `lib/ratehawk.js` file with your Ratehawk implementation:

```javascript
// lib/ratehawk.js
export async function searchMulticomplete(params) {
  // Your Ratehawk implementation
}

export async function searchSerpRegion(params) {
  // Your Ratehawk implementation
}
```

### 4. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### DynamoDB Endpoints

#### GET /hotels
Get all hotels with pagination
- Query params: `page`, `lastKey`
- Response: Paginated hotel list

#### GET /hotels/search
Search hotels by name
- Query params: `name`
- Response: Filtered hotel list

#### GET /hotels/location
Filter hotels by region
- Query params: `region`
- Response: Filtered hotel list

### Ratehawk Endpoints

#### POST /ratehawk/suggest
Get location suggestions
- Body: `{ query, language, limit }`
- Response: Regions and hotels suggestions

#### POST /ratehawk/search
Search hotels
- Body: `{ checkin, checkout, residency, language, guests, currency, region_id }`
- Response: Hotel search results

### TBO Endpoints

#### POST /tbo/suggest
Get TBO location suggestions
- Body: `{ query, country_code }`
- Response: City suggestions

#### POST /tbo/hotel-codes
Get hotel codes for a city
- Body: `{ CityCode, IsDetailedResponse }`
- Response: Hotel codes with details

#### POST /tbo/search
Search TBO hotels
- Body: `{ tbo_city_code, CheckIn, CheckOut, CountryCode, guests }`
- Response: Hotel search results

### Combined Search

#### POST /search/hotels
Search both Ratehawk and TBO
- Body: `{ checkin, checkout, residency, language, guests, currency, region_id, tbo_city_code, country_code }`
- Response: Combined results from both providers

### Health Check

#### GET /health
Server health status
- Response: Server status and service availability

## Usage Examples

### Search Hotels (Combined)

```bash
curl -X POST http://localhost:2314/search/hotels \
  -H "Content-Type: application/json" \
  -d '{
    "checkin": "2025-12-01",
    "checkout": "2025-12-05",
    "region_id": "965847972",
    "tbo_city_code": "100765",
    "country_code": "AE"
  }'
```

### Get Ratehawk Suggestions

```bash
curl -X POST http://localhost:2314/ratehawk/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Dubai",
    "language": "en",
    "limit": 10
  }'
```

### Get TBO Suggestions

```bash
curl -X POST http://localhost:2314/tbo/suggest \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Abu Dhabi",
    "country_code": "AE"
  }'
```

### Search DynamoDB Hotels

```bash
curl "http://localhost:2314/hotels/search?name=Marriott"
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Logging

The server provides comprehensive logging for:
- Request/response details
- API errors
- Hotel code resolution
- Date validation
- Service availability

## Development

### File Structure

```
hotels-server.js          # Main server file
lib/
  ratehawk.js            # Ratehawk integration functions
hotels.env               # Environment variables template
package-hotels.json      # Package configuration
HOTELS_SERVER_README.md  # This file
```

### Adding New Providers

To add a new hotel provider:

1. Create provider-specific functions
2. Add endpoints in the server
3. Update the combined search endpoint
4. Add provider configuration to environment

## Production Deployment

1. Set up proper environment variables
2. Configure AWS credentials
3. Set up monitoring and logging
4. Configure load balancing if needed
5. Set up health checks

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS credentials are properly configured
2. **Ratehawk API**: Verify API key and base URL
3. **TBO Credentials**: Check username and password
4. **CORS**: Ensure CORS is properly configured for your frontend
5. **Date Format**: Ensure dates are in YYYY-MM-DD format

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment.
