import React from "react";
import { InputField, SelectField } from "./FormControls";

function ProviderSearch({
  search,
  onSearchChange,
  categories,
  cities,
  sortOptions,
  loading,
  onRefresh,
}) {
  return (
    <article className="local-services-panel">
      <h2>Find Providers</h2>
      <div className="local-services-form">
        <InputField label="Search">
          <input
            type="text"
            value={search.query}
            onChange={(event) => onSearchChange("query", event.target.value)}
            placeholder="Provider, category, location..."
          />
        </InputField>

        <SelectField label="Category">
          <select value={search.category} onChange={(event) => onSearchChange("category", event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="Location">
          <select value={search.location} onChange={(event) => onSearchChange("location", event.target.value)}>
            <option value="all">All locations</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </SelectField>

        <SelectField label="Sort">
          <select value={search.sortBy} onChange={(event) => onSearchChange("sortBy", event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </SelectField>

        <div className="local-services-row">
          <InputField label="Price min">
            <input
              type="number"
              value={search.priceMin}
              onChange={(event) => onSearchChange("priceMin", event.target.value)}
            />
          </InputField>
          <InputField label="Price max">
            <input
              type="number"
              value={search.priceMax}
              onChange={(event) => onSearchChange("priceMax", event.target.value)}
            />
          </InputField>
        </div>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading}>
        {loading ? "Loading..." : "Refresh Providers"}
      </button>
    </article>
  );
}

export default ProviderSearch;
