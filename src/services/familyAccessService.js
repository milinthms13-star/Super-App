import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const API_URL = `${API_BASE_URL}/family`;

/**
 * FamilyAccessService
 * Frontend service for family access management
 */
class FamilyAccessService {
  /**
   * Create a new family group
   */
  static async createFamilyGroup(familyName, memberIds = [], accessPermissions = {}) {
    try {
      const response = await axios.post(`${API_URL}/create`, {
        familyName,
        memberIds,
        accessPermissions,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating family group:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get all families for the logged-in user
   */
  static async getUserFamilies() {
    try {
      const response = await axios.get(`${API_URL}/list`);
      return response.data.families;
    } catch (error) {
      console.error('Error fetching user families:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get specific family group details
   */
  static async getFamilyGroup(groupId) {
    try {
      const response = await axios.get(`${API_URL}/${groupId}`);
      return response.data.family;
    } catch (error) {
      console.error('Error fetching family group:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Add a member to family group
   */
  static async addFamilyMember(groupId, memberId, relationship = 'other') {
    try {
      const response = await axios.post(`${API_URL}/${groupId}/members`, {
        memberId,
        relationship,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding family member:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Remove a member from family group
   */
  static async removeFamilyMember(groupId, memberId) {
    try {
      const response = await axios.delete(`${API_URL}/${groupId}/members/${memberId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing family member:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Update access permissions
   */
  static async updateAccessPermissions(groupId, permissions) {
    try {
      const response = await axios.patch(`${API_URL}/${groupId}/permissions`, permissions);
      return response.data;
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Disable auto-access for a member
   */
  static async disableAutoAccessForMember(groupId, memberId) {
    try {
      const response = await axios.patch(
        `${API_URL}/${groupId}/members/${memberId}/disable-access`
      );
      return response.data;
    } catch (error) {
      console.error('Error disabling auto-access:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Check location access to another user
   */
  static async checkLocationAccess(targetUserId) {
    try {
      const response = await axios.get(`${API_URL}/access/location/${targetUserId}`);
      return response.data.accessResult;
    } catch (error) {
      console.error('Error checking location access:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Check camera access to another user
   */
  static async checkCameraAccess(targetUserId) {
    try {
      const response = await axios.get(`${API_URL}/access/camera/${targetUserId}`);
      return response.data.accessResult;
    } catch (error) {
      console.error('Error checking camera access:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get family members with location access
   */
  static async getFamilyMembersWithLocationAccess() {
    try {
      const response = await axios.get(`${API_URL}/members/location-access`);
      return response.data.members;
    } catch (error) {
      console.error('Error fetching family members with location access:', error);
      throw error.response?.data || error;
    }
  }

  /**
   * Get family members with camera access
   */
  static async getFamilyMembersWithCameraAccess() {
    try {
      const response = await axios.get(`${API_URL}/members/camera-access`);
      return response.data.members;
    } catch (error) {
      console.error('Error fetching family members with camera access:', error);
      throw error.response?.data || error;
    }
  }
}

export default FamilyAccessService;
