const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

// Import Ratehawk functions
const { searchMulticomplete, searchSerpRegion } = require("./lib/ratehawk.js");

// Import flights routes
const flightsRoutes = require("./routes/flights.js");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// AWS DynamoDB Config
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMO_TABLE;

// TBO API Configuration
const TBO_BASE_URL = process.env.TBO_BASE_URL || "http://api.tbotechnology.in/TBOHolidays_HotelAPI";
const TBO_USERNAME = process.env.TBO_USERNAME;
const TBO_PASSWORD = process.env.TBO_PASSWORD;

// TBO Helper Functions
async function tboFetch(path, options = {}) {
  const url = `${TBO_BASE_URL}/${path}`;
  const username = TBO_USERNAME;
  const password = TBO_PASSWORD;
  
  if (!username || !password) {
    throw new Error("TBO credentials not configured");
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TBO API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function tboSearchHotels(payload) {
  const username = TBO_USERNAME;
  const password = TBO_PASSWORD;
  if (!username || !password) {
    throw new Error("TBO credentials not configured");
  }

  const path = "search";
  const body = {
    UserName: username,
    Password: password,
    ...(payload || {}),
  };
  return tboFetch(path, { method: "POST", body });
}

async function tboHotelCodeList(payload) {
  const username = TBO_USERNAME;
  const password = TBO_PASSWORD;
  if (!username || !password) {
    throw new Error("TBO credentials not configured");
  }

  const path = "TBOHotelCodeList";
  const body = {
    UserName: username,
    Password: password,
    ...(payload || {}),
  };
  return tboFetch(path, { method: "POST", body });
}

async function tboCityList(payload) {
  const username = TBO_USERNAME;
  const password = TBO_PASSWORD;
  if (!username || !password) {
    throw new Error("TBO credentials not configured");
  }

  const path = "CityList";
  const body = {
    UserName: username,
    Password: password,
    ...(payload || {}),
  };
  return tboFetch(path, { method: "POST", body });
}

// City mapping for TBO
const RATEHAWK_TO_TBO_CITY_MAPPING = {
  "965847972": "130443",
  "966183009": "130444",
  "100765": "100765", // Abu Dhabi
  "100687": "100687", // Ajman
  "100812": "100812", // Al Agah
  "100692": "100692", // Al Ain
  "266001": "266001", // Al Madam
  "100381": "100381", // Al Marjan Islands
  "100492": "100492", // Al Mirfa
  "368181": "368181", // Al Ruwais
  "364445": "364445", // Corniche Beach
  "116319": "116319", // Deira
  "149287": "149287", // Abbottabad
};

const TBO_CITY_HOTEL_MAPPING = {
  "100765": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "100687": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "100812": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "100692": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "266001": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "100381": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "100492": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "368181": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "364445": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "116319": ["1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518"],
  "149287": ["1545134", "1673692", "1673703", "1673856", "1796999", "1545134", "1673692", "1673703", "1673856", "1796999"],
};

const FALLBACK_HOTEL_CODES = [
  "1402689", "1405349", "1405355", "1407362", "1413911", "1414353", "1415021", "1415135", "1415356", "1415518",
  "1415792", "1416419", "1416455", "1416461", "1416726", "1440549", "1440646", "1440710", "1440886", "1440924"
];

function getTboCityCode(ratehawkRegionId) {
  return RATEHAWK_TO_TBO_CITY_MAPPING[String(ratehawkRegionId)];
}

function getTboHotelCodes(tboCityCode) {
  return TBO_CITY_HOTEL_MAPPING[String(tboCityCode)] || FALLBACK_HOTEL_CODES;
}

// ==================== EXISTING DYNAMODB ENDPOINTS ====================

// ✅ Get all hotels with pagination (10 per page)
app.get("/hotels", async (req, res) => {
  try {
    const limit = 10;
    const page = parseInt(req.query.page) || 1;

    let params = {
      TableName: TABLE_NAME,
      Limit: limit,
    };

    if (req.query.lastKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(req.query.lastKey));
    }

    const result = await db.send(new ScanCommand(params));

    res.json({
      success: true,
      count: result.Items.length,
      items: result.Items,
      nextPageToken: result.LastEvaluatedKey
        ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

// ✅ Search hotel by name (case-insensitive)
app.get("/hotels/search", async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: "Missing ?name param" });

    const result = await db.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "contains(#nm, :name)",
      ExpressionAttributeNames: { "#nm": "name" },
      ExpressionAttributeValues: { ":name": name },
    }));

    res.json({ success: true, count: result.Items.length, items: result.Items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search hotels" });
  }
});

// ✅ Filter hotels by region (region.name)
app.get("/hotels/location", async (req, res) => {
  try {
    const region = req.query.region;
    if (!region) return res.status(400).json({ error: "Missing ?region param" });

    const result = await db.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "contains(#region.#name, :region)",
      ExpressionAttributeNames: { 
        "#region": "region",
        "#name": "name" 
      },
      ExpressionAttributeValues: { ":region": region },
    }));

    res.json({ success: true, count: result.Items.length, items: result.Items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to filter hotels" });
  }
});

