import React, { useState, useMemo } from 'react';
import useI18n from '../../hooks/useI18n';
import {
  SUPPORT_MODULE_OPTIONS,
  CATEGORY_OPTIONS_BY_MODULE,
  PRIORITY_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  LANGUAGE_OPTIONS,
} from './supportConstants';
import { getSuggestedPriority, validateWhatsAppNumber } from './supportUtils';
import './CreateTicket.css';

const CreateTicket = ({ onCancel, onSubmit }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    module: 'general',
    category: 'general',
    priority: 'medium',
    orderId: '',
    contactMethod: 'email',
    whatsappNumber: '',
    languagePreference: 'english',
  });
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const moduleCategories = useMemo(
    () => CATEGORY_OPTIONS_BY_MODULE[formData.module] || CATEGORY_OPTIONS_BY_MODULE.general,
    [formData.module]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'module') {
        const nextCategory = CATEGORY_OPTIONS_BY_MODULE[value]?.[0]?.value || 'general';
        return {
          ...prev,
          module: value,
          category: nextCategory,
          priority: getSuggestedPriority(value, nextCategory),
        };
      }
      if (name === 'category') {
        return {
          ...prev,
          category: value,
          priority: getSuggestedPriority(formData.module, value),
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachmentFiles(files.slice(0, 4));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.subject.trim() || !formData.description.trim()) {
      setError(t('support.validation.requiredFields', 'Subject and description are required'));
      return;
    }

    if (formData.contactMethod === 'whatsapp' && formData.whatsappNumber && !validateWhatsAppNumber(formData.whatsappNumber)) {
      setError(t('support.validation.whatsappInvalid', 'Enter a valid 10-digit WhatsApp number'));
      return;
    }

    const payload = new FormData();
    payload.append('subject', formData.subject.trim());
    payload.append('description', formData.description.trim());
    payload.append('module', formData.module);
    payload.append('category', formData.category);
    payload.append('priority', formData.priority);
    payload.append('orderId', formData.orderId.trim());
    payload.append('contactMethod', formData.contactMethod);
    payload.append('whatsappNumber', formData.whatsappNumber.trim());
    payload.append('languagePreference', formData.languagePreference);

    attachmentFiles.forEach((file, index) => {
      payload.append('attachments', file);
    });

    setLoading(true);
    try {
      await onSubmit(payload);
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
              <select id="module" name="module" value={formData.module} onChange={handleChange}>
                {SUPPORT_MODULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">{t('support.category', 'Category')}</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange}>
                {moduleCategories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priority">{t('support.priority', 'Priority')}</label>
              <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="orderId">{t('support.orderId', 'Order / Booking / Transaction ID')}</label>
              <input
                id="orderId"
                type="text"
                name="orderId"
                value={formData.orderId}
                onChange={handleChange}
                placeholder={t('support.orderIdPlaceholder', 'Optional order or booking reference')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contactMethod">{t('support.preferredContactMethod', 'Preferred Contact Method')}</label>
              <select
                id="contactMethod"
                name="contactMethod"
                value={formData.contactMethod}
                onChange={handleChange}
              >
                {CONTACT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="whatsappNumber">{t('support.whatsappNumber', 'WhatsApp Number')}</label>
              <input
                id="whatsappNumber"
                type="tel"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder={t('support.whatsappPlaceholder', '10-digit WhatsApp number')}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="languagePreference">{t('support.languagePreference', 'Language Preference')}</label>
              <select
                id="languagePreference"
                name="languagePreference"
                value={formData.languagePreference}
                onChange={handleChange}
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group file-uploader">
              <label htmlFor="attachments">{t('support.attachments', 'Attachments')}</label>
              <input
                id="attachments"
                type="file"
                name="attachments"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleFilesChange}
              />
              <div className="attachment-preview">
                {attachmentFiles.map((file, index) => (
                  <span key={index} className="attachment-chip">
                    {file.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.submitting', 'Submitting...') : t('support.submitTicket', 'Submit Ticket')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicket;
