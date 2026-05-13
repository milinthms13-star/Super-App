import React from "react";

const FilterPanel = ({
  searchText,
  setSearchText,
  selectedCategory,
  setSelectedCategory,
  selectedDestination,
  setSelectedDestination,
  selectedTravelerType,
  setSelectedTravelerType,
  maxBudget,
  setMaxBudget,
  maxDays,
  setMaxDays,
  selectedHotelCategory,
  setSelectedHotelCategory,
  packageCategories,
  destinations,
  travelerTypes,
  hotelCategories,
}) => (
  <aside className="tourism-filters tourism-sticky-filters">
    <label className="tourism-field">
      <span>Search package</span>
      <input
        type="text"
        placeholder="Munnar, houseboat, wellness"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
      />
    </label>

    <label className="tourism-field">
      <span>Category</span>
      <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
        {packageCategories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>

    <label className="tourism-field">
      <span>Destination</span>
      <select value={selectedDestination} onChange={(event) => setSelectedDestination(event.target.value)}>
        {destinations.map((destination) => (
          <option key={destination} value={destination}>
            {destination}
          </option>
        ))}
      </select>
    </label>

    <label className="tourism-field">
      <span>Traveler type</span>
      <select value={selectedTravelerType} onChange={(event) => setSelectedTravelerType(event.target.value)}>
        {travelerTypes.map((travelerType) => (
          <option key={travelerType} value={travelerType}>
            {travelerType}
          </option>
        ))}
      </select>
    </label>

    <label className="tourism-field">
      <span>Hotel category</span>
      <select
        value={selectedHotelCategory}
        onChange={(event) => setSelectedHotelCategory(event.target.value)}
      >
        <option value="all">All</option>
        {hotelCategories.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>

    <label className="tourism-field">
      <span>Max budget: INR {Number(maxBudget).toLocaleString("en-IN")}</span>
      <input
        type="range"
        min="5000"
        max="100000"
        step="500"
        value={maxBudget}
        onChange={(event) => setMaxBudget(Number(event.target.value))}
      />
    </label>

    <label className="tourism-field">
      <span>Max duration: {maxDays} days</span>
      <input
        type="range"
        min="1"
        max="15"
        step="1"
        value={maxDays}
        onChange={(event) => setMaxDays(Number(event.target.value))}
      />
    </label>
  </aside>
);

export default FilterPanel;

