import React, { useMemo } from 'react';

/**
 * ReminderStats component - displays reminder statistics
 * Shows total, pending, high priority, and voice call enabled counts
 * 
 * @component
 * @param {Object} props
 * @param {Object} props.stats - Statistics object
 * @param {number} props.stats.total - Total reminders
 * @param {number} props.stats.pending - Pending reminders
 * @param {number} props.stats.completed - Completed reminders
 * @param {number} props.stats.highPriority - High priority reminders
 * @param {number} props.stats.byCategory - Reminders by category
 * @param {Array} props.reminders - Full reminder list for calculations
 * 
 * @example
 * <ReminderStats
 *   stats={{
 *     total: 10,
 *     pending: 7,
 *     completed: 3,
 *     highPriority: 2,
 *     byCategory: { Work: 5, Personal: 3, Urgent: 2 }
 *   }}
 *   reminders={reminders}
 * />
 */
const ReminderStats = React.memo(({ stats = {}, reminders = [] }) => {
  const callEnabled = useMemo(() => {
    return reminders.filter(
      r => r.reminders?.includes('Call') || r.recipientPhoneNumber
    ).length;
  }, [reminders]);

  return (
    <section className="reminderalert-stats-grid">
      <article className="reminderalert-stat-card">
        <strong>{stats.total || 0}</strong>
        <span>Total reminders</span>
        <p>Everything currently tracked in your personal reminder board.</p>
      </article>
      <article className="reminderalert-stat-card">
        <strong>{stats.pending || 0}</strong>
        <span>Open items</span>
        <p>Tasks that still need your attention or a triggered reminder.</p>
      </article>
      <article className="reminderalert-stat-card">
        <strong>{stats.highPriority || 0}</strong>
        <span>High priority</span>
        <p>Urgent reminders that are active and ready for escalation.</p>
      </article>
      <article className="reminderalert-stat-card">
        <strong>{callEnabled}</strong>
        <span>Voice call enabled</span>
        <p>Reminders configured to ring a phone with your custom message.</p>
      </article>
    </section>
  );
});

ReminderStats.displayName = 'ReminderStats';

export default ReminderStats;
