/**
 * Driver Service for Ride Sharing
 * Handles driver-specific operations like KYC, earnings, ratings, etc.
 */

import axios from 'axios';

const API_BASE = '/api/ridesharing/driver';

class DriverService {
  /**
   * Upload KYC document
   */
  static async uploadDocument(file, documentType) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/kyc-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Document upload failed' };
    }
  }

  /**
   * Submit KYC documents for verification
   */
  static async submitKYC(documents) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE}/kyc-submit`,
        { documents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'KYC submission failed' };
    }
  }

  /**
   * Get KYC status
   */
  static async getKYCStatus() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/kyc-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch KYC status' };
    }
  }

  /**
   * Get verification summary
   */
  static async getVerificationSummary() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/verification-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch verification summary' };
    }
  }

  /**
   * Update driver profile
   */
  static async updateProfile(profileData) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(`${API_BASE}/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update profile' };
    }
  }

  /**
   * Update vehicle information
   */
  static async updateVehicleInfo(vehicleData) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/vehicle-info`,
        vehicleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update vehicle info' };
    }
  }

  /**
   * Go online/offline
   */
  static async setOnlineStatus(isOnline) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/status`,
        { isOnline },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update status' };
    }
  }

  /**
   * Get driver earnings
   */
  static async getEarnings(period = 'today') {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/earnings`, {
        params: { period },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch earnings' };
    }
  }

  /**
   * Get driver statistics
   */
  static async getStatistics() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch statistics' };
    }
  }

  /**
   * Get available rides (driver)
   */
  static async getAvailableRides() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/available-rides`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch available rides' };
    }
  }

  /**
   * Get completed rides (for driver)
   */
  static async getCompletedRides(limit = 10, offset = 0) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/completed-rides`, {
        params: { limit, offset },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch completed rides' };
    }
  }

  /**
   * Get driver ratings and reviews
   */
  static async getRatings() {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/ratings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch ratings' };
    }
  }

  /**
   * Update bank account information
   */
  static async updateBankInfo(bankData) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(
        `${API_BASE}/bank-info`,
        bankData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update bank info' };
    }
  }

  /**
   * Request withdrawal
   */
  static async requestWithdrawal(amount) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE}/withdraw`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Withdrawal request failed' };
    }
  }

  /**
   * Get withdrawal history
   */
  static async getWithdrawalHistory(limit = 10, offset = 0) {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/withdrawals`, {
        params: { limit, offset },
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch withdrawal history' };
    }
  }
}

export default DriverService;
