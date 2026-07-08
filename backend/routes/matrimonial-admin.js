const express = require('express');
const router = express.Router();
const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const Message = require('../models/Message');
const Report = require('../models/Report');
const { cacheService } = require('../services/cacheService');
const { errorTrackingService } = require('../services/errorTrackingService');

// Middleware to check admin role
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user?.id, context: 'admin-auth' });
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Get dashboard statistics
router.get('/dashboard/stats', isAdmin, async (req, res) => {
  try {
    const cacheKey = 'admin:dashboard:stats';
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(cached);

    const [
      totalProfiles,
      activeProfiles,
      pendingVerification,
      reportedProfiles,
      totalUsers,
      activeUsers,
      premiumUsers,
      recentSignups,
      totalMessages,
      totalReports,
      unresolvedReports,
      totalMatches,
      successfulMatches
    ] = await Promise.all([
      MatrimonialProfile.countDocuments(),
      MatrimonialProfile.countDocuments({ status: 'active' }),
      MatrimonialProfile.countDocuments({ 'verification.status': 'pending' }),
      MatrimonialProfile.countDocuments({ reportCount: { $gt: 0 } }),
      User.countDocuments({ 'roles.matrimonial': true }),
      User.countDocuments({ 'roles.matrimonial': true, lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ 'roles.matrimonial': true, 'subscription.tier': { $in: ['premium', 'elite'] } }),
      User.countDocuments({ 'roles.matrimonial': true, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Message.countDocuments({ module: 'matrimonial' }),
      Report.countDocuments({ module: 'matrimonial' }),
      Report.countDocuments({ module: 'matrimonial', status: { $in: ['pending', 'investigating'] } }),
      MatrimonialProfile.aggregate([{ $group: { _id: null, total: { $sum: '$matchCount' } } }]),
      MatrimonialProfile.countDocuments({ status: 'matched' })
    ]);

    const stats = {
      profiles: {
        total: totalProfiles,
        active: activeProfiles,
        pendingVerification,
        reported: reportedProfiles
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        premium: premiumUsers,
        recentSignups
      },
      engagement: {
        totalMessages,
        totalMatches: totalMatches[0]?.total || 0,
        successfulMatches
      },
      moderation: {
        totalReports,
        unresolvedReports,
        resolutionRate: totalReports > 0 ? ((totalReports - unresolvedReports) / totalReports * 100).toFixed(1) : 0
      }
    };

    await cacheService.set(cacheKey, stats, 300); // Cache for 5 minutes
    res.json(stats);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-dashboard-stats' });
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Get profiles with advanced filters
router.get('/profiles', isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      verificationStatus,
      gender,
      minAge,
      maxAge,
      location,
      religion,
      education,
      profession,
      subscriptionTier,
      hasReports,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    if (status) filter.status = status;
    if (verificationStatus) filter['verification.status'] = verificationStatus;
    if (gender) filter.gender = gender;
    if (minAge || maxAge) {
      filter.age = {};
      if (minAge) filter.age.$gte = parseInt(minAge);
      if (maxAge) filter.age.$lte = parseInt(maxAge);
    }
    if (location) filter['location.city'] = new RegExp(location, 'i');
    if (religion) filter.religion = religion;
    if (education) filter.education = new RegExp(education, 'i');
    if (profession) filter.profession = new RegExp(profession, 'i');
    if (hasReports === 'true') filter.reportCount = { $gt: 0 };
    
    if (search) {
      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') }
      ];
    }

    // Join with User model for subscription tier filter
    let pipeline = [{ $match: filter }];
    
    if (subscriptionTier) {
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      });
      pipeline.push({
        $match: { 'user.subscription.tier': subscriptionTier }
      });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: sortOptions });

    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    });

    const [profiles, total] = await Promise.all([
      MatrimonialProfile.aggregate(pipeline),
      MatrimonialProfile.countDocuments(filter)
    ]);

    res.json({
      profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-profiles-list' });
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Get single profile details with full information
router.get('/profiles/:profileId', isAdmin, async (req, res) => {
  try {
    const profile = await MatrimonialProfile.findById(req.params.profileId)
      .populate('userId', 'email phone subscription lastActive createdAt');
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get associated reports
    const reports = await Report.find({
      module: 'matrimonial',
      reportedItemId: req.params.profileId
    }).populate('reporterId', 'email').sort({ createdAt: -1 });

    // Get activity statistics
    const [messagesSent, messagesReceived, interestsSent, interestsReceived] = await Promise.all([
      Message.countDocuments({ senderId: profile.userId, module: 'matrimonial' }),
      Message.countDocuments({ receiverId: profile.userId, module: 'matrimonial' }),
      MatrimonialProfile.aggregate([
        { $match: { 'interests.profileId': profile._id } },
        { $count: 'total' }
      ]),
      MatrimonialProfile.aggregate([
        { $match: { _id: profile._id } },
        { $project: { interestCount: { $size: '$interests' } } }
      ])
    ]);

    res.json({
      profile,
      reports,
      activity: {
        messagesSent,
        messagesReceived,
        interestsSent: interestsSent[0]?.total || 0,
        interestsReceived: interestsReceived[0]?.interestCount || 0
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, profileId: req.params.profileId, context: 'admin-profile-details' });
    res.status(500).json({ error: 'Failed to fetch profile details' });
  }
});

// Bulk profile actions
router.post('/profiles/bulk-action', isAdmin, async (req, res) => {
  try {
    const { action, profileIds, reason } = req.body;

    if (!action || !profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({ error: 'Invalid bulk action request' });
    }

    let updateData = {};
    let result;

    switch (action) {
      case 'approve':
        updateData = { 
          status: 'active',
          'verification.status': 'verified',
          'verification.verifiedAt': new Date(),
          'verification.verifiedBy': req.user.id
        };
        break;
      
      case 'reject':
        if (!reason) {
          return res.status(400).json({ error: 'Rejection reason is required' });
        }
        updateData = { 
          status: 'rejected',
          'verification.status': 'rejected',
          'verification.rejectionReason': reason,
          'verification.verifiedBy': req.user.id
        };
        break;
      
      case 'suspend':
        if (!reason) {
          return res.status(400).json({ error: 'Suspension reason is required' });
        }
        updateData = { 
          status: 'suspended',
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy: req.user.id
        };
        break;
      
      case 'activate':
        updateData = { 
          status: 'active',
          suspensionReason: null,
          suspendedAt: null,
          suspendedBy: null
        };
        break;
      
      case 'delete':
        result = await MatrimonialProfile.deleteMany({ _id: { $in: profileIds } });
        
        // Log audit trail
        await errorTrackingService.logAudit('profiles_bulk_deleted', {
          adminId: req.user.id,
          profileIds,
          count: result.deletedCount,
          reason
        });
        
        return res.json({ 
          success: true, 
          deletedCount: result.deletedCount,
          message: `Successfully deleted ${result.deletedCount} profiles`
        });
      
      case 'flag':
        updateData = { 
          flagged: true,
          flaggedReason: reason,
          flaggedAt: new Date(),
          flaggedBy: req.user.id
        };
        break;
      
      case 'unflag':
        updateData = { 
          flagged: false,
          flaggedReason: null,
          flaggedAt: null,
          flaggedBy: null
        };
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid action type' });
    }

    result = await MatrimonialProfile.updateMany(
      { _id: { $in: profileIds } },
      { $set: updateData }
    );

    // Clear affected profiles from cache
    for (const profileId of profileIds) {
      await cacheService.delete(`profile:${profileId}`);
    }
    await cacheService.delete('admin:dashboard:stats');

    // Log audit trail
    await errorTrackingService.logAudit(`profiles_bulk_${action}`, {
      adminId: req.user.id,
      profileIds,
      count: result.modifiedCount,
      reason
    });

    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      message: `Successfully ${action}ed ${result.modifiedCount} profiles`
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-bulk-action' });
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// Update profile status
router.patch('/profiles/:profileId/status', isAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowedStatuses = ['active', 'inactive', 'suspended', 'rejected'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { status };
    
    if (status === 'suspended' || status === 'rejected') {
      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for suspension/rejection' });
      }
      updateData.suspensionReason = reason;
      updateData.suspendedAt = new Date();
      updateData.suspendedBy = req.user.id;
    }

    const profile = await MatrimonialProfile.findByIdAndUpdate(
      req.params.profileId,
      { $set: updateData },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    await cacheService.delete(`profile:${req.params.profileId}`);
    await cacheService.delete('admin:dashboard:stats');

    await errorTrackingService.logAudit('profile_status_updated', {
      adminId: req.user.id,
      profileId: req.params.profileId,
      status,
      reason
    });

    res.json({ success: true, profile });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, profileId: req.params.profileId, context: 'admin-profile-status-update' });
    res.status(500).json({ error: 'Failed to update profile status' });
  }
});

// Get all reports with filters
router.get('/reports', isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      severity,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { module: 'matrimonial' };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporterId', 'email firstName lastName')
        .populate('reportedItemId')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(filter)
    ]);

    res.json({
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-reports-list' });
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report status
router.patch('/reports/:reportId/status', isAdmin, async (req, res) => {
  try {
    const { status, resolution, action } = req.body;
    const allowedStatuses = ['pending', 'investigating', 'resolved', 'dismissed'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updateData = { 
      status,
      resolvedBy: req.user.id,
      resolvedAt: new Date()
    };

    if (resolution) updateData.resolution = resolution;
    if (action) updateData.action = action;

    const report = await Report.findByIdAndUpdate(
      req.params.reportId,
      { $set: updateData },
      { new: true }
    ).populate('reportedItemId');

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // If action was taken on the reported profile, update it
    if (action && report.reportedItemId) {
      const profileUpdate = {};
      
      switch (action) {
        case 'suspend':
          profileUpdate.status = 'suspended';
          profileUpdate.suspensionReason = `Report: ${report.reason}`;
          profileUpdate.suspendedAt = new Date();
          profileUpdate.suspendedBy = req.user.id;
          break;
        case 'warn':
          profileUpdate.$inc = { warningCount: 1 };
          break;
        case 'remove_content':
          // Handle based on report type
          break;
      }

      if (Object.keys(profileUpdate).length > 0) {
        await MatrimonialProfile.findByIdAndUpdate(report.reportedItemId._id, profileUpdate);
        await cacheService.delete(`profile:${report.reportedItemId._id}`);
      }
    }

    await cacheService.delete('admin:dashboard:stats');

    await errorTrackingService.logAudit('report_status_updated', {
      adminId: req.user.id,
      reportId: req.params.reportId,
      status,
      action
    });

    res.json({ success: true, report });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, reportId: req.params.reportId, context: 'admin-report-status-update' });
    res.status(500).json({ error: 'Failed to update report status' });
  }
});

// Get audit logs
router.get('/audit-logs', isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      adminId,
      startDate,
      endDate
    } = req.query;

    const filter = {};
    if (action) filter.action = action;
    if (adminId) filter.adminId = adminId;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    // Fetch from error tracking service audit logs
    const logs = await errorTrackingService.getAuditLogs(filter, { skip, limit });

    res.json(logs);
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-audit-logs' });
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get real-time activity feed
router.get('/activity-feed', isAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [recentProfiles, recentMessages, recentReports, recentMatches] = await Promise.all([
      MatrimonialProfile.find()
        .select('firstName lastName createdAt status')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 4),
      Message.find({ module: 'matrimonial' })
        .select('senderId receiverId createdAt')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 4),
      Report.find({ module: 'matrimonial' })
        .select('type severity createdAt status')
        .populate('reporterId', 'email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 4),
      MatrimonialProfile.find({ 'interests.status': 'accepted' })
        .select('firstName lastName interests')
        .sort({ 'interests.timestamp': -1 })
        .limit(parseInt(limit) / 4)
    ]);

    // Combine and sort by timestamp
    const activities = [
      ...recentProfiles.map(p => ({ type: 'profile_created', data: p, timestamp: p.createdAt })),
      ...recentMessages.map(m => ({ type: 'message_sent', data: m, timestamp: m.createdAt })),
      ...recentReports.map(r => ({ type: 'report_created', data: r, timestamp: r.createdAt })),
      ...recentMatches.map(m => ({ type: 'match_created', data: m, timestamp: m.interests[m.interests.length - 1]?.timestamp }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, parseInt(limit));

    res.json({ activities });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-activity-feed' });
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Export data for analytics
router.get('/export/:type', isAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate, format = 'json' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    let data;

    switch (type) {
      case 'profiles':
        data = await MatrimonialProfile.find(
          dateFilter.createdAt ? { createdAt: dateFilter } : {}
        ).select('-__v').lean();
        break;
      
      case 'users':
        data = await User.find(
          { 'roles.matrimonial': true, ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) }
        ).select('-password -__v').lean();
        break;
      
      case 'reports':
        data = await Report.find(
          { module: 'matrimonial', ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) }
        ).select('-__v').lean();
        break;
      
      case 'messages':
        data = await Message.find(
          { module: 'matrimonial', ...(dateFilter.createdAt ? { createdAt: dateFilter } : {}) }
        ).select('-__v').lean();
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV
      const fields = Object.keys(data[0] || {});
      const csv = [
        fields.join(','),
        ...data.map(row => fields.map(field => JSON.stringify(row[field] || '')).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.json({ data, count: data.length });
  } catch (error) {
    errorTrackingService.captureError(error, { userId: req.user.id, context: 'admin-export-data' });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router;
