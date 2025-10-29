const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class DuffleClient {
  constructor() {
    this.baseURL = 'https://api.duffel.com';
    this.token = process.env.DUFFLE_API_TOKEN;
    console.log('[Duffle] Token loaded:', this.token ? 'Yes' : 'No');
    console.log('[Duffle] Token length:', this.token ? this.token.length : 0);
    console.log('[Duffle] Token value:', this.token);
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Duffel-Version': 'v2'
      }
    });
  }

  // Search for flights
  async searchFlights(searchParams) {
    try {
      console.log('[Duffle] Searching flights with params:', searchParams);
      
      // Transform the search parameters to match Duffle API format
      const dufflePayload = {
        data: {
          slices: searchParams.slices.map(slice => ({
            origin: slice.origin,
            destination: slice.destination,
            departure_date: slice.departure_date
          })),
          passengers: searchParams.passengers.map(passenger => ({
            type: passenger.type
          })),
          cabin_class: searchParams.cabin_class || 'economy',
          max_connections: searchParams.max_connections || 2
        }
      };
      
      console.log('[Duffle] Transformed payload:', JSON.stringify(dufflePayload, null, 2));
      
      const offerRequest = await this.client.post('/air/offer_requests', dufflePayload);

      console.log('[Duffle] Offer request created:', offerRequest.data.data.id);
      
      // Get offers for the request
      const offers = await this.client.get(`/air/offers?offer_request_id=${offerRequest.data.data.id}&limit=50`);
      
      return {
        success: true,
        offerRequestId: offerRequest.data.data.id,
        offers: offers.data.data,
        slices: offerRequest.data.data.slices
      };
    } catch (error) {
      console.error('[Duffle] Flight search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message || 'Flight search failed'
      };
    }
  }


  // Get offer details
  async getOfferDetails(offerId) {
    try {
      const response = await this.client.get(`/air/offers/${offerId}`);
      return {
        success: true,
        offer: response.data.data
      };
    } catch (error) {
      console.error('[Duffle] Get offer details error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message || 'Failed to get offer details'
      };
    }
  }

  // Search airports
  async searchAirports(query) {
    try {
      console.log('[Duffle] Searching airports with query:', query);
      
      // Use the correct Duffle API endpoint for airports
      const response = await this.client.get(`/air/airports?name=${encodeURIComponent(query)}`);
      console.log('[Duffle] Airport search response:', response.data);
      
      return {
        success: true,
        airports: response.data.data || response.data
      };
    } catch (error) {
      console.error('[Duffle] Airport search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message || 'Airport search failed'
      };
    }
  }


  // Get airline information
  async getAirline(airlineId) {
    try {
      const response = await this.client.get(`/air/airlines/${airlineId}`);
      return {
        success: true,
        airline: response.data.data
      };
    } catch (error) {
      console.error('[Duffle] Get airline error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message || 'Failed to get airline info'
      };
    }
  }
}

module.exports = DuffleClient;