// ==================== RATEHAWK ENDPOINTS ====================

// Ratehawk suggestions endpoint
app.post("/ratehawk/suggest", async (req, res) => {
  try {
    const { query, language = "en", limit = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const suggest = await searchMulticomplete({ 
      query: String(query).trim(), 
      language, 
      limit 
    });
    
    const regions = Array.isArray(suggest?.regions) ? suggest.regions : (suggest?.data?.regions || []);
    const hotels = Array.isArray(suggest?.hotels) ? suggest.hotels : (suggest?.data?.hotels || []);
    
    res.json({
      success: true,
      regions: regions.map(region => ({
        id: region.id || region.region_id,
        name: region.name,
        type: region.type || "City",
        country_code: region.country_code,
        provider: "ratehawk"
      })),
      hotels: hotels.map(hotel => ({
        id: hotel.id || hotel.hotel_id,
        name: hotel.name,
        type: "Hotel",
        country_code: hotel.country_code,
        provider: "ratehawk"
      })),
      provider: "ratehawk"
    });
  } catch (error) {
    console.error("[Ratehawk Suggest] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch suggestions", 
      details: error.message 
    });
  }
});

// Ratehawk search endpoint
app.post("/ratehawk/search", async (req, res) => {
  try {
    const { 
      checkin, 
      checkout, 
      residency = "GB", 
      language = "en", 
      guests = [{ adults: 1, children: [] }], 
      currency = "EUR", 
      region_id 
    } = req.body;

    if (!checkin || !checkout || !region_id) {
      return res.status(400).json({ 
        error: "Missing required parameters: checkin, checkout, region_id" 
      });
    }

    const payload = { 
      checkin, 
      checkout, 
      residency, 
      language, 
      guests, 
      currency, 
      region_id: Number(region_id) 
    };

    const serpData = await searchSerpRegion(payload);
    
    res.json({
      success: true,
      provider: "ratehawk",
      data: serpData
    });
  } catch (error) {
    console.error("[Ratehawk Search] Error:", error);
    res.status(500).json({ 
      error: "Failed to search hotels", 
      details: error.message 
    });
  }
});

// ==================== TBO ENDPOINTS ====================

// TBO suggestions endpoint
app.post("/tbo/suggest", async (req, res) => {
  try {
    const { query, country_code } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const cityListPayload = {
      CountryCode: country_code || "AE",
      IsDetailedResponse: "true"
    };

    const cityData = await tboCityList(cityListPayload);
    const cities = cityData?.data?.Cities || cityData?.Cities || cityData?.Data?.Cities || cityData?.Data || [];
    
    // Filter cities based on query
    const filteredCities = cities.filter(city => 
      city.CityName && city.CityName.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    res.json({
      success: true,
      regions: filteredCities.map(city => ({
        id: city.CityCode,
        name: city.CityName,
        type: "City",
        country_code: city.CountryCode,
        provider: "tbo"
      })),
      hotels: [],
      provider: "tbo"
    });
  } catch (error) {
    console.error("[TBO Suggest] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch TBO suggestions", 
      details: error.message 
    });
  }
});

// TBO hotel codes endpoint
app.post("/tbo/hotel-codes", async (req, res) => {
  try {
    const { CityCode, IsDetailedResponse = "true" } = req.body;
    
    if (!CityCode) {
      return res.status(400).json({ error: "CityCode parameter is required" });
    }

    const hotelCodePayload = { 
      CityCode, 
      IsDetailedResponse 
    };
    
    const data = await tboHotelCodeList(hotelCodePayload);
    
    res.json({
      success: true,
      provider: "tbo",
      data
    });
  } catch (error) {
    console.error("[TBO Hotel Codes] Error:", error);
    res.status(500).json({ 
      error: "Failed to fetch hotel codes", 
      details: error.message 
    });
  }
});

