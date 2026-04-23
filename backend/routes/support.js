const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function to generate unique ticket number
const generateTicketNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TKT-${timestamp}-${random}`;
};

// ============ CREATE SUPPORT TICKET ============
router.post('/create', auth, async (req, res, next) => {
  try {
    const { subject, description, module, category, priority, entityId, entityType, contactPhone, attachments } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, message: 'Subject and description are required' });
    }

    const ticket = new SupportTicket({
      ticketNumber: generateTicketNumber(),
      userId: req.user._id,
      subject: subject.trim(),
      description,
      module: module || 'general',
      category: category || 'general',
      priority: priority || 'medium',
      entityId,
      entityType,
      contactEmail: req.user.email,
      contactPhone,
      attachments: attachments || [],
      messages: [
        {
          senderId: req.user._id,
          senderType: 'user',
          content: description,
          createdAt: new Date(),
        },
      ],
    });

    await ticket.save();

    // Send auto-response
    ticket.autoResponseSent = true;
    await ticket.save();

    logger.info(`Support ticket ${ticket.ticketNumber} created by ${req.user._id}`);

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: ticket._id,
      ticketNumber: ticket.ticketNumber,
    });
  } catch (err) {
    logger.error('Error creating support ticket:', err);
    next(err);
  }
});

// ============ GET ALL USER TICKETS ============
router.get('/my-tickets', auth, async (req, res, next) => {
  try {
    const { status, module, page = 1, limit = 10, sortBy = 'createdAt' } = req.query;

    const query = { userId: req.user._id };

    if (status) query.status = status;
    if (module) query.module = module;

    const skip = (page - 1) * limit;
    const sortOrder = sortBy === 'createdAt' ? -1 : -1;

    const tickets = await SupportTicket.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .select('-messages'); // Exclude messages for list view

    const totalItems = await SupportTicket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (err) {
    logger.error('Error fetching user tickets:', err);
    next(err);
  }
});

// ============ GET TICKET DETAILS ============
router.get('/:ticketId', auth, async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('messages.senderId', 'name email avatar');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    logger.error('Error fetching ticket:', err);
    next(err);
  }
});

// ============ ADD MESSAGE TO TICKET ============
router.post('/:ticketId/messages', auth, async (req, res, next) => {
  try {
    const { content, attachments, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const message = {
      senderId: req.user._id,
      senderType: req.user.role === 'support' || req.user.role === 'admin' ? 'support_agent' : 'user',
      content: content.trim(),
      attachments: attachments || [],
      createdAt: new Date(),
      isInternal: isInternal || false,
    };

    ticket.messages.push(message);

    // Update ticket status if user responds to awaiting_user
    if (ticket.status === 'awaiting_user' && message.senderType === 'user') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    logger.info(`Message added to ticket ${ticket.ticketNumber}`);

    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      ticket,
    });
  } catch (err) {
    logger.error('Error adding message to ticket:', err);
    next(err);
  }
});

// ============ UPDATE TICKET STATUS ============
router.patch('/:ticketId/status', auth, async (req, res, next) => {
  try {
    const { status, resolutionNotes, satisfactionRating } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Only support staff or ticket creator can update
    if (req.user.role !== 'support' && req.user.role !== 'admin' && ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (status) {
      ticket.status = status;

      if (status === 'resolved' || status === 'closed') {
        ticket.resolutionDate = new Date();
        if (resolutionNotes) {
          ticket.resolutionNotes = resolutionNotes;
        }
      }
    }

    if (satisfactionRating) {
      ticket.satisfactionRating = satisfactionRating;
    }

    await ticket.save();

    logger.info(`Ticket ${ticket.ticketNumber} status updated to ${status}`);

    res.json({
      success: true,
      message: 'Ticket status updated successfully',
      ticket,
    });
  } catch (err) {
    logger.error('Error updating ticket status:', err);
    next(err);
  }
});

// ============ ASSIGN TICKET (SUPPORT STAFF ONLY) ============
router.patch('/:ticketId/assign', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only support staff can assign tickets' });
    }

    const { assignedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.assignedTo = assignedTo || null;
    ticket.status = 'in_progress';

    await ticket.save();

    logger.info(`Ticket ${ticket.ticketNumber} assigned to ${assignedTo}`);

    res.json({
      success: true,
      message: 'Ticket assigned successfully',
      ticket,
    });
  } catch (err) {
    logger.error('Error assigning ticket:', err);
    next(err);
  }
});

// ============ ESCALATE TICKET (SUPPORT STAFF ONLY) ============
router.patch('/:ticketId/escalate', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only support staff can escalate tickets' });
    }

    const { reason, escalatedTo } = req.body;

    const ticket = await SupportTicket.findById(req.params.ticketId);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.isEscalated = true;
    ticket.escalationReason = reason;
    ticket.escalatedTo = escalatedTo;
    ticket.status = 'escalated';
    ticket.priority = 'urgent';

    await ticket.save();

    logger.info(`Ticket ${ticket.ticketNumber} escalated`);

    res.json({
      success: true,
      message: 'Ticket escalated successfully',
      ticket,
    });
  } catch (err) {
    logger.error('Error escalating ticket:', err);
    next(err);
  }
});

// ============ GET ALL TICKETS (ADMIN/SUPPORT ONLY) ============
router.get('/', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { status, module, priority, assignedTo, page = 1, limit = 20, sortBy = 'createdAt' } = req.query;

    const query = {};

    if (status) query.status = status;
    if (module) query.module = module;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const skip = (page - 1) * limit;

    const tickets = await SupportTicket.find(query)
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .select('-messages');

    const totalItems = await SupportTicket.countDocuments(query);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (err) {
    logger.error('Error fetching all tickets:', err);
    next(err);
  }
});

// ============ GET SUPPORT STATISTICS (ADMIN/SUPPORT ONLY) ============
router.get('/stats/overview', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const stats = await SupportTicket.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
          byModule: [
            {
              $group: {
                _id: '$module',
                count: { $sum: 1 },
              },
            },
          ],
          byPriority: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],
          averageSatisfaction: [
            {
              $match: { satisfactionRating: { $exists: true } },
            },
            {
              $group: {
                _id: null,
                average: { $avg: '$satisfactionRating' },
              },
            },
          ],
          totalTickets: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0],
    });
  } catch (err) {
    logger.error('Error fetching support statistics:', err);
    next(err);
  }
});

module.exports = router;
