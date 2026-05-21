const Business = require('../models/Business');
const Invoice = require('../models/Invoice');
const MiniApp = require('../models/MiniApp');
const MiniAppProduct = require('../models/MiniAppProduct');
const BusinessBuilderLead = require('../models/BusinessBuilderLead');
const BusinessBuilderOrder = require('../models/BusinessBuilderOrder');
const BusinessBuilderEvent = require('../models/BusinessBuilderEvent');
const BusinessBuilderAsset = require('../models/BusinessBuilderAsset');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const castObjectId = (value) => {
  const v = String(value || '').trim();
  if (!v) return null;
  // If it's already an ObjectId string, this will cast; otherwise it will throw.
  if (!mongoose.Types.ObjectId.isValid(v)) {
    throw new Error(`Invalid ObjectId: ${v}`);
  }
  return new mongoose.Types.ObjectId(v);
};

const PLAN_LIMITS = {
  free: { maxMiniApps: 1, maxAiAssetsPerMonth: 5, featuredDirectory: false },
  starter: { maxMiniApps: 3, maxAiAssetsPerMonth: 30, featuredDirectory: false },
  pro: { maxMiniApps: 10, maxAiAssetsPerMonth: 180, featuredDirectory: true },
  enterprise: { maxMiniApps: Number.POSITIVE_INFINITY, maxAiAssetsPerMonth: Number.POSITIVE_INFINITY, featuredDirectory: true },
};

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeSource = (value) => {
  const normalized = String(value || 'direct').trim().toLowerCase();
  const allowed = new Set(['direct', 'qr', 'social', 'poster', 'caption', 'website', 'referral', 'other']);
  return allowed.has(normalized) ? normalized : 'other';
};

const normalizeEventType = (value) => {
  const normalized = String(value || 'view').trim().toLowerCase();
  const mapping = {
    page_view: 'view',
    visit: 'view',
    click: 'contact_click',
    whatsapp: 'whatsapp_click',
    phone_call: 'call_click',
    contact: 'contact_click',
    lead: 'lead_submit',
    order: 'order_start',
    payment: 'order_paid',
    paid: 'order_paid',
  };
  const mapped = mapping[normalized] || normalized;
  const allowed = new Set(['view', 'share', 'contact_click', 'whatsapp_click', 'call_click', 'lead_submit', 'order_start', 'order_paid']);
  return allowed.has(mapped) ? mapped : 'view';
};

const normalizeAssetType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const allowed = new Set(['poster', 'caption', 'website']);
  return allowed.has(normalized) ? normalized : 'other';
};

const normalizeWebhookEventId = (payload = {}) => {
  return String(payload.webhookEventId || payload.eventId || payload.id || payload.transactionId || payload.paymentReference || '').trim();
};

const sanitizeUtm = (utm = {}) => ({
  source: String(utm.source || '').trim().slice(0, 100),
  medium: String(utm.medium || '').trim().slice(0, 100),
  campaign: String(utm.campaign || '').trim().slice(0, 120),
  term: String(utm.term || '').trim().slice(0, 120),
  content: String(utm.content || '').trim().slice(0, 120),
});

const toText = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return value.map((item) => asTrimmed(item)).filter(Boolean).join('\n');
  }
  return typeof value === 'string' ? asTrimmed(value) : fallback;
};

const isFreeMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.FREE_MODE || '').toLowerCase());
const DEFAULT_BUSINESS_BUILDER_MODEL = String(process.env.OPENAI_BUSINESS_BUILDER_MODEL || 'gpt-4.1-mini').trim();

const parseJsonResponse = (content = '', fallbackValue = null) => {
  if (!content) return fallbackValue;
  try {
    const raw = String(content);
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    let candidate = fencedMatch ? fencedMatch[1] : raw;
    const objectMatch = candidate.match(/([\s\S]*?\{[\s\S]*\})/);
    candidate = objectMatch ? objectMatch[1] : candidate;
    return JSON.parse(candidate.trim());
  } catch (_error) {
    return fallbackValue;
  }
};

const asTrimmed = (value = '') => String(value || '').trim();

class BusinessBuilderService {
  // Business CRUD operations
  async createBusiness(userId, businessData) {
    try {
      const business = new Business({
        ...businessData,
        userId,
      });
      return await business.save();
    } catch (error) {
      throw new Error(`Failed to create business: ${error.message}`);
    }
  }

