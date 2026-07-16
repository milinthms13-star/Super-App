import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './constants';
import './KundaliForm.css';

const KundaliForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    dateOfBirth: '',
    timeOfBirth: '',
    placeOfBirth: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePlaceSearch = async () => {
    if (!formData.placeOfBirth) return;

    try {
      // Use geocoding API to get coordinates
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.placeOfBirth)}&format=json&limit=1`
      );

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setFormData({
          ...formData,
          latitude: lat,
          longitude: lon,
        });
      } else {
        alert('Location not found. Please enter coordinates manually.');
      }
    } catch (error) {
      console.error('Location search failed:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/matrimonial/astrology/kundali`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );

      onSuccess(response.data.data);
    } catch (error) {
      console.error('Kundali creation failed:', error);
      setError(error.response?.data?.message || 'Failed to create Kundali');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="kundali-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Date of Birth *</label>
        <input
          type="date"
          name="dateOfBirth"
          value={formData.dateOfBirth}
          onChange={handleChange}
          required
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="form-group">
        <label>Time of Birth * (24-hour format)</label>
        <input
          type="time"
          name="timeOfBirth"
          value={formData.timeOfBirth}
          onChange={handleChange}
          required
        />
        <small>Enter as accurate as possible for precise calculations</small>
      </div>

      <div className="form-group">
        <label>Place of Birth *</label>
        <div className="place-search">
          <input
            type="text"
            name="placeOfBirth"
            value={formData.placeOfBirth}
            onChange={handleChange}
            placeholder="e.g., Mumbai, Maharashtra"
            required
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handlePlaceSearch}
          >
            Search
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Latitude *</label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            step="0.000001"
            placeholder="19.0760"
            required
          />
        </div>

        <div className="form-group">
          <label>Longitude *</label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            step="0.000001"
            placeholder="72.8777"
            required
          />
        </div>
      </div>

      <div className="form-info">
        <p>
          <strong>Note:</strong> For accurate Kundali, birth time should be precise.
          Contact your parents or check birth certificate for exact time.
        </p>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={loading}
      >
        {loading ? 'Generating Kundali...' : 'Generate Kundali'}
      </button>
    </form>
  );
};

export default KundaliForm;
