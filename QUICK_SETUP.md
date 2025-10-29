# Quick Setup Guide - Hotels Server

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install express cors dotenv @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb nodemon
```

### 2. Setup Environment
```bash
cp hotels.env .env
# Edit .env with your actual credentials
```

### 3. Create Ratehawk Integration
```bash
mkdir -p lib
# Create lib/ratehawk.js with your Ratehawk functions
```

### 4. Start Server
```bash
# Option 1: Use startup script
./start-hotels-server.sh

# Option 2: Direct start
node hotels-server.js

# Option 3: Development mode
npx nodemon hotels-server.js
```

## 📋 Required Files

1. **hotels-server.js** - Main server file ✅
2. **lib/ratehawk.js** - Your Ratehawk implementation (create this)
3. **.env** - Environment variables (copy from hotels.env)
4. **package.json** - Dependencies (use package-hotels.json as reference)

## 🔧 Environment Variables

```env
PORT=2314
AWS_REGION=eu-north-1
DYNAMO_TABLE=partner_feed_hotels_imported
TBO_USERNAME=Revieratravel
TBO_PASSWORD=Rev@79868189
RATEHAWK_API_KEY=your_key_here
```

## 🧪 Test the Server

```bash
# Test health check
curl http://localhost:2314/health

# Test combined search
curl -X POST http://localhost:2314/search/hotels \
  -H "Content-Type: application/json" \
  -d '{"checkin":"2025-12-01","checkout":"2025-12-05","tbo_city_code":"100765"}'
```

## 📚 Full Documentation

See `HOTELS_SERVER_README.md` for complete documentation.

## 🆘 Troubleshooting

1. **Port 2314 in use**: Change PORT in .env
2. **AWS credentials**: Set up AWS CLI or environment variables
3. **Ratehawk errors**: Check lib/ratehawk.js implementation
4. **TBO errors**: Verify TBO credentials in .env
