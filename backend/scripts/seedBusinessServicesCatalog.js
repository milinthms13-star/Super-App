/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const BusinessServiceCatalog = require('../models/BusinessServiceCatalog');

const catalogSeed = {
  key: 'default',
  categories: [
    {
      id: 'gst-services',
      name: 'GST Registration / Filing',
      icon: '📊',
      description: 'GST registration, monthly filing, and compliance assistance for growing businesses.',
      services: [
        { id: 'gst-registration', name: 'GST Registration', price: '₹1,500', duration: '3-5 days' },
        { id: 'gst-filing-basic', name: 'GST Filing Basic', price: '₹499', duration: '2-3 days' },
      ],
    },
    {
      id: 'company-registration',
      name: 'Company Registration',
      icon: '🏢',
      description: 'Entity registration for proprietorships, partnerships, LLPs, and private limited companies.',
      services: [
        { id: 'proprietorship', name: 'Proprietorship Registration', price: '₹2,500', duration: '5-7 days' },
        { id: 'private-limited', name: 'Private Limited Company Registration', price: '₹25,000', duration: '20-25 days' },
      ],
    },
    {
      id: 'legal-consultation',
      name: 'Legal Consultation',
      icon: '⚖️',
      description: 'Legal advice for agreements, notices, contract review, and compliance queries.',
      services: [
        { id: 'company-law-consultation', name: 'Company Law Consultation', price: '₹2,000/hour', duration: '1 hour' },
      ],
    },
  ],
  serviceDetails: {
    'gst-registration': {
      overview: 'GST registration service with document preparation, filing, and follow-up support.',
      included: ['GST application filing', 'Document review', 'Consultant support'],
      requiredDocuments: ['PAN card', 'Aadhaar card', 'Business address proof'],
      timeline: ['Request submitted', 'Documents pending', 'Under review', 'Application filed', 'Completed'],
      packages: [
        { tier: 'Basic', price: '₹1,500', description: 'Essential filing support', features: ['Form submission', 'Document review'] },
        { tier: 'Standard', price: '₹2,500', description: 'Extended support', features: ['Basic package', 'Priority response'] },
      ],
      consultant: { name: 'CA Arjun Menon', title: 'GST Specialist', rating: 4.9, reviews: 74, experience: '10 years' },
      vendor: {
        name: 'Sahyog Business Partners',
        title: 'GST Service Partner',
        rating: 4.8,
        reviews: 120,
        responseTime: 'Within 24 hours',
        location: 'Pan-India',
        type: 'Verified GST Partner',
        highlights: ['Priority support', 'Expert documentation team'],
      },
      faqs: [
        { question: 'How long does GST registration take?', answer: 'Most applications are processed within 3-5 business days.' },
      ],
      refundPolicy: 'Refund available before filing only.',
    },
  },
  defaultServiceDetails: {
    overview: 'A complete business service designed to help you grow with expert support and trusted delivery.',
    included: ['Service planning', 'Documentation support', 'Consultant review', 'Post-delivery guidance'],
    requiredDocuments: ['PAN card', 'Aadhaar card', 'Business proof'],
    timeline: ['Request submitted', 'Under review', 'Processing', 'Completed'],
    packages: [
      { tier: 'Basic', price: '₹2,499', description: 'Essential support to get started.', features: ['Core service', 'Standard support'] },
      { tier: 'Standard', price: '₹4,999', description: 'Extended support with advisor input.', features: ['Basic package', 'Priority support'] },
    ],
    consultant: { name: 'Expert Consultant', title: 'Business Specialist', rating: 4.8, reviews: 21, experience: '8 years' },
    vendor: {
      name: 'Trusted Partner Network',
      title: 'Verified Service Marketplace',
      rating: 4.7,
      reviews: 320,
      responseTime: 'Same-day response',
      location: 'Nationwide',
      type: 'Marketplace Partner',
      highlights: ['Same-day response', 'Verified service delivery'],
    },
    faqs: [{ question: 'How long does this service take?', answer: 'Delivery times vary by service, typically 5-15 days.' }],
    refundPolicy: 'Refunds depend on the service stage. Contact support for detailed policy.',
  },
  starterPackage: {
    name: 'Start Your Business in 7 Days',
    price: '₹15,000',
    originalPrice: '₹25,000',
    discount: '40% OFF',
    services: ['GST Registration', 'MSME / Udyam Registration', 'Trade License', 'Professional Logo Design'],
    features: ['Complete documentation support', 'Priority handling by experts', 'Post-registration handholding'],
  },
  consultationOptions: [
    { title: '📞 Quick Consultation', desc: '15-minute phone consultation for immediate guidance', price: '₹500' },
    { title: '💼 Business Planning', desc: 'Comprehensive business plan and strategy consultation', price: '₹2,500' },
    { title: '📊 Financial Consultation', desc: 'GST, tax, and financial planning advice', price: '₹1,500' },
    { title: '⚖️ Legal Consultation', desc: 'Legal advice and documentation review', price: '₹2,000' },
  ],
};

async function run() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('Missing MONGODB_URI or MONGO_URI in environment.');
  }

  await mongoose.connect(mongoUri);
  await BusinessServiceCatalog.updateOne({ key: 'default' }, { $set: catalogSeed }, { upsert: true });
  console.log('Business services catalog seeded successfully.');
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Failed to seed business services catalog:', error.message);
  process.exit(1);
});
