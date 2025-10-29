const express = require('express');
const router = express.Router();
const DuffleClient = require('../lib/duffle');

const duffle = new DuffleClient();

// Search flights
router.post('/search', async (req, res) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      passengers = [{ type: 'adult' }],
      cabinClass = 'economy',
      maxConnections = 2
    } = req.body;

    // Validate required parameters
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        error: 'Origin, destination, and departure date are required'
      });
    }

    // Build slices array
    const slices = [
      {
        origin,
        destination,
        departure_date: departureDate
      }
    ];

    // Add return flight if return date is provided
    if (returnDate) {
      slices.push({
        origin: destination,
        destination: origin,
        departure_date: returnDate
      });
    }

    const searchParams = {
      slices,
      passengers,
      cabin_class: cabinClass,
      max_connections: maxConnections
    };

    const result = await duffle.searchFlights(searchParams);

    if (result.success) {
      // Transform offers to a more frontend-friendly format
      const transformedOffers = result.offers.map(offer => ({
        id: offer.id,
        totalAmount: offer.total_amount,
        totalCurrency: offer.total_currency,
        slices: offer.slices.map(slice => ({
          origin: slice.origin,
          destination: slice.destination,
          segments: slice.segments.map(segment => ({
            id: segment.id,
            origin: segment.origin,
            destination: segment.destination,
            departureTime: segment.departing_at,
            arrivalTime: segment.arriving_at,
            duration: segment.duration,
            aircraft: segment.aircraft,
            airline: segment.marketing_carrier,
            flightNumber: segment.marketing_carrier_flight_number,
            cabinClass: segment.cabin_class,
            passengerIdentityDocumentsRequired: segment.passenger_identity_documents_required
          }))
        })),
        passengers: offer.passengers.map(passenger => ({
          id: passenger.id,
          type: passenger.type,
          givenName: passenger.given_name,
          familyName: passenger.family_name,
          age: passenger.age
        })),
        owner: offer.owner,
        expiresAt: offer.expires_at,
        createdAt: offer.created_at
      }));

      res.json({
        success: true,
        data: {
          offerRequestId: result.offerRequestId,
          offers: transformedOffers,
          slices: result.slices
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Flights API] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get offer details
router.get('/offers/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const result = await duffle.getOfferDetails(offerId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.offer
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Flights API] Get offer details error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search airports
router.get('/airports', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const result = await duffle.searchAirports(query);
    
    if (result.success) {
      // Transform airports to a more frontend-friendly format
      const transformedAirports = result.airports.map(airport => ({
        id: airport.id,
        name: airport.name,
        city: airport.city_name,
        country: airport.country_name,
        iataCode: airport.iata_code,
        icaoCode: airport.icao_code,
        latitude: airport.latitude,
        longitude: airport.longitude,
        timeZone: airport.time_zone
      }));

      res.json({
        success: true,
        data: transformedAirports
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Flights API] Airport search error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get airline information
router.get('/airlines/:airlineId', async (req, res) => {
  try {
    const { airlineId } = req.params;
    
    const result = await duffle.getAirline(airlineId);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.airline
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Flights API] Get airline error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;

