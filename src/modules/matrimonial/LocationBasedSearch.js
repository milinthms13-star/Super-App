import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './LocationBasedSearch.css';

const LocationBasedSearch = ({ onProfileSelect }) => {
  const [searchMode, setSearchMode] = useState('nearby'); // nearby, city, map
  const [location, setLocation] = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [radius, setRadius] = useState(50);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const [locationStats, setLocationStats] = useState(null);
  const [filters, setFilters] = useState({
    minAge: '',
    maxAge: '',
    gender: '',
    religion: '',
    education: '',
    maritalStatus: ''
  });
  const [sortBy, setSortBy] = useState('distance');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPopularCities();
    fetchLocationStats();
  }, []);

  useEffect(() => {
    if (location) {
      searchNearby();
    }
  }, [location, radius, filters, sortBy, pagination.page]);

  const fetchPopularCities = async () => {
    try {
      const response = await axios.get('/api/matrimonial/location/cities/popular');
      setPopularCities(response.data.cities);
    } catch (error) {
      console.error('Failed to fetch popular cities:', error);
    }
  };

  const fetchLocationStats = async () => {
    try {
      const response = await axios.get('/api/matrimonial/location/stats/by-location');
      setLocationStats(response.data);
    } catch (error) {
      console.error('Failed to fetch location stats:', error);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Your Location'
        });
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please search by city.');
        setLoading(false);
        console.error('Geolocation error:', error);
      }
    );
  };

  const searchByCity = async (city) => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post('/api/matrimonial/location/geocode', {
        address: city
      });

      setLocation({
        lat: response.data.lat,
        lng: response.data.lng,
        name: response.data.formattedAddress || city
      });

      setLocationInput(response.data.formattedAddress || city);
      setCitySuggestions([]);
    } catch (error) {
      setError('Failed to find location. Please try another city.');
      console.error('Geocoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchNearby = async () => {
    if (!location) return;

    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        lat: location.lat,
        lng: location.lng,
        radius,
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(`/api/matrimonial/location/search/nearby?${params}`);

      setProfiles(response.data.profiles);
      setPagination(response.data.pagination);
    } catch (error) {
      setError('Failed to search profiles. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCityInputChange = async (e) => {
    const value = e.target.value;
    setLocationInput(value);

    if (value.length >= 2) {
      try {
        const response = await axios.get(`/api/matrimonial/location/cities/suggestions?q=${value}`);
        setCitySuggestions(response.data.suggestions);
      } catch (error) {
        console.error('Failed to fetch city suggestions:', error);
      }
    } else {
      setCitySuggestions([]);
    }
  };

  const selectCity = (city) => {
    setLocation({
      lat: city.lat,
      lng: city.lng,
      name: city.name
    });
    setLocationInput(city.name);
    setCitySuggestions([]);
  };

  const handleRadiusChange = (e) => {
    const value = parseInt(e.target.value);
    setRadius(value);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      minAge: '',
      maxAge: '',
      gender: '',
      religion: '',
      education: '',
      maritalStatus: ''
    });
  };

  const renderSearchControls = () => (
    <div className="search-controls">
      <div className="search-mode-tabs">
        <button
          className={searchMode === 'nearby' ? 'active' : ''}
          onClick={() => setSearchMode('nearby')}
        >
          <span className="icon">📍</span> Nearby Search
        </button>
        <button
          className={searchMode === 'city' ? 'active' : ''}
          onClick={() => setSearchMode('city')}
        >
          <span className="icon">🏙️</span> Search by City
        </button>
      </div>

      {searchMode === 'nearby' && (
        <div className="nearby-search">
          <button onClick={getCurrentLocation} className="btn-primary" disabled={loading}>
            {loading ? 'Getting Location...' : '📍 Use My Current Location'}
          </button>
          {location && (
            <div className="location-display">
              <span className="icon">📌</span>
              <span>{location.name}</span>
            </div>
          )}
        </div>
      )}

      {searchMode === 'city' && (
        <div className="city-search">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search by city name..."
              value={locationInput}
              onChange={handleCityInputChange}
              className="city-input"
            />
            {citySuggestions.length > 0 && (
              <div className="suggestions-dropdown">
                {citySuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="suggestion-item"
                    onClick={() => selectCity(suggestion)}
                  >
                    <span className="city-name">{suggestion.city}</span>
                    {suggestion.state && <span className="city-state">, {suggestion.state}</span>}
                    {suggestion.country && <span className="city-country"> - {suggestion.country}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="popular-cities">
            <h4>Popular Cities</h4>
            <div className="city-chips">
              {popularCities.slice(0, 10).map((city, index) => (
                <button
                  key={index}
                  className="city-chip"
                  onClick={() => selectCity(city)}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {location && (
        <div className="radius-control">
          <label>
            Search Radius: <strong>{radius} km</strong>
          </label>
          <input
            type="range"
            min="5"
            max="200"
            step="5"
            value={radius}
            onChange={handleRadiusChange}
            className="radius-slider"
          />
          <div className="radius-labels">
            <span>5 km</span>
            <span>50 km</span>
            <span>100 km</span>
            <span>200 km</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className={`filters-panel ${showFilters ? 'open' : ''}`}>
      <div className="filters-header">
        <h3>Filters</h3>
        <button onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? '▲ Hide' : '▼ Show'}
        </button>
      </div>

      {showFilters && (
        <div className="filters-content">
          <div className="filter-group">
            <label>Age Range</label>
            <div className="age-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minAge}
                onChange={(e) => handleFilterChange('minAge', e.target.value)}
                min="18"
                max="100"
              />
              <span>to</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxAge}
                onChange={(e) => handleFilterChange('maxAge', e.target.value)}
                min="18"
                max="100"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Gender</label>
            <select
              value={filters.gender}
              onChange={(e) => handleFilterChange('gender', e.target.value)}
            >
              <option value="">All</option>
              <option value="Man">Man</option>
              <option value="Woman">Woman</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Religion</label>
            <select
              value={filters.religion}
              onChange={(e) => handleFilterChange('religion', e.target.value)}
            >
              <option value="">All</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Christian">Christian</option>
              <option value="Sikh">Sikh</option>
              <option value="Buddhist">Buddhist</option>
              <option value="Jain">Jain</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Marital Status</label>
            <select
              value={filters.maritalStatus}
              onChange={(e) => handleFilterChange('maritalStatus', e.target.value)}
            >
              <option value="">All</option>
              <option value="Never Married">Never Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Education</label>
            <input
              type="text"
              placeholder="e.g. Engineering, MBA"
              value={filters.education}
              onChange={(e) => handleFilterChange('education', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="distance">Distance</option>
              <option value="age">Age</option>
              <option value="lastActive">Recently Active</option>
            </select>
          </div>

          <div className="filter-actions">
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
            <button onClick={searchNearby} className="btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderProfiles = () => {
    if (loading) {
      return <div className="loading">🔍 Searching profiles...</div>;
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    if (!location) {
      return (
        <div className="no-location">
          <p>👆 Select a search method to find profiles near you</p>
        </div>
      );
    }

    if (profiles.length === 0) {
      return (
        <div className="no-results">
          <p>😔 No profiles found within {radius} km</p>
          <p>Try increasing the search radius or adjusting filters</p>
        </div>
      );
    }

    return (
      <div className="profiles-container">
        <div className="results-header">
          <h3>Found {pagination.total} profiles within {radius} km</h3>
        </div>

        <div className="profiles-grid">
          {profiles.map((profile) => (
            <div key={profile._id} className="profile-card">
              <div className="profile-image">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.name} />
                ) : (
                  <div className="placeholder-image">
                    {profile.gender === 'Man' ? '👨' : '👩'}
                  </div>
                )}
                <div className="distance-badge">{profile.distanceText}</div>
              </div>

              <div className="profile-info">
                <h4>{profile.name}</h4>
                <p className="profile-details">
                  {profile.age} years • {profile.gender}
                </p>
                <p className="profile-details">
                  📍 {profile.location}
                </p>
                {profile.profession && (
                  <p className="profile-details">💼 {profile.profession}</p>
                )}
                {profile.education && (
                  <p className="profile-details">🎓 {profile.education}</p>
                )}
              </div>

              <div className="profile-actions">
                <button
                  onClick={() => onProfileSelect?.(profile)}
                  className="btn-view-profile"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>

        {pagination.pages > 1 && (
          <div className="pagination">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="btn-page"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="btn-page"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderLocationStats = () => {
    if (!locationStats) return null;

    return (
      <div className="location-stats">
        <h3>Profile Distribution</h3>
        <div className="stats-grid">
          <div className="stat-column">
            <h4>Top Cities</h4>
            <ul>
              {locationStats.topCities.slice(0, 5).map((city, index) => (
                <li key={index}>
                  <span className="city-name">{city.city}</span>
                  <span className="city-count">{city.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="stat-column">
            <h4>Top States</h4>
            <ul>
              {locationStats.topStates.slice(0, 5).map((state, index) => (
                <li key={index}>
                  <span className="state-name">{state.state}</span>
                  <span className="state-count">{state.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="location-based-search">
      <div className="search-header">
        <h2>🗺️ Location-Based Search</h2>
        <p>Find matches near you or search by city</p>
      </div>

      {renderSearchControls()}
      {renderFilters()}
      {renderProfiles()}
      {!location && renderLocationStats()}
    </div>
  );
};

export default LocationBasedSearch;
