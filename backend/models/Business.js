const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      unique: true,
      required: true,
      default: () => `biz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    businessType: {
      type: String,
      enum: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    website: {
      type: String,
      trim: true,
      sparse: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true, match: /^[1-9][0-9]{5}$/ },
      country: { type: String, default: 'India' },
    },
    primaryColor: {
      type: String,
      default: '#0f766e',
      match: /^#[0-9A-F]{6}$/i,
    },
    secondaryColor: {
      type: String,
      default: '#10b981',
      match: /^#[0-9A-F]{6}$/i,
    },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Inactive', 'Suspended'],
      default: 'Draft',
    },
    businessPlan: {
      summary: String,
      marketAnalysis: String,
      competitorAnalysis: String,
      revenueModel: String,
      costEstimation: String,
      profitProjection: String,
      swot: String,
      roadmap90: String,
      roadmap180: String,
      generatedAt: Date,
    },
    costForm: {
      rent: { type: Number, default: 0, min: 0 },
      staffSalary: { type: Number, default: 0, min: 0 },
      inventory: { type: Number, default: 0, min: 0 },
      marketing: { type: Number, default: 0, min: 0 },
      licenseCost: { type: Number, default: 0, min: 0 },
      equipment: { type: Number, default: 0, min: 0 },
      utilities: { type: Number, default: 0, min: 0 },
      otherMonthly: { type: Number, default: 0, min: 0 },
      expectedMonthlyRevenue: { type: Number, default: 0, min: 0 },
    },
    schemeProfile: {
      isWomenEntrepreneur: { type: Boolean, default: false },
      isKeralaBased: { type: Boolean, default: false },
      isSCSTEntrepreneur: { type: Boolean, default: false },
      isMinorityEntrepreneur: { type: Boolean, default: false },
    },
    checklist: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      completed: { type: Boolean, default: false },
      completedAt: Date,
    }],
    launchForm: {
      businessIdea: String,
      targetCustomers: String,
      serviceArea: String,
      plannedBudget: String,
      productsServices: String,
      pricingModel: String,
      marketingPlan: String,
      executionNotes: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
BusinessSchema.index({ userId: 1, status: 1 });
BusinessSchema.index({ businessType: 1 });
BusinessSchema.index({ 'address.city': 1 });
BusinessSchema.index({ createdAt: -1 });

// Virtual for formatted address
BusinessSchema.virtual('formattedAddress').get(function() {
  const addr = this.address;
  return [addr.street, addr.city, addr.state, addr.pincode, addr.country]
    .filter(Boolean)
    .join(', ');
});

// Instance method to calculate cost summary
BusinessSchema.methods.getCostSummary = function() {
  const cf = this.costForm;
  const oneTimeInvestment = cf.inventory + cf.licenseCost + cf.equipment;
  const monthlyExpenses = cf.rent + cf.staffSalary + cf.marketing + cf.utilities + cf.otherMonthly;
  const revenue = cf.expectedMonthlyRevenue;
  const monthlyProfit = revenue - monthlyExpenses;
  const breakEvenMonths = monthlyProfit > 0 ? Math.ceil(oneTimeInvestment / monthlyProfit) : null;

  return {
    oneTimeInvestment,
    monthlyExpenses,
    revenue,
    monthlyProfit,
    breakEvenMonths,
  };
};

// Static method to find eligible government schemes
BusinessSchema.statics.getEligibleSchemes = function(businessType, budget, schemeProfile) {
  const schemes = [
    {
      id: 'mudra',
      name: 'PM Mudra Loan',
      fit: 'Micro businesses and first-time entrepreneurs',
      supports: ['Retail', 'Service', 'Food', 'Beauty', 'Fitness', 'Other'],
      budgetCeiling: 1000000,
      benefit: 'Collateral-free loans through Shishu, Kishore, and Tarun categories.',
      tags: ['loan', 'working capital'],
    },
    {
      id: 'pmegp',
      name: 'PMEGP',
      fit: 'Manufacturing and service startups seeking subsidy support',
      supports: ['Retail', 'Service', 'Food', 'Education', 'Other'],
      budgetCeiling: 5000000,
      benefit: 'Subsidy-linked credit for new micro-enterprise setup.',
      tags: ['subsidy', 'new unit'],
    },
    {
      id: 'msme',
      name: 'MSME / Udyam Registration',
      fit: 'All eligible micro/small/medium enterprises',
      supports: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      budgetCeiling: Infinity,
      benefit: 'Improves access to tenders, bank loans, and government benefits.',
      tags: ['registration', 'compliance'],
    },
    {
      id: 'women',
      name: 'Women Entrepreneur Support',
      fit: 'Women-led businesses requiring credit or training support',
      supports: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      budgetCeiling: Infinity,
      benefit: 'Special interest concessions and mentoring under women-focused schemes.',
      tags: ['women'],
      womenOnly: true,
    },
    {
      id: 'kerala-startup',
      name: 'Kerala Startup Mission Programs',
      fit: 'Innovation-led startups in Kerala',
      supports: ['Service', 'Education', 'Health', 'Travel', 'RealEstate', 'Other'],
      budgetCeiling: Infinity,
      benefit: 'Incubation, grants, and market-linkage support through KSUM channels.',
      tags: ['kerala', 'innovation'],
      keralaOnly: true,
    },
    {
      id: 'scst',
      name: 'SC/ST Entrepreneur Schemes',
      fit: 'SC/ST-owned enterprises for credit and procurement support',
      supports: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      budgetCeiling: Infinity,
      benefit: 'Targeted subsidy and credit support with priority procurement programs.',
      tags: ['scst'],
      scstOnly: true,
    },
    {
      id: 'minority',
      name: 'Minority Entrepreneur Schemes',
      fit: 'Minority-owned startups and self-employment ventures',
      supports: ['Retail', 'Service', 'Food', 'Education', 'Health', 'Travel', 'RealEstate', 'Beauty', 'Fitness', 'Other'],
      budgetCeiling: Infinity,
      benefit: 'Concessional loans and skilling support for minority entrepreneurs.',
      tags: ['minority'],
      minorityOnly: true,
    },
  ];

  const parsedBudget = parseFloat(budget) || 0;

  return schemes.filter(scheme => {
    const supportsType = scheme.supports.includes(businessType) || scheme.supports.includes('Other');
    const withinBudget = parsedBudget <= scheme.budgetCeiling;
    if (!supportsType || !withinBudget) return false;

    if (scheme.womenOnly && !schemeProfile.isWomenEntrepreneur) return false;
    if (scheme.keralaOnly && !schemeProfile.isKeralaBased) return false;
    if (scheme.scstOnly && !schemeProfile.isSCSTEntrepreneur) return false;
    if (scheme.minorityOnly && !schemeProfile.isMinorityEntrepreneur) return false;

    return true;
  });
};

module.exports = mongoose.model('Business', BusinessSchema);