  async getBusinesses(userId) {
    try {
      return await Business.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch businesses: ${error.message}`);
    }
  }

  async getBusinessById(businessId, userId) {
    try {
      const business = await Business.findOne({ businessId, userId });
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      if (error.message === 'Business not found') {
        throw error;
      }
      throw new Error(`Failed to fetch business: ${error.message}`);
    }
  }

  async updateBusiness(businessId, userId, updateData) {
    try {
      const business = await Business.findOneAndUpdate(
        { businessId, userId },
        updateData,
        { new: true, runValidators: true }
      );
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      if (error.message === 'Business not found') {
        throw error;
      }
      throw new Error(`Failed to update business: ${error.message}`);
    }
  }

  async deleteBusiness(businessId, userId) {
    try {
      const business = await Business.findOneAndDelete({ businessId, userId });
      if (!business) {
        throw new Error('Business not found');
      }
      return business;
    } catch (error) {
      if (error.message === 'Business not found') {
        throw error;
      }
      throw new Error(`Failed to delete business: ${error.message}`);
    }
  }

  getPlanLimits(plan = 'free') {
    return PLAN_LIMITS[String(plan || 'free').toLowerCase()] || PLAN_LIMITS.free;
  }

  resetMonthlyUsageIfNeeded(business) {
    if (!business) {
      return false;
    }

    const now = new Date();
    const lastReset = new Date(business?.featureUsage?.lastResetAt || 0);
    const sameMonth = lastReset.getFullYear() === now.getFullYear() && lastReset.getMonth() === now.getMonth();
    if (sameMonth) {
      return false;
    }

    business.featureUsage = {
      ...(business.featureUsage || {}),
      aiAssetsGenerated: 0,
      monthlyLeadsProcessed: 0,
      lastResetAt: now,
    };
    return true;
  }

  async updateBusinessSubscription(businessId, userId, payload = {}) {
    const business = await this.getBusinessById(businessId, userId);
    const nextPlan = String(payload.plan || business?.subscription?.plan || 'free').toLowerCase();
    const limits = this.getPlanLimits(nextPlan);

    business.subscription = {
      ...(business.subscription || {}),
      plan: nextPlan,
      status: payload.status || business?.subscription?.status || 'active',
      setupFeePaid: payload.setupFeePaid !== undefined ? Boolean(payload.setupFeePaid) : Boolean(business?.subscription?.setupFeePaid),
      startedAt: payload.startedAt ? new Date(payload.startedAt) : business?.subscription?.startedAt || new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : business?.subscription?.expiresAt || null,
      monthlyFee: Math.max(toNumber(payload.monthlyFee, business?.subscription?.monthlyFee || 0), 0),
    };

    business.monetization = {
      ...(business.monetization || {}),
      featuredDirectory: payload.featuredDirectory !== undefined
        ? Boolean(payload.featuredDirectory)
        : Boolean(business?.monetization?.featuredDirectory || limits.featuredDirectory),
      featuredUntil: payload.featuredUntil ? new Date(payload.featuredUntil) : business?.monetization?.featuredUntil || null,
      customDomain: payload.customDomain ? String(payload.customDomain).trim() : business?.monetization?.customDomain || '',
      setupFeeAmount: Math.max(toNumber(payload.setupFeeAmount, business?.monetization?.setupFeeAmount || 0), 0),
    };

    await business.save();
    return {
      subscription: business.subscription,
      monetization: business.monetization,
      limits,
    };
  }

  async getBusinessEntitlements(businessId, userId) {
    const business = await this.getBusinessById(businessId, userId);
    this.resetMonthlyUsageIfNeeded(business);
    await business.save();

    const limits = this.getPlanLimits(business?.subscription?.plan);
    return {
      businessId: business.businessId,
      plan: business?.subscription?.plan || 'free',
      status: business?.subscription?.status || 'active',
      limits,
      usage: business.featureUsage || {},
      monetization: business.monetization || {},
    };
  }

  // Business Plan Generation
  async generateBusinessPlan(businessId, userId) {
    try {
      const business = await this.getBusinessById(businessId, userId);

      const costSummary = business.getCostSummary();
      const eligibleSchemes = Business.getEligibleSchemes(
        business.businessType,
        costSummary.oneTimeInvestment,
        business.schemeProfile
      );

      const businessPlan = {
        summary: this.generateSummary(business, costSummary),
        marketAnalysis: this.generateMarketAnalysis(business),
        competitorAnalysis: this.generateCompetitorAnalysis(business),
        revenueModel: this.generateRevenueModel(business, costSummary),
        costEstimation: this.generateCostEstimation(costSummary),
        profitProjection: this.generateProfitProjection(costSummary),
        swot: this.generateSWOT(business),
        legalChecklist: this.generateLegalChecklist(business),
        roadmap30: this.generateRoadmap30(business),
        roadmap90: this.generateRoadmap90(business),
        roadmap180: this.generateRoadmap180(business),
        kpis: this.generatePlanKPIs(business, costSummary),
        risks: this.generateRisks(business),
        mitigations: this.generateMitigations(business),
        milestones: this.generateMilestones(business),
        tasks: this.generatePlanTasks(business),
        progress: this.calculatePlanProgress(this.generatePlanTasks(business)),
        generatedAt: new Date(),
      };

      business.businessPlan = businessPlan;
      await business.save();

      return businessPlan;
    } catch (error) {
      throw new Error(`Failed to generate business plan: ${error.message}`);
    }
  }

  buildFallback10xAiPlan(business, blueprint = {}) {
    const businessName = asTrimmed(blueprint.businessName || business?.businessName || 'Your Business');
    const category = asTrimmed(blueprint.category || business?.businessType || 'Service');
    const location = asTrimmed(blueprint.location || business?.address?.city || 'India');
    const targetCustomers = asTrimmed(blueprint.targetCustomers || business?.launchForm?.targetCustomers || 'local customers');
    const investment = Math.max(toNumber(blueprint.investment, business?.getCostSummary?.().oneTimeInvestment || 0), 0);
    const monthlyTarget = Math.max(toNumber(blueprint.monthlyTarget, business?.costForm?.expectedMonthlyRevenue || 0), 0);
    const monthlyExpense = Math.max(toNumber(business?.getCostSummary?.().monthlyExpenses, monthlyTarget * 0.55), 0);
    const monthlyProfit = monthlyTarget - monthlyExpense;
    const breakEvenMonths = monthlyProfit > 0 ? Math.ceil(investment / monthlyProfit) : null;

    return {
      summary: `${businessName} is positioned as a ${category.toLowerCase()} business in ${location}, targeting ${targetCustomers}.`,
      marketAnalysis: `Demand in ${location} can be captured through trust-led positioning, fast response, and digital discoverability. Focus on repeat use-cases and referral loops.`,
      competitorAnalysis: `Compete against informal sellers and established brands by differentiating on quality consistency, transparent pricing, and service reliability.`,
      revenueModel: category.toLowerCase() === 'ecommerce'
        ? 'Primary: product sales. Secondary: seller commissions, delivery fees, and featured listings.'
        : 'Primary: service packages and consultation. Secondary: subscriptions, maintenance contracts, and partner referrals.',
      costEstimation: `Estimated setup investment: INR ${investment.toLocaleString('en-IN')}. Estimated monthly expenses: INR ${monthlyExpense.toLocaleString('en-IN')}.`,
      profitProjection: `Monthly target revenue: INR ${monthlyTarget.toLocaleString('en-IN')}. Estimated monthly profit: INR ${monthlyProfit.toLocaleString('en-IN')}.${breakEvenMonths ? ` Break-even in approximately ${breakEvenMonths} months.` : ' Improve margin or reduce fixed costs to reach break-even faster.'}`,
      swot: {
        strengths: ['Localized market understanding', 'Fast founder-led decisions', 'Personalized customer handling'],
        weaknesses: ['Early-stage brand awareness', 'Execution dependency on small team', 'Limited initial capital buffer'],
        opportunities: ['Digital acquisition channels', 'Government support schemes', 'Cross-sell/upsell bundles'],
        threats: ['Price wars', 'Seasonal demand swings', 'Customer acquisition cost volatility'],
      },
      legalChecklist: [
        'Finalize structure: Proprietorship / Partnership / Pvt Ltd',
        'Apply Udyam registration if eligible',
        'Confirm GST applicability and invoicing flow',
        'Open current account and setup bookkeeping',
        'Create compliance tracker for monthly/quarterly filings',
      ],
      roadmap30: [
        'Week 1: Finalize positioning, offer design, and pricing ladders',
        'Week 2: Launch landing page, WhatsApp profile, and lead form',
        'Week 3: Acquire first 10 customers and gather testimonials',
        'Week 4: Start paid + organic campaign and optimize conversion funnel',
      ],
      roadmap30: [
        'Week 1: Finalize positioning, offer design, and pricing ladders',
        'Week 2: Launch landing page, WhatsApp profile, and lead form',
        'Week 3: Acquire first 10 customers and gather testimonials',
        'Week 4: Start paid + organic campaign and optimize conversion funnel',
      ],
      roadmap90: [
        'Month 1: Validate offer-market fit and stabilize delivery quality',
        'Month 2: Build repeat acquisition channels and referral engine',
        'Month 3: Add premium tier, tighten unit economics, and prep scale playbook',
      ],
      roadmap180: [
        'Months 4-6: Scale customer acquisition and refine repeat purchase systems',
        'Months 7-9: Expand product/service bundles and launch retention campaigns',
        'Months 10-12: Build a repeatable sales playbook and prepare for next expansion phase',
      ],
      branding: {
        tagline: `${businessName} - Trusted solutions for modern customers`,
        logoPrompt: `Design a modern, trustworthy logo for ${businessName} in ${category}, suitable for ${location} and global customers.`,
        colorPalette: [business?.primaryColor || '#0f766e', business?.secondaryColor || '#10b981', '#0f172a', '#f8fafc'],
      },
      generatedAt: new Date().toISOString(),
      provider: 'fallback',
    };
  }

  normalize10xPlanShape(rawPlan = {}, fallbackPlan = {}) {
    const toArray = (value, fallback = []) => {
      if (Array.isArray(value)) return value.map((item) => asTrimmed(item)).filter(Boolean);
      if (typeof value === 'string') {
        return value
          .split(/\r?\n|,/) 
          .map((item) => asTrimmed(item))
          .filter(Boolean);
      }
      return fallback;
    };

    const toObjectList = (value, fallback = []) => {
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            if (item && typeof item === 'object') {
              return {
                id: asTrimmed(item.id || item.taskId || item.title || ''),
                title: asTrimmed(item.title || item.name || item.task || ''),
                phase: asTrimmed(item.phase || item.stage || ''),
                owner: asTrimmed(item.owner || item.assignee || ''),
                dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
                status: asTrimmed(item.status || item.state || 'pending'),
                description: asTrimmed(item.description || item.details || ''),
              };
            }
            const title = asTrimmed(String(item || ''));
            return title ? { title, phase: '', owner: '', status: 'pending', description: '' } : null;
          })
          .filter(Boolean);
      }
      if (typeof value === 'string') {
        return value
          .split(/\r?\n|,/) 
          .map((item) => asTrimmed(item))
          .filter(Boolean)
          .map((title) => ({ title, phase: '', owner: '', status: 'pending', description: '' }));
      }
      return fallback;
    };

    const toKeyedObject = (value, fallback = {}) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.entries(value).reduce((acc, [key, item]) => {
          if (item !== undefined && item !== null) {
            acc[key] = typeof item === 'string' ? asTrimmed(item) : item;
          }
          return acc;
        }, {});
      }
      return fallback;
    };

    const mergeRoadmap = (...values) => {
      for (const value of values) {
        if (Array.isArray(value)) {
          const items = value.map((item) => asTrimmed(item)).filter(Boolean);
          if (items.length) {
            return items;
          }
        }
        if (typeof value === 'string') {
          const parsed = toArray(value, []);
          if (parsed.length) {
            return parsed;
          }
        }
      }
      return [];
    };

    const swotInput = rawPlan.swot && typeof rawPlan.swot === 'object' ? rawPlan.swot : {};
    const brandingInput = rawPlan.branding && typeof rawPlan.branding === 'object' ? rawPlan.branding : {};

    return {
      summary: asTrimmed(rawPlan.summary || fallbackPlan.summary),
      marketAnalysis: asTrimmed(rawPlan.marketAnalysis || fallbackPlan.marketAnalysis),
      competitorAnalysis: asTrimmed(rawPlan.competitorAnalysis || fallbackPlan.competitorAnalysis),
      revenueModel: asTrimmed(rawPlan.revenueModel || fallbackPlan.revenueModel),
      costEstimation: asTrimmed(rawPlan.costEstimation || fallbackPlan.costEstimation),
      profitProjection: asTrimmed(rawPlan.profitProjection || fallbackPlan.profitProjection),
      swot: {
        strengths: toArray(swotInput.strengths, fallbackPlan?.swot?.strengths || []),
        weaknesses: toArray(swotInput.weaknesses, fallbackPlan?.swot?.weaknesses || []),
        opportunities: toArray(swotInput.opportunities, fallbackPlan?.swot?.opportunities || []),
        threats: toArray(swotInput.threats, fallbackPlan?.swot?.threats || []),
      },
      legalChecklist: mergeRoadmap(rawPlan.legalChecklist, fallbackPlan.legalChecklist),
      roadmap30: mergeRoadmap(
        rawPlan.roadmap30,
        fallbackPlan.roadmap30,
        rawPlan.roadmap90,
        fallbackPlan.roadmap90,
        rawPlan.roadmap180,
        fallbackPlan.roadmap180
      ),
      roadmap90: mergeRoadmap(
        rawPlan.roadmap90,
        fallbackPlan.roadmap90,
        rawPlan.roadmap180,
        fallbackPlan.roadmap180,
        rawPlan.roadmap30,
        fallbackPlan.roadmap30
      ),
      roadmap180: mergeRoadmap(
        rawPlan.roadmap180,
        fallbackPlan.roadmap180,
        rawPlan.roadmap90,
        fallbackPlan.roadmap90,
        rawPlan.roadmap30,
        fallbackPlan.roadmap30
      ),
      kpis: toKeyedObject(rawPlan.kpis, fallbackPlan.kpis || {}),
      risks: toArray(rawPlan.risks, fallbackPlan.risks || []),
      mitigations: toArray(rawPlan.mitigations, fallbackPlan.mitigations || []),
      milestones: toObjectList(rawPlan.milestones, fallbackPlan.milestones || []),
      tasks: toObjectList(rawPlan.tasks, fallbackPlan.tasks || []),
      branding: {
        tagline: asTrimmed(brandingInput.tagline || fallbackPlan?.branding?.tagline),
        logoPrompt: asTrimmed(brandingInput.logoPrompt || fallbackPlan?.branding?.logoPrompt),
        colorPalette: toArray(brandingInput.colorPalette, fallbackPlan?.branding?.colorPalette || []),
      },
      generatedAt: asTrimmed(rawPlan.generatedAt) || new Date().toISOString(),
      provider: asTrimmed(rawPlan.provider || rawPlan.model) || 'openai',
    };
  }

  async callOpenAiBusinessBuilderJson({ systemPrompt, userPrompt, fallback }) {
    if (!apiKey) {
      return fallback();
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: DEFAULT_BUSINESS_BUILDER_MODEL,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 45000,
        }
      );

      const content = response?.data?.choices?.[0]?.message?.content || '';
      const parsed = parseJsonResponse(content);
      if (!parsed || typeof parsed !== 'object') {
        return fallback();
      }
      return parsed;
    } catch (_error) {
      return fallback();
    }
  }

  async generateBusinessPlanAI(businessId, userId, payload = {}) {
    const business = await this.getBusinessById(businessId, userId);
    const fallbackPlan = this.buildFallback10xAiPlan(business, payload || {});

    const systemPrompt = [
      'You are an expert business strategist for Indian SMEs.',
      'Return strictly valid JSON object only.',
      'Required keys: summary, marketAnalysis, competitorAnalysis, revenueModel, costEstimation, profitProjection, swot, legalChecklist, roadmap30, roadmap90, roadmap180, kpis, risks, mitigations, milestones, tasks, branding, generatedAt, provider.',
      'swot must be object with strengths, weaknesses, opportunities, threats as arrays.',
      'legalChecklist, roadmap30, roadmap90, roadmap180 must be arrays of concise strings.',
      'branding must be object with tagline, logoPrompt, colorPalette(array of 3-5 hex codes).',
      'Keep recommendations practical, execution-oriented, and realistic.',
    ].join(' ');

    const userPrompt = JSON.stringify({
      businessContext: {
        businessId: business.businessId,
        businessName: business.businessName,
        businessType: business.businessType,
        city: business?.address?.city || '',
        state: business?.address?.state || '',
        schemeProfile: business.schemeProfile || {},
        costForm: business.costForm || {},
        launchForm: business.launchForm || {},
      },
      blueprint: payload || {},
      expectedLanguage: asTrimmed(payload.language || 'English'),
      objective: 'Create a 10X practical business plan for launch and early growth.',
    });

    const aiRaw = await this.callOpenAiBusinessBuilderJson({
      systemPrompt,
      userPrompt,
      fallback: () => fallbackPlan,
    });

    const normalizedPlan = this.normalize10xPlanShape(aiRaw, fallbackPlan);

    business.businessPlan = {
      summary: normalizedPlan.summary,
      marketAnalysis: normalizedPlan.marketAnalysis,
      competitorAnalysis: normalizedPlan.competitorAnalysis,
      revenueModel: normalizedPlan.revenueModel,
      costEstimation: normalizedPlan.costEstimation,
      profitProjection: normalizedPlan.profitProjection,
      swot: normalizedPlan.swot,
      legalChecklist: normalizedPlan.legalChecklist,
      roadmap30: normalizedPlan.roadmap30,
      roadmap90: normalizedPlan.roadmap90,
      roadmap180: normalizedPlan.roadmap180,
      kpis: normalizedPlan.kpis,
      risks: normalizedPlan.risks,
      mitigations: normalizedPlan.mitigations,
      milestones: normalizedPlan.milestones,
      tasks: normalizedPlan.tasks,
      progress: this.calculatePlanProgress(normalizedPlan.tasks),
      generatedAt: new Date(normalizedPlan.generatedAt || Date.now()),
    };

    await business.save();
    return normalizedPlan;
  }

  async generateBusinessPlanPDF(businessId, userId, payload = {}) {
    const business = await this.getBusinessById(businessId, userId);
    const planInput = payload.plan && typeof payload.plan === 'object' ? payload.plan : {};
    const fallbackPlan = this.buildFallback10xAiPlan(business, payload.blueprint || {});
    const plan = this.normalize10xPlanShape(planInput, fallbackPlan);

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    const writeSection = (title, content) => {
      doc.moveDown(0.8);
      doc.fontSize(13).fillColor('#0f172a').text(title, { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#334155');
      if (Array.isArray(content)) {
        content.forEach((item, index) => {
          doc.text(`${index + 1}. ${asTrimmed(item)}`);
        });
      } else {
        doc.text(asTrimmed(content || '-'));
      }
    };

    doc.fontSize(20).fillColor('#0f172a').text('Business Plan (10X Builder)', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor('#475569').text(asTrimmed(business.businessName || payload.blueprint?.businessName || 'Business'), { align: 'center' });
    doc.fontSize(9).fillColor('#64748b').text(`Generated: ${new Date(plan.generatedAt || Date.now()).toLocaleString('en-IN')}`, { align: 'center' });

    writeSection('Summary', plan.summary);
    writeSection('Market Analysis', plan.marketAnalysis);
    writeSection('Competitor Analysis', plan.competitorAnalysis);
    writeSection('Revenue Model', plan.revenueModel);
    writeSection('Cost Estimation', plan.costEstimation);
    writeSection('Profit Projection', plan.profitProjection);
    writeSection('Legal Checklist', plan.legalChecklist);
    writeSection('30-Day Roadmap', plan.roadmap30);
    writeSection('90-Day Roadmap', plan.roadmap90);
    writeSection('180-Day Roadmap', plan.roadmap180);
    writeSection('Branding Tagline', plan?.branding?.tagline || '');
    writeSection('Logo Prompt', plan?.branding?.logoPrompt || '');
    writeSection('SWOT - Strengths', plan?.swot?.strengths || []);
    writeSection('SWOT - Weaknesses', plan?.swot?.weaknesses || []);
    writeSection('SWOT - Opportunities', plan?.swot?.opportunities || []);
    writeSection('SWOT - Threats', plan?.swot?.threats || []);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
    });
  }

  // Government Schemes
  async getEligibleSchemes(businessId, userId) {
    try {
      const business = await this.getBusinessById(businessId, userId);
      const costSummary = business.getCostSummary();

      return Business.getEligibleSchemes(
        business.businessType,
        costSummary.oneTimeInvestment,
        business.schemeProfile
      );
    } catch (error) {
      throw new Error(`Failed to get eligible schemes: ${error.message}`);
    }
  }

  // Checklist Management
  async updateChecklist(businessId, userId, checklistUpdates) {
    try {
      const business = await this.getBusinessById(businessId, userId);

      checklistUpdates.forEach(update => {
        const item = business.checklist.find(item => item.id === update.id);
        if (item) {
          item.completed = update.completed;
          if (update.completed) {
            item.completedAt = new Date();
          }
        }
      });

      await business.save();
      return business.checklist;
    } catch (error) {
      throw new Error(`Failed to update checklist: ${error.message}`);
    }
  }

  // Invoice CRUD operations
  async createInvoice(userId, invoiceData) {
    try {
      const business = await Business.findOne({
        businessId: invoiceData.businessId,
        userId
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const invoiceNumber = await Invoice.getNextInvoiceNumber(business._id);

      const invoice = new Invoice({
        ...invoiceData,
        userId,
        businessId: business._id,
        invoiceNumber,
        // `totalAmount` is required by schema validation and recalculated in pre-save.
        // Seed a placeholder so validation passes when client omits it.
        totalAmount: Number(invoiceData?.totalAmount || 0),
      });

      return await invoice.save();
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async getInvoices(userId, businessId = null) {
    try {
      const query = { userId };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId });
        if (business) {
          query.businessId = business._id;
        }
      }

      return await Invoice.find(query)
        .populate('businessId', 'businessName businessType')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }
  }

  async getInvoiceById(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOne({ invoiceId, userId })
        .populate('businessId', 'businessName businessType address phone email gstin');

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      if (error.message === 'Invoice not found') {
        throw error;
      }
      throw new Error(`Failed to fetch invoice: ${error.message}`);
    }
  }

  async updateInvoice(invoiceId, userId, updateData) {
    try {
      const invoice = await Invoice.findOneAndUpdate(
        { invoiceId, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      return invoice;
    } catch (error) {
      if (error.message === 'Invoice not found') {
        throw error;
      }
      throw new Error(`Failed to update invoice: ${error.message}`);
    }
  }

  async deleteInvoice(invoiceId, userId) {
    try {
      const invoice = await Invoice.findOneAndDelete({ invoiceId, userId });
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      return invoice;
    } catch (error) {
      if (error.message === 'Invoice not found') {
        throw error;
      }
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  // PDF Generation for Invoices
  async generateInvoicePDF(invoiceId, userId) {
    try {
      const invoice = await this.getInvoiceById(invoiceId, userId);
      const business = invoice.businessId;

      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {});

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoice.invoiceNumber}`);
      doc.text(`Date: ${invoice.createdAt.toDateString()}`);
      doc.text(`Due Date: ${invoice.dueDate.toDateString()}`);
      doc.moveDown();

      // Business details
      doc.text('From:', { underline: true });
      doc.text(business.businessName);
      if (business.address) {
        doc.text(business.formattedAddress);
      }
      doc.text(`Phone: ${business.phone}`);
      doc.text(`Email: ${business.email}`);
      if (business.gstin) {
        doc.text(`GSTIN: ${business.gstin}`);
      }
      doc.moveDown();

      // Customer details
      doc.text('Bill To:', { underline: true });
      doc.text(invoice.customer.name);
      if (invoice.customer.address) {
        doc.text(invoice.customer.address);
      }
      if (invoice.customer.phone) {
        doc.text(`Phone: ${invoice.customer.phone}`);
      }
      if (invoice.customer.email) {
        doc.text(`Email: ${invoice.customer.email}`);
      }
      if (invoice.customer.gstin) {
        doc.text(`GSTIN: ${invoice.customer.gstin}`);
      }
      doc.moveDown();

      // Items table
      doc.text('Items:', { underline: true });
      doc.moveDown(0.5);

      const itemX = 50;
      const qtyX = 300;
      const priceX = 350;
      const totalX = 450;

      doc.text('Description', itemX, doc.y);
      doc.text('Qty', qtyX, doc.y);
      doc.text('Price', priceX, doc.y);
      doc.text('Total', totalX, doc.y);
      doc.moveDown();

      invoice.items.forEach(item => {
        doc.text(item.description, itemX, doc.y);
        doc.text(item.quantity.toString(), qtyX, doc.y);
        doc.text(`₹${item.unitPrice}`, priceX, doc.y);
        doc.text(`₹${item.total}`, totalX, doc.y);
        doc.moveDown();
      });

      doc.moveDown();
      doc.text(`Subtotal: ₹${invoice.subtotal}`);
      if (invoice.discount > 0) {
        doc.text(`Discount: ₹${invoice.discount}`);
      }
      doc.text(`Tax (${invoice.taxRate}%): ₹${invoice.taxAmount}`);
      doc.fontSize(14).text(`Total: ₹${invoice.totalAmount}`, { bold: true });

      if (invoice.notes) {
        doc.moveDown();
        doc.fontSize(10).text(`Notes: ${invoice.notes}`);
      }

      if (invoice.terms) {
        doc.moveDown();
        doc.fontSize(10).text(`Terms: ${invoice.terms}`);
      }

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  // Mini App CRUD operations
  async createMiniApp(userId, miniAppData) {
    try {
      const business = await Business.findOne({
        businessId: miniAppData.businessId,
        userId
      });

      if (!business) {
        throw new Error('Business not found');
      }

      this.resetMonthlyUsageIfNeeded(business);
      const limits = this.getPlanLimits(business?.subscription?.plan);
      const currentMiniAppCount = await MiniApp.countDocuments({ businessId: business._id, userId });
      if (currentMiniAppCount >= limits.maxMiniApps) {
        throw new Error(
          `Mini app limit reached for plan ${business?.subscription?.plan || 'free'}. Upgrade to create more mini apps.`
        );
      }

      const miniApp = new MiniApp({
        ...miniAppData,
        userId,
        businessId: business._id,
      });

      const savedMiniApp = await miniApp.save();
      await savedMiniApp.generateQRData();
      business.featureUsage = {
        ...(business.featureUsage || {}),
        miniAppsCreated: Number(business?.featureUsage?.miniAppsCreated || 0) + 1,
        lastResetAt: business?.featureUsage?.lastResetAt || new Date(),
      };
      await business.save();

      return savedMiniApp;
    } catch (error) {
      throw new Error(`Failed to create mini app: ${error.message}`);
    }
  }

  async getMiniApps(userId, businessId = null) {
    try {
      const query = { userId };
      if (businessId) {
        const business = await Business.findOne({ businessId, userId });
        if (business) {
          query.businessId = business._id;
        }
      }

      return await MiniApp.find(query)
        .populate('businessId', 'businessName businessType')
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(`Failed to fetch mini apps: ${error.message}`);
    }
  }

  async getMiniAppById(miniAppId, userId) {
    try {
      const miniApp = await MiniApp.findOne({ miniAppId, userId })
        .populate('businessId', 'businessName businessType address phone email gstin');

      if (!miniApp) {
        throw new Error('Mini app not found');
      }

      return miniApp;
    } catch (error) {
      if (error.message === 'Mini app not found') {
        throw error;
      }
      throw new Error(`Failed to fetch mini app: ${error.message}`);
    }
  }

  async updateMiniApp(miniAppId, userId, updateData) {
    try {
      const miniApp = await MiniApp.findOneAndUpdate(
        { miniAppId, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!miniApp) {
        throw new Error('Mini app not found');
      }

      return miniApp;
    } catch (error) {
      if (error.message === 'Mini app not found') {
        throw error;
      }
      throw new Error(`Failed to update mini app: ${error.message}`);
    }
  }

  async deleteMiniApp(miniAppId, userId) {
    try {
      const miniApp = await MiniApp.findOneAndDelete({ miniAppId, userId });
      if (!miniApp) {
        throw new Error('Mini app not found');
      }
      return miniApp;
    } catch (error) {
      if (error.message === 'Mini app not found') {
        throw error;
      }
      throw new Error(`Failed to delete mini app: ${error.message}`);
    }
  }

  async createMiniAppProduct(userId, miniAppId, payload = {}) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);

    const product = new MiniAppProduct({
      miniAppId: miniApp._id,
      businessId: miniApp.businessId?._id || miniApp.businessId,
      name: String(payload.name || '').trim(),
      description: String(payload.description || '').trim(),
      category: String(payload.category || '').trim(),
      price: Math.max(toNumber(payload.price, 0), 0),
      discountedPrice: payload.discountedPrice !== undefined ? Math.max(toNumber(payload.discountedPrice, 0), 0) : undefined,
      images: Array.isArray(payload.images) ? payload.images.map((item) => String(item || '').trim()).filter(Boolean) : [],
      stock: Math.max(toNumber(payload.stock, 0), 0),
      trackStock: payload.trackStock !== false,
      sku: String(payload.sku || '').trim() || undefined,
      variants: Array.isArray(payload.variants) ? payload.variants : [],
      status: payload.status || 'Active',
      visibility: payload.visibility || 'Public',
    });

    return product.save();
  }

