import React, { useCallback } from 'react';

/**
 * ReminderFilters component - category/filter selection bar
 * Allows users to filter reminders by category
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.filterOptions - Available filter options
 * @param {string} props.activeFilter - Currently active filter
 * @param {function} props.onFilterChange - Filter change handler
 * @param {Object} props.stats - Statistics object with counts
 * 
 * @example
 * <ReminderFilters
 *   filterOptions={['All', 'Work', 'Personal', 'Urgent']}
 *   activeFilter="Work"
 *   onFilterChange={handleFilterChange}
 *   stats={{ byCategory: { Work: 5, Personal: 3, Urgent: 2 } }}
 * />
 */
const ReminderFilters = React.memo(({
  filterOptions = ['All', 'Work', 'Personal', 'Urgent'],
  activeFilter = 'All',
  onFilterChange = () => {},
  stats = {},
}) => {
  const handleFilterClick = useCallback((filter) => {
    if (filter !== activeFilter) {
      onFilterChange(filter);
    }
  }, [activeFilter, onFilterChange]);

  return (
    <div className="reminderalert-filters">
      <div className="reminderalert-filters-container">
        {filterOptions.map((filter) => {
          const count = filter === 'All'
            ? stats.total || 0
            : stats.byCategory?.[filter] || 0;

          return (
            <button
              key={filter}
              className={`reminderalert-filter-chip ${filter === activeFilter ? 'active' : ''}`}
              onClick={() => handleFilterClick(filter)}
              aria-pressed={filter === activeFilter}
              aria-label={`Filter by ${filter} (${count} reminders)`}
            >
              {filter}
              {count > 0 && <span className="reminderalert-filter-count">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
});

ReminderFilters.displayName = 'ReminderFilters';

export default ReminderFilters;
