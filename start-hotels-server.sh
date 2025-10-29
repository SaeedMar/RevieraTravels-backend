#!/bin/bash

# Hotels Server Startup Script

echo "🚀 Starting Hotels Server..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📋 .env file not found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env from env.example"
        echo "⚠️  Please update .env with your actual credentials before running again"
    else
        echo "❌ env.example not found. Please create .env manually with your credentials."
    fi
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if lib/ratehawk.js exists
if [ ! -f "lib/ratehawk.js" ]; then
    echo "⚠️  lib/ratehawk.js not found. Please implement your Ratehawk functions."
    echo "   See lib/ratehawk.js for placeholder functions."
    exit 1
fi

echo "🏨 Starting Hotels Server on port 2314..."
echo "📊 DynamoDB Table: partner_feed_hotels_imported"
echo "🌍 AWS Region: eu-north-1"
echo "🌐 TBO: Configured"
echo ""
echo "📋 Available endpoints:"
echo "   GET  /hotels - List all hotels (paginated)"
echo "   GET  /hotels/search?name=... - Search hotels by name"
echo "   GET  /hotels/location?region=... - Filter hotels by region"
echo "   POST /ratehawk/suggest - Get Ratehawk suggestions"
echo "   POST /ratehawk/search - Search Ratehawk hotels"
echo "   POST /tbo/suggest - Get TBO suggestions"
echo "   POST /tbo/hotel-codes - Get TBO hotel codes"
echo "   POST /tbo/search - Search TBO hotels"
echo "   POST /search/hotels - Combined search (Ratehawk + TBO)"
echo "   GET  /health - Health check"
echo ""

# Start the server
node hotels-server.js
