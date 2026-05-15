import React from "react";

const QuickFilters = ({
  verifiedOnly,
  onVerifiedToggle,
  readyToMoveOnly,
  onReadyToggle,
  sortBy,
  onSortChange,
  resultCount,
}) => {
  return (
    <section className="homesphere-quick-filters">
      <div className="homesphere-filters-row">
        <div className="homesphere-filter-chips">
          <button
            type="button"
            className={`homesphere-chip ${verifiedOnly ? "active" : ""}`}
            onClick={onVerifiedToggle}
            title="Show only verified properties"
          >
            Verified only
          </button>
          <button
            type="button"
            className={`homesphere-chip ${readyToMoveOnly ? "active" : ""}`}
            onClick={onReadyToggle}
            title="Show only ready-to-move properties"
          >
            Ready to move
          </button>
        </div>

        <div className="homesphere-filters-meta">
          <span className="homesphere-result-count">{resultCount} properties found</span>
          <select
            className="homesphere-sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort properties"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest first</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default QuickFilters;