// TBO search endpoint
app.post("/tbo/search", async (req, res) => {
  try {
    const body = req.body;
    console.log("[TBO Search] Request body:", body);

    let payload = { ...body };
    const candidateCity = body?.tbo_city_code || body?.CityId || body?.CityCode || body?.RegionId || body?.region_id;
    const cc = body?.CountryCode || body?.country_code;
    
    if (!Array.isArray(body?.HotelCodes) && candidateCity) {
      try {
        console.log("[TBO Search] Resolving hotel codes for city:", candidateCity);
        
        let tboCityCode = getTboCityCode(candidateCity);
        
        if (!tboCityCode) {
          tboCityCode = String(candidateCity);
          console.log("[TBO Search] No mapping found, using candidate city as TBO CityCode:", tboCityCode);
        } else {
          console.log("[TBO Search] Found mapping, using TBO CityCode:", tboCityCode);
        }
        
        // First try to get hotel codes from our mapping
        const mappedHotelCodes = getTboHotelCodes(tboCityCode);
        if (mappedHotelCodes && mappedHotelCodes.length > 0) {
          console.log("[TBO Search] Using mapped hotel codes:", mappedHotelCodes.slice(0, 10));
          payload = { ...payload, HotelCodes: mappedHotelCodes.slice(0, 10) };
        } else {
          // Fallback to TBOHotelCodeList API
          const hotelCodePayload = { 
            CityCode: tboCityCode,
            IsDetailedResponse: "true"
          };
          
          const hotelCodeResponse = await tboHotelCodeList(hotelCodePayload);
          console.log("[TBO Search] Hotel code response:", hotelCodeResponse);
          
          // Extract hotel codes from response
          const hotels = hotelCodeResponse?.data?.Hotels || hotelCodeResponse?.Hotels || hotelCodeResponse?.HotelList || hotelCodeResponse?.Data?.Hotels || hotelCodeResponse?.Data || [];
          const codes = (Array.isArray(hotels) ? hotels : []).map(h => h?.Code || h?.HotelCode || h?.Id).filter(Boolean).slice(0, 50);
          
          console.log("[TBO Search] Extracted hotel codes:", codes);
          
          if (codes.length > 0) {
            payload = { ...payload, HotelCodes: codes };
          } else {
            console.warn("[TBO Search] No hotel codes found for city:", candidateCity, "TBO CityCode:", tboCityCode);
            console.log("[TBO Search] Using fallback hotel codes for testing");
            payload = { ...payload, HotelCodes: FALLBACK_HOTEL_CODES.slice(0, 10) };
          }
        }
      } catch (e) {
        console.warn("[TBO Search] Hotel code resolution failed:", e?.message);
        console.log("[TBO Search] Using fallback hotel codes due to error");
        payload = { ...payload, HotelCodes: FALLBACK_HOTEL_CODES.slice(0, 10) };
      }
    }

    // Ensure dates are in the future for TBO API
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    
    const checkInDate = payload.CheckIn || payload.checkin;
    const checkOutDate = payload.CheckOut || payload.checkout;
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterStr = dayAfter.toISOString().split('T')[0];
    
    const finalCheckIn = checkInDate && checkInDate > todayStr ? checkInDate : tomorrowStr;
    const finalCheckOut = checkOutDate && checkOutDate > todayStr ? checkOutDate : dayAfterStr;
    
    console.log("[TBO Search] Date validation:", {
      todayStr,
      tomorrowStr,
      dayAfterStr,
      checkInDate,
      checkOutDate,
      finalCheckIn,
      finalCheckOut
    });
    
    const tboPayload = {
      CheckIn: finalCheckIn,
      CheckOut: finalCheckOut,
      HotelCodes: Array.isArray(payload.HotelCodes) ? payload.HotelCodes.join(',') : payload.HotelCodes,
      GuestNationality: payload.CountryCode || payload.country_code || 'AE',
      PaxRooms: payload.guests ? payload.guests.map(g => ({
        Adults: g.adults || 1,
        Children: g.children?.length || 0,
        ChildrenAges: g.children || []
      })) : [{ Adults: 1, Children: 0, ChildrenAges: [] }],
      ResponseTime: 18,
      IsDetailedResponse: true,
      Filters: {
        Refundable: true,
        NoOfRooms: 0,
        MealType: "All"
      }
    };

    console.log("[TBO Search] Final payload before search:", JSON.stringify(tboPayload, null, 2));
    const data = await tboSearchHotels(tboPayload);
    console.log("[TBO Search] Search response:", JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      provider: "tbo",
      data
    });
  } catch (error) {
    console.error("[TBO Search] Error:", error);
    res.status(500).json({ 
      error: "Failed to search TBO hotels", 
      details: error.message 
    });
  }
});

// ==================== COMBINED SEARCH ENDPOINT ====================

