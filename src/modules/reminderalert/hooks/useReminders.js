import { useCallback, useEffect, useReducer, useState } from 'react';
import { formatErrorForUser } from '../../../services/errors';
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminderCompletion
} from '../../../services/remindersService';

const initialState = {
  reminders: [],
  loading: true,
  error: null,
  retryCount: 0
};

/**
 * Reducer for managing reminder state
 * Handles all state mutations in a predictable way
 * 
 * @param {Object} state - Current state
 * @param {Array} state.reminders - Array of reminders
 * @param {boolean} state.loading - Loading indicator
 * @param {Object} state.error - Error object or null
 * @param {number} state.retryCount - Retry counter
 * 
 * @param {Object} action - Action object
 * @param {string} action.type - Action type
 * @param {*} action.payload - Action payload
 * 
 * @returns {Object} New state
 * 
 * @example
 * // SET_REMINDERS - Update reminders list
 * dispatch({ type: 'SET_REMINDERS', payload: remindersArray });
 * 
 * // ADD_REMINDER - Add new reminder to list
 * dispatch({ type: 'ADD_REMINDER', payload: newReminder });
 * 
 * // UPDATE_REMINDER - Update existing reminder
 * dispatch({ type: 'UPDATE_REMINDER', payload: updatedReminder });
 * 
 * // DELETE_REMINDER - Remove reminder by ID
 * dispatch({ type: 'DELETE_REMINDER', payload: reminderId });
 * 
 * // SET_ERROR - Set error state
 * dispatch({ type: 'SET_ERROR', payload: { message: 'error', canRetry: true } });
 */
const reminderReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REMINDERS':
      return { ...state, reminders: action.payload, loading: false, error: null };
    
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'ADD_REMINDER':
      return { ...state, reminders: [action.payload, ...state.reminders] };
    
    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map(r =>
          r._id === action.payload._id ? action.payload : r
        )
      };
    
    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter(r => r._id !== action.payload)
      };
    
    case 'INCREMENT_RETRY':
      return { ...state, retryCount: state.retryCount + 1 };
    
    case 'RESET_RETRY':
      return { ...state, retryCount: 0 };
    
    default:
      return state;
  }
};

/**
 * Custom hook for managing reminders with comprehensive state management
 * Handles CRUD operations, filtering, error handling, and auto-retry logic
 * 
 * @hook
 * @returns {Object} Reminder management interface
 * @returns {Array} returns.reminders - Array of reminder objects
 * @returns {boolean} returns.loading - Loading state
 * @returns {Object} returns.error - Error object (null if no error)
 * @returns {string} returns.filter - Current filter (All|Work|Personal|Urgent)
 * @returns {function} returns.setFilter - Set active filter
 * @returns {function} returns.load - Load reminders with options
 * @returns {function} returns.create - Create new reminder
 * @returns {function} returns.update - Update existing reminder
 * @returns {function} returns.remove - Delete reminder
 * @returns {function} returns.toggleCompletion - Mark reminder as done/undone
 * @returns {function} returns.clearError - Clear error state
 * @returns {function} returns.retry - Retry failed operation with exponential backoff
 * 
 * @example
 * const {
 *   reminders,
 *   loading,
 *   error,
 *   filter,
 *   setFilter,
 *   create,
 *   update,
 *   remove,
 *   clearError,
 *   retry
 * } = useReminders();
 * 
 * // Create a reminder
 * try {
 *   await create({
 *     title: 'Doctor Appointment',
 *     category: 'Personal',
 *     priority: 'High',
 *     dueDate: '2024-05-15'
 *   });
 * } catch (err) {
 *   console.error('Failed to create reminder:', err);
 * }
 * 
 * // Filter by category
 * setFilter('Work');
 * 
 * // Handle errors with retry
 * if (error && error.canRetry) {
 *   <button onClick={retry}>Retry</button>
 * }
 */
export const useReminders = () => {
  const [state, dispatch] = useReducer(reminderReducer, initialState);
  const [filter, setFilter] = useState('All');
  const [retryTimer, setRetryTimer] = useState(null);

  // Load reminders
  const load = useCallback(async (options = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetchReminders({ category: filter, ...options });
      dispatch({ type: 'SET_REMINDERS', payload: response.data });
      dispatch({ type: 'RESET_RETRY' });
    } catch (error) {
      const formattedError = formatErrorForUser(error);
      dispatch({ type: 'SET_ERROR', payload: formattedError });
      
      // Auto-retry for retryable errors
      if (formattedError.canRetry && state.retryCount < 3) {
        dispatch({ type: 'INCREMENT_RETRY' });
        const delay = Math.pow(2, state.retryCount) * 1000; // Exponential backoff
        const timer = setTimeout(() => load(options), delay);
        setRetryTimer(timer);
      }
    }
  }, [filter, state.retryCount]);

  // Create reminder
  const create = useCallback(async (reminderData) => {
    try {
      const response = await createReminder(reminderData);
      dispatch({ type: 'ADD_REMINDER', payload: response.data });
      return response.data;
    } catch (error) {
      const formattedError = formatErrorForUser(error);
      dispatch({ type: 'SET_ERROR', payload: formattedError });
      throw error;
    }
  }, []);

  // Update reminder
  const update = useCallback(async (reminderId, reminderData) => {
    try {
      const response = await updateReminder(reminderId, reminderData);
      dispatch({ type: 'UPDATE_REMINDER', payload: response.data });
      return response.data;
    } catch (error) {
      const formattedError = formatErrorForUser(error);
      dispatch({ type: 'SET_ERROR', payload: formattedError });
      throw error;
    }
  }, []);

  // Delete reminder
  const remove = useCallback(async (reminderId) => {
    try {
      await deleteReminder(reminderId);
      dispatch({ type: 'DELETE_REMINDER', payload: reminderId });
    } catch (error) {
      const formattedError = formatErrorForUser(error);
      dispatch({ type: 'SET_ERROR', payload: formattedError });
      throw error;
    }
  }, []);

  // Toggle completion
  const toggleCompletion = useCallback(async (reminderId, completed) => {
    try {
      const response = await toggleReminderCompletion(reminderId, completed);
      dispatch({ type: 'UPDATE_REMINDER', payload: response.data });
    } catch (error) {
      const formattedError = formatErrorForUser(error);
      dispatch({ type: 'SET_ERROR', payload: formattedError });
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Retry loading
  const retry = useCallback(() => {
    dispatch({ type: 'RESET_RETRY' });
    load();
  }, [load]);

  // Load on mount and when filter changes
  useEffect(() => {
    load();
  }, [load]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [retryTimer]);

  return {
    reminders: state.reminders,
    loading: state.loading,
    error: state.error,
    filter,
    setFilter,
    load,
    create,
    update,
    remove,
    toggleCompletion,
    clearError,
    retry
  };
};
