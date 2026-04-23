import React, { useState } from 'react';
import useI18n from '../../hooks/useI18n';
import './CreateTicket.css';

const CreateTicket = ({ onCancel, onSubmit }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    module: 'general',
    category: 'general',
    priority: 'medium',
    contactPhone: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.subject.trim() || !formData.description.trim()) {
      setError(t('support.validation.requiredFields', 'Subject and description are required'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.response?.data?.message || t('support.errors.createFailed', 'Failed to create ticket'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ticket-container">
      <div className="create-ticket-card">
        <h2>{t('support.createTicket', 'Create Support Ticket')}</h2>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="subject">{t('common.subject', 'Subject')} *</label>
            <input
              id="subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder={t('support.subjectPlaceholder', 'Brief description of your issue')}
              maxLength="100"
              required
            />
            <span className="char-count">{formData.subject.length}/100</span>
          </div>

          <div className="form-group">
            <label htmlFor="description">{t('common.description', 'Description')} *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={t('support.descriptionPlaceholder', 'Please provide detailed information about your issue')}
              rows="6"
              maxLength="2000"
              required
            />
            <span className="char-count">{formData.description.length}/2000</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="module">{t('support.relatedModule', 'Related Module')}</label>
              <select
                id="module"
                name="module"
                value={formData.module}
                onChange={handleChange}
              >
                <option value="general">{t('common.general', 'General')}</option>
                <option value="ecommerce">GlobeMart</option>
                <option value="messaging">LinkUp</option>
                <option value="classifieds">TradePost</option>
                <option value="realestate">HomeSphere</option>
                <option value="fooddelivery">Feastly</option>
                <option value="localmarket">Local Market</option>
                <option value="ridesharing">SwiftRide</option>
                <option value="matrimonial">SoulMatch</option>
                <option value="socialmedia">VibeHub</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">{t('support.category', 'Category')}</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="general">{t('common.general', 'General')}</option>
                <option value="technical">{t('support.category.technical', 'Technical')}</option>
                <option value="payment">{t('support.category.payment', 'Payment')}</option>
                <option value="delivery">{t('support.category.delivery', 'Delivery')}</option>
                <option value="quality">{t('support.category.quality', 'Quality')}</option>
                <option value="account">{t('support.category.account', 'Account')}</option>
                <option value="refund">{t('support.category.refund', 'Refund')}</option>
                <option value="cancellation">{t('support.category.cancellation', 'Cancellation')}</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">{t('support.priority', 'Priority')}</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">{t('support.priority.low', 'Low')}</option>
                <option value="medium">{t('support.priority.medium', 'Medium')}</option>
                <option value="high">{t('support.priority.high', 'High')}</option>
                <option value="urgent">{t('support.priority.urgent', 'Urgent')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contactPhone">{t('support.phone', 'Phone Number')}</label>
              <input
                id="contactPhone"
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder={t('support.phonePlaceholder', 'Optional contact number')}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={loading}
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? t('common.submitting', 'Submitting...') : t('support.submitTicket', 'Submit Ticket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
