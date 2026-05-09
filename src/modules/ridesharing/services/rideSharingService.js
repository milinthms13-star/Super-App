import axios from 'axios';

const API_BASE = '/api/ridesharing';

class RideSharingService {
  /**
   * Send OTP to phone number
   */
  static async sendOTP(phone) {
    try {
      const response = await axios.post(`${API_BASE}/auth/otp-send`, { phone });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send OTP' };
    }
  }

  /**
   * Verify OTP and get authentication tokens
   */
  static async verifyOTP(phone, otp, userType = 'rider') {
    try {
      const response = await axios.post(`${API_BASE}/auth/otp-verify`, {
        phone,
        otp,
        role: userType
      });
      
      // Store tokens
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
      }
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'OTP verification failed' };
    }
  }

  /**
   * Get user profile
   */
  static async getProfile() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch profile' };
    }
  }

  /**
   * Estimate fare for a ride
   */
  static async estimateFare(rideType, pickup, destination) {
    try {
      const response = await axios.post(`${API_BASE}/estimate-fare`, {
        rideType,
        pickup,
        destination
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to estimate fare' };
    }
  }

  /**
   * Book a ride
   */
  static async bookRide(rideData) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/rides`, rideData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to book ride' };
    }
  }

  /**
   * Get ride details
   */
  static async getRideDetails(rideId) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/rides/${rideId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch ride details' };
    }
  }

  /**
   * Cancel a ride
   */
  static async cancelRide(rideId, reason = '') {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/rides/${rideId}/cancel`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to cancel ride' };
    }
  }

  /**
   * Get nearby drivers
   */
  static async getNearbyDrivers(lat, lng, radius = 5) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${API_BASE}/drivers/nearby`,
        {
          params: { lat, lng, radius },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch nearby drivers' };
    }
  }

  /**
   * Accept a ride (for drivers)
   */
  static async acceptRide(rideId) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE}/rides/${rideId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to accept ride' };
    }
  }

  /**
   * Update driver location
   */
  static async updateDriverLocation(lat, lng) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/driver/location`,
        { lat, lng },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update location' };
    }
  }

  /**
   * Complete a ride
   */
  static async completeRide(rideId, endLocation) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/rides/${rideId}/complete`,
        { endLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to complete ride' };
    }
  }

  /**
   * Rate a ride or driver
   */
  static async rateRide(rideId, rating, comment = '') {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE}/rides/${rideId}/rate`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to submit rating' };
    }
  }

  /**
   * Get ride history
   */
  static async getRideHistory(limit = 10, offset = 0) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${API_BASE}/rides/history`,
        {
          params: { limit, offset },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch ride history' };
    }
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const response = await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken
      });

      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
      }

      return response.data;
    } catch (error) {
      // Clear tokens on refresh failure
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  }

  /**
   * Logout
   */
  static async logout() {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
}

export default RideSharingService;
