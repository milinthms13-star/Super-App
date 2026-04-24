import { useCallback, useState } from 'react';
import {
  triggerVoiceCall,
  getVoiceCallStatus,
  createVoiceCallReminder
} from '../../../services/remindersService';
import { formatErrorForUser } from '../../../services/errors';

/**
 * Custom hook for managing voice call reminders
 * Handles voice call triggers, status tracking, and error management
 * 
 * @hook
 * @returns {Object} Voice call management interface
 * @returns {Object} returns.callStatus - Current voice call status
 * @returns {boolean} returns.loading - Loading indicator
 * @returns {Object} returns.error - Error object or null
 * @returns {function} returns.trigger - Trigger a voice call for a reminder
 * @returns {function} returns.getStatus - Get current status of a voice call
 * @returns {function} returns.createWithCall - Create a reminder with voice call
 * @returns {function} returns.clearError - Clear error state
 * 
 * @example
 * const { trigger, getStatus, loading, error } = useVoiceCall();
 * 
 * // Trigger a voice call
 * try {
 *   await trigger(reminderId);
 *   console.log('Voice call triggered');
 * } catch (err) {
 *   console.error(err.message);
 * }
 * 
 * // Check status
 * const status = await getStatus(reminderId);
 * console.log(status.callStatus); // 'pending', 'ringing', 'answered', etc.
 * 
 * // Create reminder with voice call
 * const reminder = await createWithCall({
 *   title: 'Medicine reminder',
 *   reminders: ['Call'],
 *   recipientPhoneNumber: '+91...',
 *   voiceMessage: 'Take your medicine'
 * });
 */
export const useVoiceCall = () => {
  const [callStatus, setCallStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Trigger a voice call for existing reminder
   */
  const trigger = useCallback(async (reminderId) => {
    try {
      setLoading(true);
      setError(null);
      await triggerVoiceCall(reminderId);
      
      // Get updated status
      const response = await getVoiceCallStatus(reminderId);
      setCallStatus(response.data);
      return response.data;
    } catch (err) {
      const formattedError = formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current voice call status
   */
  const getStatus = useCallback(async (reminderId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getVoiceCallStatus(reminderId);
      setCallStatus(response.data);
      return response.data;
    } catch (err) {
      const formattedError = formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a reminder with voice call
   */
  const createWithCall = useCallback(async (reminderData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await createVoiceCallReminder(reminderData);
      return response.data;
    } catch (err) {
      const formattedError = formatErrorForUser(err);
      setError(formattedError);
      throw formattedError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    callStatus,
    loading,
    error,
    trigger,
    getStatus,
    createWithCall,
    clearError,
  };
};
