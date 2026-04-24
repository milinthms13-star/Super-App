import { useMemo, useState, useCallback } from 'react';

/**
 * Custom hook for managing reminder filtering and sorting
 * Handles category filtering and sorting by due date
 * 
 * @hook
 * @param {Array} reminders - Array of reminder objects to filter
 * @returns {Object} Filter management interface
 * @returns {string} returns.activeFilter - Current active filter
 * @returns {function} returns.setFilter - Set active filter
 * @returns {Array} returns.filteredReminders - Filtered and sorted reminders
 * @returns {Array} returns.filterOptions - Available filter options
 * @returns {Object} returns.stats - Statistics about reminders
 * 
 * @example
 * const { activeFilter, setFilter, filteredReminders, stats } = useReminderFilters(reminders);
 * 
 * // Get reminders for specific category
 * setFilter('Work');
 * console.log(filteredReminders); // Only Work reminders, sorted by due date
 * 
 * // Get statistics
 * console.log(stats.pending); // Number of incomplete reminders
 * console.log(stats.highPriority); // Number of high priority incomplete reminders
 */
export const useReminderFilters = (reminders = []) => {
  const [activeFilter, setFilter] = useState('All');

  const FILTER_OPTIONS = ['All', 'Work', 'Personal', 'Urgent'];

  /**
   * Utility to convert reminder date/time to comparable timestamp
   */
  const getReminderTimestamp = useCallback((reminder = {}) => {
    if (!reminder.dueDate) return Number.POSITIVE_INFINITY;

    try {
      const date = new Date(reminder.dueDate);
      if (reminder.dueTime) {
        const [hours, minutes] = String(reminder.dueTime).split(':').map(Number);
        date.setHours(hours || 0, minutes || 0, 0, 0);
      } else {
        date.setHours(0, 0, 0, 0);
      }
      return date.getTime();
    } catch (e) {
      return Number.POSITIVE_INFINITY;
    }
  }, []);

  /**
   * Filter and sort reminders
   */
  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Apply category filter
    if (activeFilter !== 'All') {
      filtered = reminders.filter(r => r.category === activeFilter);
    }

    // Sort by due date
    return [...filtered].sort(
      (a, b) => getReminderTimestamp(a) - getReminderTimestamp(b)
    );
  }, [reminders, activeFilter, getReminderTimestamp]);

  /**
   * Calculate statistics
   */
  const stats = useMemo(() => {
    const pending = reminders.filter(r => !r.completed).length;
    const completed = reminders.filter(r => r.completed).length;
    const highPriority = reminders.filter(
      r => r.priority === 'High' && !r.completed
    ).length;
    const byCategory = {
      Work: reminders.filter(r => r.category === 'Work').length,
      Personal: reminders.filter(r => r.category === 'Personal').length,
      Urgent: reminders.filter(r => r.category === 'Urgent').length,
    };

    return {
      total: reminders.length,
      pending,
      completed,
      highPriority,
      byCategory,
    };
  }, [reminders]);

  return {
    activeFilter,
    setFilter,
    filteredReminders,
    filterOptions: FILTER_OPTIONS,
    stats,
  };
};
