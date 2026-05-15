import React from "react";

const QuickFilters = ({
  filters = [],
  sortOptions = [],
  sortBy,
  onSortChange,
}) => {
  return (
    <section className="tradepost-quick-filters">
      <div className="tradepost-filters-row">
        <div className="tradepost-filter-chips">
          {filters.map((filter, index) => (
            <button
              key={index}
              type="button"
              className={`tradepost-chip ${filter.active ? "active" : ""}`}
              onClick={filter.onClick}
              title={filter.label}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="tradepost-filters-meta">
          <select
            className="tradepost-sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort listings"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
};

export default QuickFilters;