import React, { useState } from "react";
import {
  ROUTINE_TIME_LABELS,
  ROUTINE_TIMES,
  VALIDATION,
  STATUS_MESSAGES,
} from "../data/beautyaiConstants";
import "../NilaBeautyAI.css";

/**
 * BeautyPlanEditor Component
 * Allows users to view and edit their beauty plans
 */

const BeautyPlanEditor = ({ plan, onSave, onCancel, isSaving = false }) => {
  const [editedPlan, setEditedPlan] = useState({
    title: plan?.title || "",
    notes: plan?.notes || "",
    plan: {
      morning: plan?.plan?.morning || [],
      evening: plan?.plan?.evening || [],
      night: plan?.plan?.night || [],
      weekly: plan?.plan?.weekly || [],
      lifestyle: plan?.plan?.lifestyle || [],
    },
    products: plan?.products || [],
  });

  const [errors, setErrors] = useState({});
  const [activeSection, setActiveSection] = useState(ROUTINE_TIMES.MORNING);

  const validateForm = () => {
    const newErrors = {};

    if (!editedPlan.title || editedPlan.title.length < VALIDATION.PLAN_TITLE_MIN) {
      newErrors.title = `Title must be at least ${VALIDATION.PLAN_TITLE_MIN} characters`;
    }

    if (editedPlan.title.length > VALIDATION.PLAN_TITLE_MAX) {
      newErrors.title = `Title must be less than ${VALIDATION.PLAN_TITLE_MAX} characters`;
    }

    if (editedPlan.notes && editedPlan.notes.length > VALIDATION.PLAN_NOTES_MAX) {
      newErrors.notes = `Notes must be less than ${VALIDATION.PLAN_NOTES_MAX} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    onSave(editedPlan);
  };

  const handleTitleChange = (e) => {
    setEditedPlan({ ...editedPlan, title: e.target.value });
    if (errors.title) {
      setErrors({ ...errors, title: null });
    }
  };

  const handleNotesChange = (e) => {
    setEditedPlan({ ...editedPlan, notes: e.target.value });
    if (errors.notes) {
      setErrors({ ...errors, notes: null });
    }
  };

  const handleRoutineItemChange = (section, index, value) => {
    const updatedRoutine = [...editedPlan.plan[section]];
    updatedRoutine[index] = value;
    setEditedPlan({
      ...editedPlan,
      plan: {
        ...editedPlan.plan,
        [section]: updatedRoutine,
      },
    });
  };

  const handleAddRoutineItem = (section) => {
    setEditedPlan({
      ...editedPlan,
      plan: {
        ...editedPlan.plan,
        [section]: [...editedPlan.plan[section], ""],
      },
    });
  };

  const handleRemoveRoutineItem = (section, index) => {
    const updatedRoutine = editedPlan.plan[section].filter((_, i) => i !== index);
    setEditedPlan({
      ...editedPlan,
      plan: {
        ...editedPlan.plan,
        [section]: updatedRoutine,
      },
    });
  };

  const handleProductChange = (index, value) => {
    const updatedProducts = [...editedPlan.products];
    updatedProducts[index] = value;
    setEditedPlan({
      ...editedPlan,
      products: updatedProducts,
    });
  };

  const handleAddProduct = () => {
    setEditedPlan({
      ...editedPlan,
      products: [...editedPlan.products, ""],
    });
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = editedPlan.products.filter((_, i) => i !== index);
    setEditedPlan({
      ...editedPlan,
      products: updatedProducts,
    });
  };

  const renderRoutineSection = (section) => {
    const items = editedPlan.plan[section] || [];
    return (
      <div className="routine-section">
        <h4>{ROUTINE_TIME_LABELS[section]}</h4>
        {items.length === 0 ? (
          <p className="empty-message">No items yet. Click "Add Step" to begin.</p>
        ) : (
          <ul className="routine-items">
            {items.map((item, index) => (
              <li key={index}>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => handleRoutineItemChange(section, index, e.target.value)}
                  placeholder={`Step ${index + 1}`}
                />
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => handleRemoveRoutineItem(section, index)}
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="add-btn"
          onClick={() => handleAddRoutineItem(section)}
        >
          + Add Step
        </button>
      </div>
    );
  };

  return (
    <div className="beauty-plan-editor">
      <div className="editor-header">
        <h3>Edit Beauty Plan</h3>
        <button type="button" className="close-btn" onClick={onCancel}>
          ✕
        </button>
      </div>

      <div className="editor-content">
        <div className="form-group">
          <label htmlFor="plan-title">Plan Title *</label>
          <input
            id="plan-title"
            type="text"
            value={editedPlan.title}
            onChange={handleTitleChange}
            placeholder="e.g., 7-Day Acne Clear Plan"
            maxLength={VALIDATION.PLAN_TITLE_MAX}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
          <span className="char-count">
            {editedPlan.title.length} / {VALIDATION.PLAN_TITLE_MAX}
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="plan-notes">Personal Notes</label>
          <textarea
            id="plan-notes"
            value={editedPlan.notes}
            onChange={handleNotesChange}
            placeholder="Add any personal notes or observations..."
            rows={4}
            maxLength={VALIDATION.PLAN_NOTES_MAX}
          />
          {errors.notes && <span className="error-message">{errors.notes}</span>}
          <span className="char-count">
            {editedPlan.notes.length} / {VALIDATION.PLAN_NOTES_MAX}
          </span>
        </div>

        <div className="routine-tabs">
          {Object.values(ROUTINE_TIMES).map((section) => (
            <button
              key={section}
              type="button"
              className={activeSection === section ? "active" : ""}
              onClick={() => setActiveSection(section)}
            >
              {ROUTINE_TIME_LABELS[section]}
            </button>
          ))}
        </div>

        <div className="routine-content">
          {renderRoutineSection(activeSection)}
        </div>

        <div className="products-section">
          <h4>Recommended Products</h4>
          {editedPlan.products.length === 0 ? (
            <p className="empty-message">No products yet. Click "Add Product" to begin.</p>
          ) : (
            <ul className="product-items">
              {editedPlan.products.map((product, index) => (
                <li key={index}>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    placeholder={`Product ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => handleRemoveProduct(index)}
                    aria-label="Remove product"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="add-btn" onClick={handleAddProduct}>
            + Add Product
          </button>
        </div>
      </div>

      <div className="editor-footer">
        <button
          type="button"
          className="cancel-btn"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default BeautyPlanEditor;