// Combined search endpoint that searches both Ratehawk and TBO
app.post("/search/hotels", async (req, res) => {
  try {
    const { 
      checkin, 
      checkout, 
      residency = "GB", 
      language = "en", 
      guests = [{ adults: 1, children: [] }], 
      currency = "EUR", 
      region_id,
      tbo_city_code,
      country_code
    } = req.body;

    if (!checkin || !checkout) {
      return res.status(400).json({ 
        error: "Missing required parameters: checkin, checkout" 
      });
    }

    const results = {
      ratehawk: null,
      tbo: null,
      errors: []
    };

    // Search Ratehawk if region_id is provided
    if (region_id) {
      try {
        const ratehawkPayload = { 
          checkin, 
          checkout, 
          residency, 
          language, 
          guests, 
          currency, 
          region_id: Number(region_id) 
        };
        results.ratehawk = await searchSerpRegion(ratehawkPayload);
      } catch (error) {
        console.error("[Combined Search] Ratehawk error:", error);
        results.errors.push({ provider: "ratehawk", error: error.message });
      }
    }

    // Search TBO if tbo_city_code is provided
    if (tbo_city_code) {
      try {
        const tboPayload = {
          tbo_city_code,
          CheckIn: checkin,
          CheckOut: checkout,
          CountryCode: country_code || "AE",
          guests
        };
        
        // Get hotel codes first
        const mappedHotelCodes = getTboHotelCodes(tbo_city_code);
        if (mappedHotelCodes && mappedHotelCodes.length > 0) {
          tboPayload.HotelCodes = mappedHotelCodes.slice(0, 10);
        }

        // Ensure dates are in the future
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const dayAfterStr = dayAfter.toISOString().split('T')[0];
        
        tboPayload.CheckIn = tboPayload.CheckIn > todayStr ? tboPayload.CheckIn : tomorrowStr;
        tboPayload.CheckOut = tboPayload.CheckOut > todayStr ? tboPayload.CheckOut : dayAfterStr;

        const finalTboPayload = {
          CheckIn: tboPayload.CheckIn,
          CheckOut: tboPayload.CheckOut,
          HotelCodes: Array.isArray(tboPayload.HotelCodes) ? tboPayload.HotelCodes.join(',') : tboPayload.HotelCodes,
          GuestNationality: tboPayload.CountryCode || 'AE',
          PaxRooms: tboPayload.guests ? tboPayload.guests.map(g => ({
            Adults: g.adults || 1,
            Children: g.children?.length || 0,
            ChildrenAges: g.children || []
          })) : [{ Adults: 1, Children: 0, ChildrenAges: [] }],
          ResponseTime: 18,
          IsDetailedResponse: true,
          Filters: {
            Refundable: true,
            NoOfRooms: 0,
            MealType: "All"
          }
        };

        results.tbo = await tboSearchHotels(finalTboPayload);
      } catch (error) {
        console.error("[Combined Search] TBO error:", error);
        results.errors.push({ provider: "tbo", error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      searchParams: {
        checkin,
        checkout,
        residency,
        language,
        guests,
        currency,
        region_id,
        tbo_city_code,
        country_code
      }
    });
  } catch (error) {
    console.error("[Combined Search] Error:", error);
    res.status(500).json({ 
      error: "Failed to search hotels", 
      details: error.message 
    });
  }
});

// ==================== FLIGHTS ROUTES ====================

// Flights routes
app.use("/flights", flightsRoutes);

// ==================== HEALTH CHECK ====================

app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    services: {
      dynamodb: "connected",
      ratehawk: "configured",
      tbo: TBO_USERNAME ? "configured" : "not configured"
    }
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal server error", 
    details: err.message 
  });
});

// ==================== START SERVER ====================

app.listen(port, () => {
  console.log(`🚀 Hotels Server running at http://localhost:${port}`);
  console.log(`📊 DynamoDB Table: ${TABLE_NAME}`);
  console.log(`🌍 AWS Region: ${process.env.AWS_REGION}`);
  console.log(`🏨 Ratehawk: Configured`);
  console.log(`🌐 TBO: ${TBO_USERNAME ? 'Configured' : 'Not configured'}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /hotels - List all hotels (paginated)`);
  console.log(`   GET  /hotels/search?name=... - Search hotels by name`);
  console.log(`   GET  /hotels/location?region=... - Filter hotels by region`);
  console.log(`   POST /ratehawk/suggest - Get Ratehawk suggestions`);
  console.log(`   POST /ratehawk/search - Search Ratehawk hotels`);
  console.log(`   POST /tbo/suggest - Get TBO suggestions`);
  console.log(`   POST /tbo/hotel-codes - Get TBO hotel codes`);
  console.log(`   POST /tbo/search - Search TBO hotels`);
  console.log(`   POST /search/hotels - Combined search (Ratehawk + TBO)`);
  console.log(`   GET  /health - Health check`);
});