  async getMiniAppProducts(userId, miniAppId) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);
    return MiniAppProduct.find({ miniAppId: miniApp._id }).sort({ createdAt: -1 });
  }

  async updateMiniAppProduct(userId, miniAppId, productId, payload = {}) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);
    const product = await MiniAppProduct.findOneAndUpdate(
      { productId, miniAppId: miniApp._id },
      payload,
      { new: true, runValidators: true }
    );
    if (!product) {
      throw new Error('Mini app product not found');
    }
    return product;
  }

  async deleteMiniAppProduct(userId, miniAppId, productId) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);
    const product = await MiniAppProduct.findOneAndDelete({ productId, miniAppId: miniApp._id });
    if (!product) {
      throw new Error('Mini app product not found');
    }
    return product;
  }

  async getPublicMiniAppBySlug(slug, options = {}) {
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!normalizedSlug) {
      throw new Error('Mini app slug is required');
    }

    const miniApp = await MiniApp.findOne({ slug: normalizedSlug, status: 'Published' })
      .populate('businessId', 'businessId businessName businessType phone email website address formattedAddress subscription monetization userId');
    if (!miniApp) {
      throw new Error('Published mini app not found');
    }

    if (options.incrementView !== false) {
      await miniApp.incrementView();
    }

    const products = await MiniAppProduct.find({
      miniAppId: miniApp._id,
      status: 'Active',
      visibility: 'Public',
    })
      .sort({ createdAt: -1 })
      .limit(100);

    return {
      miniApp,
      business: miniApp.businessId,
      products,
    };
  }

  async getPublicDirectory(filters = {}) {
    const query = { status: 'Published' };
    if (filters.appType) {
      query.appType = String(filters.appType).trim();
    }

    const rawLimit = Math.max(1, Math.min(60, toNumber(filters.limit, 20)));
    const rawPage = Math.max(1, toNumber(filters.page, 1));
    const skip = (rawPage - 1) * rawLimit;
    const q = String(filters.q || '').trim().toLowerCase();
    const city = String(filters.city || '').trim().toLowerCase();

    const apps = await MiniApp.find(query)
      .populate('businessId', 'businessId businessName businessType address monetization')
      .sort({ 'analytics.views': -1, createdAt: -1 })
      .limit(rawLimit * 4);

    const filtered = apps.filter((app) => {
      const business = app.businessId || {};
      const searchable = [
        app.appName,
        app.appDescription,
        business.businessName,
        business.businessType,
        business.address?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (q && !searchable.includes(q)) {
        return false;
      }
      if (city && String(business?.address?.city || '').trim().toLowerCase() !== city) {
        return false;
      }
      return true;
    });

    const paged = filtered.slice(skip, skip + rawLimit);
    return {
      items: paged,
      pagination: {
        page: rawPage,
        limit: rawLimit,
        total: filtered.length,
        hasNextPage: skip + rawLimit < filtered.length,
      },
    };
  }

  async recordMiniAppEventBySlug(slug, payload = {}, requestMeta = {}) {
    const runtime = await this.getPublicMiniAppBySlug(slug, { incrementView: false });
    const miniApp = runtime.miniApp;
    const business = runtime.business;
    const eventType = normalizeEventType(payload.eventType || 'view');
    const sourceAssetId = String(payload.sourceAssetId || '').trim();
    const source = normalizeSource(payload.source || (sourceAssetId ? 'social' : 'direct'));

    const event = await BusinessBuilderEvent.create({
      miniAppId: miniApp._id,
      businessId: business?._id || miniApp.businessId,
      eventType,
      source,
      sourceAssetId: sourceAssetId || undefined,
      sessionId: String(payload.sessionId || requestMeta.sessionId || '').trim().slice(0, 100),
      visitorId: String(payload.visitorId || '').trim().slice(0, 100),
      utm: sanitizeUtm(payload.utm || {}),
      metadata: {
        ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
        ip: requestMeta.ip || '',
        userAgent: requestMeta.userAgent || '',
      },
    });

    if (eventType === 'view') {
      await miniApp.incrementView();
    }

    if (sourceAssetId) {
      const assetEventStatMap = {
        view: 'views',
        contact_click: 'clicks',
        whatsapp_click: 'clicks',
        call_click: 'clicks',
        share: 'clicks',
        lead_submit: 'leads',
        order_start: 'orders',
        order_paid: 'paidOrders',
      };
      const statKey = assetEventStatMap[eventType];
      if (statKey) {
        await BusinessBuilderAsset.updateOne(
          { assetId: sourceAssetId, businessId: business?._id || miniApp.businessId },
          { $inc: { [`attributionStats.${statKey}`]: 1 } }
        );
      }
    }

    return event;
  }

  async createLeadBySlug(slug, payload = {}) {
    const runtime = await this.getPublicMiniAppBySlug(slug, { incrementView: false });
    const miniApp = runtime.miniApp;
    const business = runtime.business;
    const sourceAssetId = String(payload.sourceAssetId || '').trim();
    const source = normalizeSource(payload.source || (sourceAssetId ? 'social' : 'direct'));

    const lead = await BusinessBuilderLead.create({
      miniAppId: miniApp._id,
      businessId: business?._id || miniApp.businessId,
      customer: {
        name: String(payload.customer?.name || payload.name || '').trim().slice(0, 120),
        phone: String(payload.customer?.phone || payload.phone || '').trim().slice(0, 20),
        email: String(payload.customer?.email || payload.email || '').trim().slice(0, 160),
        message: String(payload.customer?.message || payload.message || '').trim().slice(0, 1200),
      },
      source,
      sourceAssetId: sourceAssetId || undefined,
      utm: sanitizeUtm(payload.utm || {}),
    });

    await BusinessBuilderEvent.create({
      miniAppId: miniApp._id,
      businessId: business?._id || miniApp.businessId,
      eventType: 'lead_submit',
      source,
      sourceAssetId: sourceAssetId || undefined,
      sessionId: String(payload.sessionId || '').trim().slice(0, 100),
      visitorId: String(payload.visitorId || '').trim().slice(0, 100),
      utm: sanitizeUtm(payload.utm || {}),
      metadata: { leadId: lead.leadId },
    });

    await Business.updateOne(
      { _id: business?._id || miniApp.businessId },
      { $inc: { 'featureUsage.monthlyLeadsProcessed': 1 } }
    );

    if (sourceAssetId) {
      await BusinessBuilderAsset.updateOne(
        { assetId: sourceAssetId, businessId: business?._id || miniApp.businessId },
        { $inc: { 'attributionStats.leads': 1 } }
      );
    }

    return lead;
  }

  async createOrderBySlug(slug, payload = {}) {
    const runtime = await this.getPublicMiniAppBySlug(slug, { incrementView: false });
    const miniApp = runtime.miniApp;
    const business = runtime.business;
    const sourceAssetId = String(payload.sourceAssetId || '').trim();
    const source = normalizeSource(payload.source || (sourceAssetId ? 'social' : 'direct'));
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    const items = rawItems
      .map((item) => ({
        name: String(item.name || '').trim().slice(0, 180),
        quantity: Math.max(toNumber(item.quantity, 1), 1),
        unitPrice: Math.max(toNumber(item.unitPrice, 0), 0),
      }))
      .filter((item) => item.name);

    if (items.length === 0) {
      throw new Error('At least one order item is required.');
    }

    const order = new BusinessBuilderOrder({
      miniAppId: miniApp._id,
      businessId: business?._id || miniApp.businessId,
      userId: business?.userId || null,
      customer: {
        name: String(payload.customer?.name || payload.name || '').trim().slice(0, 120),
        phone: String(payload.customer?.phone || payload.phone || '').trim().slice(0, 20),
        email: String(payload.customer?.email || payload.email || '').trim().slice(0, 160),
        address: String(payload.customer?.address || payload.address || '').trim().slice(0, 300),
      },
      items,
      discountAmount: Math.max(toNumber(payload.discountAmount, 0), 0),
      taxAmount: Math.max(toNumber(payload.taxAmount, 0), 0),
      currency: String(payload.currency || 'INR').trim().toUpperCase().slice(0, 10),
      notes: String(payload.notes || '').trim().slice(0, 1600),
      attribution: {
        source,
        sourceAssetId: sourceAssetId || undefined,
        utm: sanitizeUtm(payload.utm || {}),
      },
      status: 'initiated',
      payment: {
        gateway: String(payload.gateway || 'razorpay').trim().toLowerCase(),
        status: 'not_started',
      },
      timeline: [{ status: 'initiated', note: 'Order initiated', at: new Date() }],
    });

    await order.save();

    if (payload.leadId) {
      const lead = await BusinessBuilderLead.findOne({
        leadId: String(payload.leadId).trim(),
        miniAppId: miniApp._id,
      });
      if (lead) {
        order.leadId = lead._id;
        await order.save();
      }
    }

    await BusinessBuilderEvent.create({
      miniAppId: miniApp._id,
      businessId: business?._id || miniApp.businessId,
      eventType: 'order_start',
      source,
      sourceAssetId: sourceAssetId || undefined,
      sessionId: String(payload.sessionId || '').trim().slice(0, 100),
      visitorId: String(payload.visitorId || '').trim().slice(0, 100),
      utm: sanitizeUtm(payload.utm || {}),
      metadata: { orderId: order.orderId, amount: order.totalAmount },
    });

    if (sourceAssetId) {
      await BusinessBuilderAsset.updateOne(
        { assetId: sourceAssetId, businessId: business?._id || miniApp.businessId },
        { $inc: { 'attributionStats.orders': 1 } }
      );
    }

    return order;
  }

  async initiateOrderPayment(orderId, payload = {}) {
    const order = await BusinessBuilderOrder.findOne({ orderId: String(orderId || '').trim() });
    if (!order) {
      throw new Error('Order not found');
    }

    const gateway = String(payload.gateway || order?.payment?.gateway || 'razorpay').trim().toLowerCase();
    const orderReference = payload.orderReference
      ? String(payload.orderReference).trim().slice(0, 140)
      : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    order.payment = {
      ...(order.payment || {}),
      gateway,
      status: 'pending',
      orderReference,
    };
    order.pushStatus('pending_payment', 'Payment initiated');
    await order.save();

    return {
      orderId: order.orderId,
      gateway,
      orderReference,
      amount: order.totalAmount,
      currency: order.currency || 'INR',
      paymentUrl: `${process.env.APP_BASE_URL || ''}/pay/${orderReference}`,
      upiIntent: `upi://pay?pa=${encodeURIComponent(process.env.BUSINESS_UPI_ID || 'merchant@upi')}&pn=${encodeURIComponent('BusinessBuilder')}&am=${Number(order.totalAmount || 0).toFixed(2)}&tn=${encodeURIComponent(order.orderId)}&cu=${encodeURIComponent(order.currency || 'INR')}`,
    };
  }

  async processPaymentWebhook(payload = {}) {
    const candidateOrderId = String(payload.orderId || '').trim();
    const candidateReference = String(payload.orderReference || payload.gatewayOrderId || '').trim();
    const lookupQuery = candidateOrderId
      ? { orderId: candidateOrderId }
      : { 'payment.orderReference': candidateReference };

    const order = await BusinessBuilderOrder.findOne(lookupQuery);
    if (!order) {
      throw new Error('Order not found');
    }

    const webhookEventId = normalizeWebhookEventId(payload);
    const normalizedStatus = String(payload.status || '').trim().toLowerCase();
    const isPaid = ['paid', 'captured', 'success', 'completed'].includes(normalizedStatus);
    const isFailed = ['failed', 'failure', 'cancelled'].includes(normalizedStatus);

    const nextPaymentReference = String(payload.paymentReference || payload.paymentId || '').trim().slice(0, 140);
    const nextMethod = String(payload.method || payload.paymentMethod || '').trim().slice(0, 80);
    const previousStatus = String(order?.payment?.status || '').toLowerCase();
    const previousPaymentReference = String(order?.payment?.paymentReference || '').trim();
    const previousProcessedIds = Array.isArray(order?.payment?.processedWebhookIds)
      ? order.payment.processedWebhookIds
      : [];

    if (webhookEventId && previousProcessedIds.includes(webhookEventId)) {
      return order;
    }

    if (!webhookEventId && previousPaymentReference && previousPaymentReference === nextPaymentReference && previousStatus === (isPaid ? 'paid' : isFailed ? 'failed' : 'pending')) {
      return order;
    }

    order.payment = {
      ...(order.payment || {}),
      status: isPaid ? 'paid' : isFailed ? 'failed' : 'pending',
      paymentReference: nextPaymentReference || order.payment?.paymentReference,
      method: nextMethod || order.payment?.method,
      paidAt: isPaid ? new Date() : order.payment?.paidAt || null,
      webhookPayload: payload,
      processedWebhookIds: Array.from(new Set([...(Array.isArray(order.payment?.processedWebhookIds) ? order.payment.processedWebhookIds : []), ...(webhookEventId ? [webhookEventId] : [])])),
    };

    if (isPaid) {
      if (previousStatus !== 'paid') {
        order.pushStatus('paid', 'Payment confirmed via webhook');
      }
    } else if (isFailed) {
      if (previousStatus !== 'failed') {
        order.pushStatus('failed', 'Payment failed/cancelled');
      }
    }

    await order.save();

    if (isPaid && previousStatus !== 'paid') {
      await BusinessBuilderEvent.create({
        miniAppId: order.miniAppId,
        businessId: order.businessId,
        eventType: 'order_paid',
        source: order?.attribution?.source || 'direct',
        sourceAssetId: order?.attribution?.sourceAssetId || undefined,
        utm: sanitizeUtm(order?.attribution?.utm || {}),
        metadata: { orderId: order.orderId, amount: order.totalAmount },
      });

      if (order?.leadId) {
        await BusinessBuilderLead.updateOne(
          { _id: order.leadId },
          { status: 'converted', convertedOrderId: order._id }
        );
      }

      if (order?.attribution?.sourceAssetId) {
        await BusinessBuilderAsset.updateOne(
          { assetId: order.attribution.sourceAssetId, businessId: order.businessId },
          {
            $inc: {
              'attributionStats.paidOrders': 1,
              'attributionStats.revenue': Number(order.totalAmount || 0),
            },
          }
        );
      }
    }

    return order;
  }

  async getMiniAppOrders(userId, miniAppId, filters = {}) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);
    const query = { miniAppId: miniApp._id };
    if (filters.status) {
      query.status = String(filters.status).trim().toLowerCase();
    }

    const page = Math.max(1, toNumber(filters.page, 1));
    const limit = Math.max(1, Math.min(100, toNumber(filters.limit, 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      BusinessBuilderOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BusinessBuilderOrder.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        hasNextPage: skip + limit < total,
      },
    };
  }

  async updateOrderStatus(userId, orderId, payload = {}) {
    const order = await BusinessBuilderOrder.findOne({ orderId: String(orderId || '').trim() })
      .populate('businessId', 'userId');
    if (!order) {
      throw new Error('Order not found');
    }

    const ownerId = String(order?.businessId?.userId || '');
    if (ownerId && String(userId) !== ownerId) {
      throw new Error('Not authorized to update this order');
    }

    const nextStatus = String(payload.status || '').trim().toLowerCase();
    const allowedStatuses = new Set([
      'pending_payment',
      'confirmed',
      'processing',
      'completed',
      'cancelled',
      'failed',
      'paid',
    ]);
    if (!allowedStatuses.has(nextStatus)) {
      throw new Error('Invalid order status');
    }

    order.pushStatus(nextStatus, String(payload.note || '').trim().slice(0, 200));
    await order.save();
    return order;
  }

  async getMiniAppFunnel(userId, miniAppId, options = {}) {
    const miniApp = await this.getMiniAppById(miniAppId, userId);
    const days = Math.max(1, Math.min(365, toNumber(options.days, 30)));
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventGroups, leadsCount, orderCount, paidSummary] = await Promise.all([
      BusinessBuilderEvent.aggregate([
        { $match: { miniAppId: miniApp._id, createdAt: { $gte: fromDate } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
      BusinessBuilderLead.countDocuments({ miniAppId: miniApp._id, createdAt: { $gte: fromDate } }),
      BusinessBuilderOrder.countDocuments({ miniAppId: miniApp._id, createdAt: { $gte: fromDate } }),
      BusinessBuilderOrder.aggregate([
        { $match: { miniAppId: miniApp._id, createdAt: { $gte: fromDate }, status: { $in: ['paid', 'completed', 'confirmed'] } } },
        { $group: { _id: null, paidCount: { $sum: 1 }, paidRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const views = eventGroups.reduce((sum, group) => group._id === 'view' ? sum + group.count : sum, 0);
    const paidCount = (paidSummary[0]?.paidCount) || 0;
    const paidRevenue = Number((paidSummary[0]?.paidRevenue) || 0);

    return {
      miniAppId: miniApp.miniAppId,
      periodDays: days,
      metrics: {
        views,
        leads: leadsCount,
        orders: orderCount,
        paidOrders: paidCount,
        paidRevenue,
        leadConversionRate: views > 0 ? Number(((leadsCount / views) * 100).toFixed(2)) : 0,
        orderConversionRate: leadsCount > 0 ? Number(((orderCount / leadsCount) * 100).toFixed(2)) : 0,
        paymentSuccessRate: orderCount > 0 ? Number(((paidCount / orderCount) * 100).toFixed(2)) : 0,
      },
    };
  }

  async getBusinessAnalyticsDashboard(userId, businessId, options = {}) {
    const business = await this.getBusinessById(businessId, userId);
    const days = Math.max(1, Math.min(365, toNumber(options.days, 30)));
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [viewsCount, leadsCount, ordersCount, paidSummary, leadGroups, orderGroups, assetDocs, miniApps] = await Promise.all([
      BusinessBuilderEvent.countDocuments({ businessId: business._id, createdAt: { $gte: fromDate }, eventType: 'view' }),
      BusinessBuilderLead.countDocuments({ businessId: business._id, createdAt: { $gte: fromDate } }),
      BusinessBuilderOrder.countDocuments({ businessId: business._id, createdAt: { $gte: fromDate } }),
      BusinessBuilderOrder.aggregate([
        { $match: { businessId: business._id, createdAt: { $gte: fromDate }, status: { $in: ['paid', 'completed', 'confirmed'] } } },
        { $group: { _id: null, paidOrders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      ]),
      BusinessBuilderLead.aggregate([
        { $match: { businessId: business._id, createdAt: { $gte: fromDate } } },
        { $group: { _id: '$source', leads: { $sum: 1 } } },
      ]),
      BusinessBuilderOrder.aggregate([
        { $match: { businessId: business._id, createdAt: { $gte: fromDate } } },
        {
          $group: {
            _id: '$attribution.source',
            orders: { $sum: 1 },
            paidOrders: {
              $sum: {
                $cond: [
                  { $in: [{ $toLower: '$status' }, ['paid', 'confirmed', 'completed']] },
                  1,
                  0,
                ],
              },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $in: [{ $toLower: { $ifNull: ['$status', ''] } }, ['paid', 'confirmed', 'completed']] },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
      BusinessBuilderAsset.find({ businessId: business._id }).sort({ createdAt: -1 }),
      MiniApp.find({ businessId: business._id }).select('miniAppId appName slug analytics status').lean(),
    ]);

    const revenue = Number((paidSummary[0]?.revenue) || 0);
    const paidOrders = Number((paidSummary[0]?.paidOrders) || 0);

    const attributionBySource = {};
    leadGroups.forEach((group) => {
      const source = normalizeSource(group._id || 'direct');
      attributionBySource[source] = attributionBySource[source] || { source, leads: 0, orders: 0, paidOrders: 0, revenue: 0 };
      attributionBySource[source].leads = group.leads;
    });

    orderGroups.forEach((group) => {
      const source = normalizeSource(group._id || 'direct');
      attributionBySource[source] = attributionBySource[source] || { source, leads: 0, orders: 0, paidOrders: 0, revenue: 0 };
      attributionBySource[source].orders = group.orders;
      attributionBySource[source].paidOrders = group.paidOrders;
      attributionBySource[source].revenue = Number(group.revenue || 0);
    });

    const miniAppLeads = await BusinessBuilderLead.aggregate([
      { $match: { businessId: business._id, createdAt: { $gte: fromDate } } },
      { $group: { _id: '$miniAppId', leads: { $sum: 1 } } },
    ]);
    const miniAppOrders = await BusinessBuilderOrder.aggregate([
      { $match: { businessId: business._id, createdAt: { $gte: fromDate } } },
      {
        $group: {
          _id: '$miniAppId',
          orders: { $sum: 1 },
          paidOrders: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: { $ifNull: ['$status', ''] } }, ['paid', 'confirmed', 'completed']] },
                1,
                0,
              ],
            },
          },
          revenue: {
            $sum: {
              $cond: [
                { $in: [{ $toLower: { $ifNull: ['$status', ''] } }, ['paid', 'confirmed', 'completed']] },
                '$totalAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    const miniAppMap = miniApps.reduce((acc, app) => {
      acc[String(app._id)] = {
        miniAppId: app.miniAppId,
        appName: app.appName,
        slug: app.slug,
        status: app.status,
        views: Number(app?.analytics?.views || 0),
        leads: 0,
        orders: 0,
        paidOrders: 0,
        revenue: 0,
      };
      return acc;
    }, {});

    miniAppLeads.forEach((group) => {
      const key = String(group._id || '');
      if (miniAppMap[key]) {
        miniAppMap[key].leads = group.leads;
      }
    });

    miniAppOrders.forEach((group) => {
      const key = String(group._id || '');
      if (miniAppMap[key]) {
        miniAppMap[key].orders = group.orders;
        miniAppMap[key].paidOrders = group.paidOrders;
        miniAppMap[key].revenue = Number(group.revenue || 0);
      }
    });

    const assetAttribution = assetDocs.map((asset) => ({
      assetId: asset.assetId,
      assetType: asset.assetType,
      createdAt: asset.createdAt,
      stats: asset.attributionStats || {},
    }));

    return {
      businessId: business.businessId,
      periodDays: days,
      summary: {
        views: viewsCount,
        leads: leadsCount,
        orders: ordersCount,
        paidOrders,
        revenue,
        leadConversionRate: viewsCount > 0 ? Number(((leadsCount / viewsCount) * 100).toFixed(2)) : 0,
        orderConversionRate: leadsCount > 0 ? Number(((ordersCount / leadsCount) * 100).toFixed(2)) : 0,
        paymentSuccessRate: ordersCount > 0 ? Number(((paidOrders / ordersCount) * 100).toFixed(2)) : 0,
      },
      attributionBySource: Object.values(attributionBySource).sort((left, right) => right.revenue - left.revenue),
      assetAttribution,
      miniApps: Object.values(miniAppMap).sort((left, right) => right.revenue - left.revenue),
    };
  }

  buildGeneratedAsset(assetType, prompt, context = {}) {
    const businessName = String(context.businessName || 'Your Business').trim();
    const serviceArea = String(context.serviceArea || 'your city').trim();
    const offer = String(context.offer || 'high-trust service').trim();
    const cta = String(context.cta || 'Call now').trim();

    if (assetType === 'poster') {
      const content = `${businessName}\nVerified local service in ${serviceArea}\nOffer: ${offer}\n${cta}`;
      return {
        content,
        data: {
          headline: `${businessName} in ${serviceArea}`,
          subhead: `Trusted, fast, and conversion-ready`,
          offer,
          cta,
          suggestedColors: ['#0F766E', '#0C4F56', '#CF8F2D'],
        },
      };
    }

    if (assetType === 'website') {
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${businessName}</title></head><body><h1>${businessName}</h1><p>${offer} for customers in ${serviceArea}.</p><button>${cta}</button></body></html>`;
      return {
        content: html,
        data: {
          sections: ['hero', 'about', 'services', 'contact'],
          seoTitle: `${businessName} | ${serviceArea}`,
          seoDescription: `${businessName} offers ${offer} in ${serviceArea}.`,
        },
      };
    }

    const caption = `${businessName} is now serving ${serviceArea}. ${offer}. ${cta}. #localbusiness #growth`;
    return {
      content: caption,
      data: {
        shortCaption: caption,
        variants: [
          `${businessName}: ${offer} in ${serviceArea}. ${cta}.`,
          `Looking for trusted support in ${serviceArea}? ${businessName} is here. ${cta}.`,
        ],
      },
    };
  }

  async generateAIAsset(userId, businessId, payload = {}) {
    const business = await this.getBusinessById(businessId, userId);
    this.resetMonthlyUsageIfNeeded(business);

    const plan = String(business?.subscription?.plan || 'free').toLowerCase();
    const limits = this.getPlanLimits(plan);
    const currentUsage = Number(business?.featureUsage?.aiAssetsGenerated || 0);

    if (currentUsage >= limits.maxAiAssetsPerMonth) {
      throw new Error(`AI asset monthly limit reached for ${plan} plan.`);
    }

    const assetType = normalizeAssetType(payload.assetType);
    if (!['poster', 'caption', 'website'].includes(assetType)) {
      throw new Error('assetType must be poster, caption, or website.');
    }

    const prompt = String(payload.prompt || '').trim().slice(0, 2000);
    const generated = this.buildGeneratedAsset(assetType, prompt, {
      businessName: business.businessName,
      serviceArea: business?.address?.city || '',
      offer: payload.offer || '',
      cta: payload.cta || '',
    });

    const asset = await BusinessBuilderAsset.create({
      businessId: business._id,
      userId: business.userId,
      assetType,
      prompt,
      content: generated.content,
      data: {
        ...generated.data,
        prompt,
      },
      status: payload.status || 'draft',
    });

    business.featureUsage = {
      ...(business.featureUsage || {}),
      aiAssetsGenerated: currentUsage + 1,
      lastResetAt: business?.featureUsage?.lastResetAt || new Date(),
    };
    await business.save();

    return {
      asset,
      entitlements: {
        plan,
        usage: business.featureUsage,
        limits,
      },
    };
  }

  async getAIAssets(userId, businessId, filters = {}) {
    const business = await this.getBusinessById(businessId, userId);
    const query = { businessId: business._id };
    if (filters.assetType) {
      query.assetType = String(filters.assetType).trim().toLowerCase();
    }
    return BusinessBuilderAsset.find(query).sort({ createdAt: -1 });
  }

  // Private helper methods for business plan generation
  generateSummary(business, costSummary) {
    return `${business.businessName} is a ${business.businessType.toLowerCase()} business located in ${business.address.city || 'India'}. The business requires an initial investment of ₹${costSummary.oneTimeInvestment.toLocaleString()} and expects monthly revenue of ₹${costSummary.revenue.toLocaleString()}.`;
  }

  generateMarketAnalysis(business) {
    const markets = {
      Retail: 'Growing retail sector with increasing online presence',
      Service: 'Service industry with demand for professional services',
      Food: 'Food industry with focus on quality and hygiene',
      Education: 'Education sector with emphasis on skill development',
      Health: 'Healthcare sector with preventive care focus',
      Travel: 'Travel and tourism industry recovering post-pandemic',
      RealEstate: 'Real estate market with residential and commercial demand',
      Beauty: 'Beauty and wellness industry with premium services',
      Fitness: 'Fitness industry with health-conscious consumers',
      Other: 'Niche market with specialized demand',
    };

    return markets[business.businessType] || markets.Other;
  }

  generateCompetitorAnalysis(business) {
    return `Competition analysis for ${business.businessType.toLowerCase()} sector shows moderate competition with opportunities for differentiation through quality service, competitive pricing, and customer loyalty programs.`;
  }

  generateRevenueModel(business, costSummary) {
    return `Revenue model focuses on ${business.businessType.toLowerCase()} services with expected monthly revenue of ₹${costSummary.revenue.toLocaleString()}. Primary revenue streams include direct sales and service fees.`;
  }

  generateCostEstimation(costSummary) {
    return `Initial investment: ₹${costSummary.oneTimeInvestment.toLocaleString()}, Monthly expenses: ₹${costSummary.monthlyExpenses.toLocaleString()}, Expected monthly profit: ₹${costSummary.monthlyProfit.toLocaleString()}.`;
  }

  generateProfitProjection(costSummary) {
    const projection = [];
    for (let month = 1; month <= 12; month++) {
      const cumulativeProfit = costSummary.monthlyProfit * month - (month === 1 ? costSummary.oneTimeInvestment : 0);
      projection.push(`Month ${month}: ₹${cumulativeProfit.toLocaleString()}`);
    }
    return projection.join(', ');
  }

  generateSWOT(business) {
    return {
      strengths: ['Local market knowledge', 'Personalized service', 'Cost-effective operations'],
      weaknesses: ['Limited initial capital', 'Single location dependency', 'Market competition'],
      opportunities: ['Growing local economy', 'Digital marketing potential', 'Service expansion'],
      threats: ['Economic fluctuations', 'New market entrants', 'Changing customer preferences'],
    };
  }

  generateRoadmap30(business) {
    return [
      'Week 1: Finalize positioning, offer design, and pricing ladders',
      'Week 2: Launch landing page, WhatsApp profile, and lead form',
      'Week 3: Acquire first 10 customers and gather testimonials',
      'Week 4: Start paid + organic campaign and optimize conversion funnel',
    ];
  }

  generateRoadmap90(business) {
    return 'Month 1-2: Business setup and registration, Month 3-4: Initial marketing and customer acquisition, Month 5-6: Service delivery optimization, Month 7-8: Customer feedback integration, Month 9-10: Revenue stabilization, Month 11-12: Expansion planning.';
  }

  generateRoadmap180(business) {
    return 'Year 1: Establish strong local presence and customer base, Year 2: Digital transformation, expand services, and consider additional locations. Focus on building brand reputation and sustainable growth.';
  }
}

module.exports = new BusinessBuilderService();

