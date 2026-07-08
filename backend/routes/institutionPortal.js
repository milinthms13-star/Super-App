const express = require('express');
const router = express.Router();
const FinanceLead = require('../models/FinanceLead');
const FinanceInstitution = require('../models/FinanceInstitution');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

// Middleware to check institution role
const requireInstitution = (req, res, next) => {
  if (req.user.role !== 'institution') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Institution role required.',
    });
  }
  next();
};

/**
 * GET /api/institution/profile
 * Get institution profile
 */
router.get('/profile', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution profile not found',
      });
    }

    res.json({
      success: true,
      institution,
    });
  } catch (error) {
    logger.error(`Get institution profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * PATCH /api/institution/profile
 * Update institution profile
 */
router.patch('/profile', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution profile not found',
      });
    }

    const allowedUpdates = [
      'contactPerson',
      'contactEmail',
      'contactPhone',
      'website',
      'description',
      'headquarters',
      'branchesCount',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        institution[field] = req.body[field];
      }
    });

    await institution.save();

    res.json({
      success: true,
      institution,
    });
  } catch (error) {
    logger.error(`Update institution profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * GET /api/institution/leads
 * Get leads assigned to this institution
 */
router.get('/leads', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const { status, page = 1, limit = 20, search } = req.query;

    const query = { institution: institution._id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { leadId: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      FinanceLead.find(query)
        .populate('consultant', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      FinanceLead.countDocuments(query),
    ]);

    res.json({
      success: true,
      leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Get institution leads error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * GET /api/institution/leads/:leadId
 * Get detailed lead information
 */
router.get('/leads/:leadId', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const lead = await FinanceLead.findOne({
      leadId: req.params.leadId,
      institution: institution._id,
    })
      .populate('consultant', 'name email phone')
      .lean();

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    res.json({
      success: true,
      lead,
    });
  } catch (error) {
    logger.error(`Get institution lead details error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * PATCH /api/institution/leads/:leadId/review
 * Update lead review status
 */
router.patch('/leads/:leadId/review', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const lead = await FinanceLead.findOne({
      leadId: req.params.leadId,
      institution: institution._id,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const { decision, note, offeredAmount, offeredRate, offeredTenure } = req.body;

    if (!decision || !['approved', 'rejected', 'under-review'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid decision. Must be approved, rejected, or under-review',
      });
    }

    lead.status = decision;
    lead.statusTimeline.push({
      status: decision,
      timestamp: new Date(),
      note: note || `${decision} by ${institution.name}`,
    });

    if (decision === 'approved') {
      lead.institutionOffer = {
        amount: offeredAmount || lead.amount,
        interestRate: offeredRate,
        tenureMonths: offeredTenure || lead.preferredTenureMonths,
        offeredAt: new Date(),
      };
    }

    await lead.save();

    logger.info(`Lead ${req.params.leadId} ${decision} by institution ${institution.name}`);

    res.json({
      success: true,
      lead,
    });
  } catch (error) {
    logger.error(`Institution lead review error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * GET /api/institution/dashboard
 * Get institution dashboard metrics
 */
router.get('/dashboard', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const { startDate, endDate } = req.query;

    const query = { institution: institution._id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [
      totalLeads,
      pendingReview,
      approved,
      rejected,
      leadsData,
    ] = await Promise.all([
      FinanceLead.countDocuments(query),
      FinanceLead.countDocuments({ ...query, status: 'institution-review' }),
      FinanceLead.countDocuments({ ...query, status: 'approved' }),
      FinanceLead.countDocuments({ ...query, status: 'rejected' }),
      FinanceLead.find(query).select('amount loanCategory createdAt status').lean(),
    ]);

    const totalAmount = leadsData.reduce((sum, lead) => sum + lead.amount, 0);
    const approvedAmount = leadsData
      .filter((l) => l.status === 'approved')
      .reduce((sum, lead) => sum + lead.amount, 0);

    const byCategory = {};
    leadsData.forEach((lead) => {
      byCategory[lead.loanCategory] = (byCategory[lead.loanCategory] || 0) + 1;
    });

    const byStatus = {};
    leadsData.forEach((lead) => {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    });

    // Calculate conversion rate
    const conversionRate = totalLeads > 0 ? (approved / totalLeads) * 100 : 0;

    // Recent leads
    const recentLeads = await FinanceLead.find(query)
      .sort({ createdAt: -1 })
      .limit(10)
      .select('leadId fullName phone amount loanCategory status createdAt')
      .lean();

    res.json({
      success: true,
      dashboard: {
        overview: {
          totalLeads,
          pendingReview,
          approved,
          rejected,
          totalAmount,
          approvedAmount,
          conversionRate: conversionRate.toFixed(2),
        },
        byCategory,
        byStatus,
        recentLeads,
      },
    });
  } catch (error) {
    logger.error(`Institution dashboard error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * GET /api/institution/offers
 * Get/manage loan offers
 */
router.get('/offers', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    res.json({
      success: true,
      offers: institution.loanProducts || [],
    });
  } catch (error) {
    logger.error(`Get institution offers error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * POST /api/institution/offers
 * Add/update loan offer
 */
router.post('/offers', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const { loanCategory, minAmount, maxAmount, interestRate, maxTenure, processingFee } = req.body;

    if (!loanCategory || !minAmount || !maxAmount || !interestRate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const offer = {
      loanCategory,
      minAmount,
      maxAmount,
      interestRate,
      maxTenure: maxTenure || 60,
      processingFee: processingFee || 0,
      active: true,
      updatedAt: new Date(),
    };

    // Check if offer exists for this category
    const existingIndex = institution.loanProducts.findIndex(
      (p) => p.loanCategory === loanCategory
    );

    if (existingIndex >= 0) {
      institution.loanProducts[existingIndex] = offer;
    } else {
      institution.loanProducts.push(offer);
    }

    await institution.save();

    res.json({
      success: true,
      offers: institution.loanProducts,
    });
  } catch (error) {
    logger.error(`Add institution offer error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

/**
 * GET /api/institution/analytics
 * Get institution analytics
 */
router.get('/analytics', authMiddleware, requireInstitution, async (req, res) => {
  try {
    const institution = await FinanceInstitution.findOne({ user: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found',
      });
    }

    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const leads = await FinanceLead.find({
      institution: institution._id,
      createdAt: { $gte: start, $lte: end },
    })
      .select('amount loanCategory status createdAt updatedAt')
      .lean();

    // Time series data
    const dailyData = {};
    leads.forEach((lead) => {
      const date = new Date(lead.createdAt).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, count: 0, amount: 0 };
      }
      dailyData[date].count++;
      dailyData[date].amount += lead.amount;
    });

    const timeSeries = Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Category performance
    const categoryPerformance = {};
    leads.forEach((lead) => {
      if (!categoryPerformance[lead.loanCategory]) {
        categoryPerformance[lead.loanCategory] = {
          category: lead.loanCategory,
          total: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
          totalAmount: 0,
        };
      }
      categoryPerformance[lead.loanCategory].total++;
      categoryPerformance[lead.loanCategory].totalAmount += lead.amount;
      if (lead.status === 'approved') categoryPerformance[lead.loanCategory].approved++;
      if (lead.status === 'rejected') categoryPerformance[lead.loanCategory].rejected++;
      if (lead.status === 'institution-review') categoryPerformance[lead.loanCategory].pending++;
    });

    // TAT (Turnaround Time) analysis
    const completedLeads = leads.filter((l) =>
      ['approved', 'rejected'].includes(l.status)
    );
    const avgTAT =
      completedLeads.length > 0
        ? completedLeads.reduce((sum, lead) => {
            const tat = new Date(lead.updatedAt) - new Date(lead.createdAt);
            return sum + tat / (1000 * 60 * 60); // hours
          }, 0) / completedLeads.length
        : 0;

    res.json({
      success: true,
      analytics: {
        period: { startDate: start, endDate: end },
        timeSeries,
        categoryPerformance: Object.values(categoryPerformance),
        turnaroundTime: {
          average: Math.round(avgTAT),
          unit: 'hours',
        },
      },
    });
  } catch (error) {
    logger.error(`Institution analytics error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
