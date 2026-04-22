import React, { useState, useMemo } from 'react';

const CATEGORY_FORMS = {
  electronics: {
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Apple, Samsung' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., iPhone 13 Pro' },
      { name: 'storage', label: 'Storage Capacity', type: 'select', required: true, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
      { name: 'ram', label: 'RAM', type: 'select', required: false, options: ['2GB', '4GB', '8GB', '12GB', '16GB', '32GB'] },
      { name: 'warranty', label: 'Warranty Status', type: 'select', required: false, options: ['Active', 'Expired', 'None', 'Extended'] },
      { name: 'accessories', label: 'Accessories Included', type: 'checkbox', options: ['Original Box', 'Charger', 'Cable', 'Earphones', 'Documentation'] },
    ],
  },
  automobiles: {
    fields: [
      { name: 'make', label: 'Make (Brand)', type: 'text', required: true, placeholder: 'e.g., Honda, Maruti' },
      { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Civic, Swift' },
      { name: 'year', label: 'Year', type: 'number', required: true, min: 1990, max: new Date().getFullYear() },
      { name: 'mileage', label: 'Mileage (km)', type: 'number', required: true, placeholder: '50000' },
      { name: 'fuelType', label: 'Fuel Type', type: 'select', required: true, options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'] },
      { name: 'transmission', label: 'Transmission', type: 'select', required: true, options: ['Manual', 'Automatic'] },
      { name: 'ownerType', label: 'Owner Type', type: 'select', required: true, options: ['First Owner', 'Second Owner', 'Third Owner', 'Fleet'] },
      { name: 'insurance', label: 'Insurance Status', type: 'select', required: false, options: ['Valid', 'Expired', 'Third Party', 'None'] },
    ],
  },
  realestate: {
    fields: [
      { name: 'propertyType', label: 'Property Type', type: 'select', required: true, options: ['Apartment', 'House', 'Villa', 'Commercial', 'Land'] },
      { name: 'bhk', label: 'BHK', type: 'select', required: true, options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'] },
      { name: 'squareFeet', label: 'Area (Sq Ft)', type: 'number', required: true, placeholder: '1500' },
      { name: 'furnishing', label: 'Furnishing Status', type: 'select', required: true, options: ['Furnished', 'Semi-Furnished', 'Unfurnished'] },
      { name: 'floorNo', label: 'Floor Number', type: 'text', required: false, placeholder: '3rd Floor, Ground Floor' },
      { name: 'amenities', label: 'Amenities', type: 'checkbox', options: ['Gym', 'Pool', 'Parking', 'Security', 'Garden', 'Elevator'] },
      { name: 'ageOfBuilding', label: 'Age of Building', type: 'select', required: false, options: ['New', 'Less than 5 years', '5-10 years', '10-20 years', '20+ years'] },
    ],
  },
  furniture: {
    fields: [
      { name: 'material', label: 'Material', type: 'select', required: true, options: ['Wood', 'Metal', 'Plastic', 'Fabric', 'Glass', 'Mixed'] },
      { name: 'style', label: 'Style', type: 'select', required: false, options: ['Modern', 'Traditional', 'Contemporary', 'Vintage', 'Minimalist'] },
      { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Oak, Walnut' },
      { name: 'dimensions', label: 'Dimensions (L x W x H)', type: 'text', required: false, placeholder: 'e.g., 200 x 100 x 90 cm' },
      { name: 'quantity', label: 'Quantity', type: 'number', required: false, min: 1 },
      { name: 'assembly', label: 'Assembly Required', type: 'select', required: false, options: ['Yes', 'No', 'Partially'] },
    ],
  },
  fashion: {
    fields: [
      { name: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Nike, Zara' },
      { name: 'size', label: 'Size', type: 'text', required: true, placeholder: 'e.g., M, L, XL, 32' },
      { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Cotton, Polyester' },
      { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Black, Blue' },
      { name: 'gender', label: 'Gender', type: 'select', required: false, options: ['Men', 'Women', 'Kids', 'Unisex'] },
      { name: 'usage', label: 'Usage', type: 'select', required: false, options: ['Brand New', 'Like New', 'Lightly Used', 'Well Used'] },
    ],
  },
  books: {
    fields: [
      { name: 'author', label: 'Author', type: 'text', required: true, placeholder: 'Full name of author' },
      { name: 'isbn', label: 'ISBN', type: 'text', required: false, placeholder: '978-3-16-148410-0' },
      { name: 'publisher', label: 'Publisher', type: 'text', required: false, placeholder: 'e.g., Penguin, Bloomsbury' },
      { name: 'edition', label: 'Edition', type: 'text', required: false, placeholder: 'e.g., 1st, 2nd, Revised' },
      { name: 'language', label: 'Language', type: 'text', required: false, placeholder: 'e.g., English, Hindi' },
      { name: 'genre', label: 'Genre', type: 'select', required: false, options: ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Science Fiction', 'Biography', 'History', 'Self-Help'] },
    ],
  },
};

const CategoryForms = ({ selectedCategory = 'electronics', formData = {}, onFormDataChange }) => {
  const [expandedSection, setExpandedSection] = useState('general');
  const [errors, setErrors] = useState({});

  const categoryConfig = CATEGORY_FORMS[selectedCategory] || { fields: [] };

  // Validate field
  const validateField = (fieldName, value) => {
    const field = categoryConfig.fields.find(f => f.name === fieldName);
    if (!field) return null;

    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (field.type === 'number') {
      if (field.min && value < field.min) {
        return `${field.label} must be at least ${field.min}`;
      }
      if (field.max && value > field.max) {
        return `${field.label} must be at most ${field.max}`;
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName, value) => {
    // Update form data
    if (onFormDataChange) {
      onFormDataChange({ ...formData, [fieldName]: value });
    }

    // Validate and update errors
    const error = validateField(fieldName, value);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  };

  const handleCheckboxChange = (fieldName, optionValue, checked) => {
    const currentValues = formData[fieldName] || [];
    let newValues;

    if (checked) {
      newValues = [...currentValues, optionValue];
    } else {
      newValues = currentValues.filter(v => v !== optionValue);
    }

    if (onFormDataChange) {
      onFormDataChange({ ...formData, [fieldName]: newValues });
    }
  };

  return (
    <div className="category-forms">
      <div className="form-header">
        <h3>📋 {selectedCategory.toUpperCase()} Details</h3>
        <p className="form-subtitle">
          Add specific details to help buyers find and understand your {selectedCategory} listing
        </p>
      </div>

      <div className="form-section">
        <div
          className="section-header"
          onClick={() => setExpandedSection(expandedSection === 'details' ? null : 'details')}
        >
          <h4>Specific Details</h4>
          <span className={`expand-icon ${expandedSection === 'details' ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>

        {expandedSection === 'details' && (
          <div className="section-content">
            <div className="fields-grid">
              {categoryConfig.fields.map(field => (
                <div key={field.name} className="form-field">
                  <label htmlFor={field.name} className="field-label">
                    {field.label}
                    {field.required && <span className="required">*</span>}
                  </label>

                  {field.type === 'text' && (
                    <input
                      id={field.name}
                      type="text"
                      className={`field-input ${errors[field.name] ? 'error' : ''}`}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  )}

                  {field.type === 'number' && (
                    <input
                      id={field.name}
                      type="number"
                      className={`field-input ${errors[field.name] ? 'error' : ''}`}
                      placeholder={field.placeholder}
                      min={field.min}
                      max={field.max}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    />
                  )}

                  {field.type === 'select' && (
                    <select
                      id={field.name}
                      className={`field-select ${errors[field.name] ? 'error' : ''}`}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    >
                      <option value="">-- Select {field.label} --</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <div className="checkbox-group">
                      {field.options.map(opt => (
                        <label key={opt} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={(formData[field.name] || []).includes(opt)}
                            onChange={(e) =>
                              handleCheckboxChange(field.name, opt, e.target.checked)
                            }
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {errors[field.name] && (
                    <span className="field-error">{errors[field.name]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Info */}
      <div className="form-info-box">
        <span className="info-icon">💡</span>
        <div className="info-content">
          <h5>Why add these details?</h5>
          <p>
            Detailed information helps buyers understand exactly what they're buying and
            increases the likelihood of a quick sale. Listings with complete information
            get 3x more inquiries!
          </p>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="form-tips">
        <h5>📝 Tips for this category:</h5>
        <ul>
          {selectedCategory === 'electronics' && (
            <>
              <li>Be specific about specs - buyers want to know exact models</li>
              <li>Mention warranty status - it affects pricing significantly</li>
              <li>List all included accessories for completeness</li>
            </>
          )}
          {selectedCategory === 'automobiles' && (
            <>
              <li>Mileage is critical - be honest for best results</li>
              <li>Mention service history if available</li>
              <li>Insurance and registration status matters to buyers</li>
            </>
          )}
          {selectedCategory === 'realestate' && (
            <>
              <li>Square footage must be accurate</li>
              <li>List all amenities - it's a major buying factor</li>
              <li>Age and maintenance history are important</li>
            </>
          )}
          {selectedCategory === 'furniture' && (
            <>
              <li>Provide exact dimensions for online buyers</li>
              <li>Material quality affects pricing significantly</li>
              <li>Mention assembly requirements upfront</li>
            </>
          )}
          {selectedCategory === 'fashion' && (
            <>
              <li>Accurate sizing prevents returns</li>
              <li>Material composition helps buyers decide</li>
              <li>Brand is important for resale value</li>
            </>
          )}
          {selectedCategory === 'books' && (
            <>
              <li>ISBN helps verify the exact edition</li>
              <li>Condition is crucial for book collectors</li>
              <li>First editions are worth more to collectors</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CategoryForms;
