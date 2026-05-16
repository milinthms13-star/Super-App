const WebSocket = require('ws');
const logger = require('../config/logger');
const ModerationQueue = require('../models/ModerationQueue');
const AbuseReport = require('../models/AbuseReport');

/**
 * Real-Time WebSocket Manager for Moderation Panel
 * Handles live updates for:
 * - New reports in queue
 * - Task assignments
 * - Report resolutions
 * - Moderator availability
 * - Queue statistics updates
 */

class ModerationWebSocketManager {
  constructor() {
    this.wss = null;
    this.moderators = new Map(); // moderator -> { ws, userId, taskId, status }
    this.tasks = new Map(); // taskId -> { moderatorId, claimedAt, status }
    this.reportSubscribers = new Map(); // reportId -> Set<moderator websocket>
    this.broadcastInterval = null;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server, path: '/ws/moderation' });

    this.wss.on('connection', (ws, req) => {
      logger.info(`[WebSocket] New connection from ${req.socket.remoteAddress}`);

      // Parse auth token from query string
      const token = this.extractToken(req.url);
      if (!token) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Setup message handlers
      ws.on('message', (data) => this.handleMessage(ws, data, token));
      ws.on('close', () => this.handleDisconnect(ws));
      ws.on('error', (error) => logger.error('[WebSocket] Error:', error));

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date(),
        message: 'Connected to moderation real-time service'
      }));
    });

    // Start periodic broadcasts
    this.startBroadcasts();
    logger.info('[WebSocket] Moderation WebSocket server initialized');
  }

  /**
   * Extract auth token from WebSocket URL
   */
  extractToken(url) {
    try {
      const params = new URLSearchParams(url.split('?')[1]);
      return params.get('token');
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(ws, data, token) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'authenticate':
          await this.handleAuth(ws, message, token);
          break;

        case 'claim_task':
          await this.handleClaimTask(ws, message);
          break;

        case 'release_task':
          await this.handleReleaseTask(ws, message);
          break;

        case 'subscribe_report':
          await this.handleSubscribeReport(ws, message);
          break;

        case 'unsubscribe_report':
          await this.handleUnsubscribeReport(ws, message);
          break;

        case 'queue_stats':
          await this.handleQueueStatsRequest(ws, message);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date() }));
          break;

        default:
          logger.warn(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('[WebSocket] Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  /**
   * Authenticate moderator connection
   */
  async handleAuth(ws, message, token) {
    try {
      // In real app, verify JWT token here
      const userId = message.userId;
      const role = message.role;

      if (!['admin', 'moderator'].includes(role)) {
        ws.close(1008, 'Insufficient permissions');
        return;
      }

      // Register moderator
      this.moderators.set(ws, {
        userId,
        role,
        connectedAt: new Date(),
        taskId: null,
        status: 'idle'
      });

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'authenticated',
        userId,
        role,
        timestamp: new Date()
      }));

      // Broadcast moderator online status
      this.broadcastModerationEvent({
        type: 'moderator_online',
        userId,
        totalModerators: this.moderators.size,
        timestamp: new Date()
      });

      logger.info(`[WebSocket] Moderator ${userId} authenticated`);
    } catch (error) {
      logger.error('[WebSocket] Auth error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication failed'
      }));
    }
  }

  /**
   * Handle task claim
   */
  async handleClaimTask(ws, message) {
    try {
      const { taskId, reportId } = message;
      const moderator = this.moderators.get(ws);

      if (!moderator) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }

      // Check if task already claimed
      if (this.tasks.has(taskId)) {
        const claimed = this.tasks.get(taskId);
        if (claimed.moderatorId !== moderator.userId) {
          ws.send(JSON.stringify({
            type: 'task_already_claimed',
            taskId,
            claimedBy: claimed.moderatorId,
            claimedAt: claimed.claimedAt
          }));
          return;
        }
      }

      // Claim task
      this.tasks.set(taskId, {
        moderatorId: moderator.userId,
        reportId,
        claimedAt: new Date(),
        status: 'in_progress'
      });

      // Update moderator status
      moderator.taskId = taskId;
      moderator.status = 'busy';

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'task_claimed',
        taskId,
        reportId,
        timestamp: new Date()
      }));

      // Notify other moderators
      this.broadcastModerationEvent({
        type: 'task_claimed',
        taskId,
        reportId,
        claimedBy: moderator.userId,
        timestamp: new Date()
      });

      logger.info(`[WebSocket] Task ${taskId} claimed by moderator ${moderator.userId}`);
    } catch (error) {
      logger.error('[WebSocket] Error claiming task:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to claim task'
      }));
    }
  }

  /**
   * Handle task release
   */
  async handleReleaseTask(ws, message) {
    try {
      const { taskId } = message;
      const moderator = this.moderators.get(ws);

      if (!moderator) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }

      const task = this.tasks.get(taskId);
      if (!task || task.moderatorId !== moderator.userId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Task not claimed by you'
        }));
        return;
      }

      // Release task
      this.tasks.delete(taskId);
      moderator.taskId = null;
      moderator.status = 'idle';

      // Send confirmation
      ws.send(JSON.stringify({
        type: 'task_released',
        taskId,
        timestamp: new Date()
      }));

      // Notify other moderators
      this.broadcastModerationEvent({
        type: 'task_released',
        taskId,
        releasedBy: moderator.userId,
        timestamp: new Date()
      });

      logger.info(`[WebSocket] Task ${taskId} released by moderator ${moderator.userId}`);
    } catch (error) {
      logger.error('[WebSocket] Error releasing task:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to release task'
      }));
    }
  }

  /**
   * Handle report subscription
   */
  async handleSubscribeReport(ws, message) {
    try {
      const { reportId } = message;
      const moderator = this.moderators.get(ws);

      if (!moderator) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Not authenticated'
        }));
        return;
      }

      // Add to subscribers
      if (!this.reportSubscribers.has(reportId)) {
        this.reportSubscribers.set(reportId, new Set());
      }
      this.reportSubscribers.get(reportId).add(ws);

      ws.send(JSON.stringify({
        type: 'report_subscribed',
        reportId,
        timestamp: new Date()
      }));

      logger.debug(`[WebSocket] Moderator subscribed to report ${reportId}`);
    } catch (error) {
      logger.error('[WebSocket] Error subscribing to report:', error);
    }
  }

  /**
   * Handle report unsubscription
   */
  async handleUnsubscribeReport(ws, message) {
    try {
      const { reportId } = message;

      if (this.reportSubscribers.has(reportId)) {
        const subs = this.reportSubscribers.get(reportId);
        subs.delete(ws);
        if (subs.size === 0) {
          this.reportSubscribers.delete(reportId);
        }
      }

      ws.send(JSON.stringify({
        type: 'report_unsubscribed',
        reportId,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error('[WebSocket] Error unsubscribing from report:', error);
    }
  }

  /**
   * Handle queue stats request
   */
  async handleQueueStatsRequest(ws, message) {
    try {
      const stats = await this.getQueueStats();

      ws.send(JSON.stringify({
        type: 'queue_stats',
        data: stats,
        timestamp: new Date()
      }));
    } catch (error) {
      logger.error('[WebSocket] Error getting queue stats:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to get queue stats'
      }));
    }
  }

  /**
   * Handle disconnect
   */
  handleDisconnect(ws) {
    const moderator = this.moderators.get(ws);
    if (moderator) {
      const { userId } = moderator;

      // Release any claimed tasks
      if (moderator.taskId) {
        this.tasks.delete(moderator.taskId);
      }

      // Remove moderator
      this.moderators.delete(ws);

      // Remove from subscribers
      for (const [reportId, subs] of this.reportSubscribers) {
        subs.delete(ws);
        if (subs.size === 0) {
          this.reportSubscribers.delete(reportId);
        }
      }

      // Broadcast offline status
      this.broadcastModerationEvent({
        type: 'moderator_offline',
        userId,
        totalModerators: this.moderators.size,
        timestamp: new Date()
      });

      logger.info(`[WebSocket] Moderator ${userId} disconnected`);
    }
  }

  /**
   * Broadcast event to all moderators
   */
  broadcastModerationEvent(event) {
    const message = JSON.stringify(event);

    this.moderators.forEach((moderator, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Send event to report subscribers
   */
  broadcastReportUpdate(reportId, event) {
    if (!this.reportSubscribers.has(reportId)) return;

    const message = JSON.stringify({
      ...event,
      reportId,
      timestamp: new Date()
    });

    const subs = this.reportSubscribers.get(reportId);
    subs.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  /**
   * Notify new report in queue
   */
  notifyNewReport(reportData) {
    this.broadcastModerationEvent({
      type: 'new_report',
      data: {
        reportId: reportData._id,
        severity: reportData.severity,
        category: reportData.category,
        description: reportData.description
      },
      timestamp: new Date()
    });
  }

  /**
   * Notify report resolved
   */
  notifyReportResolved(reportId, resolution, moderatorId) {
    this.broadcastReportUpdate(reportId, {
      type: 'report_resolved',
      resolution,
      resolvedBy: moderatorId
    });

    // Also broadcast to all moderators
    this.broadcastModerationEvent({
      type: 'report_resolved',
      reportId,
      resolution,
      timestamp: new Date()
    });
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats() {
    try {
      const pendingCount = await AbuseReport.countDocuments({ status: 'open' });
      const highPriorityCount = await AbuseReport.countDocuments({
        status: 'open',
        severity: { $in: ['high', 'critical'] }
      });

      return {
        totalPending: pendingCount,
        highPriority: highPriorityCount,
        activeModerators: this.moderators.size,
        tasksInProgress: this.tasks.size,
        moderatorStatus: Array.from(this.moderators.entries()).map(([ws, mod]) => ({
          userId: mod.userId,
          status: mod.status,
          currentTask: mod.taskId,
          connectedSince: mod.connectedAt
        })),
        activeTasks: Array.from(this.tasks.entries()).map(([taskId, task]) => ({
          taskId,
          moderatorId: task.moderatorId,
          reportId: task.reportId,
          claimedAt: task.claimedAt
        }))
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      return {
        totalPending: 0,
        highPriority: 0,
        activeModerators: this.moderators.size,
        tasksInProgress: this.tasks.size
      };
    }
  }

  /**
   * Start periodic broadcasts
   */
  startBroadcasts() {
    // Broadcast queue stats every 10 seconds
    this.broadcastInterval = setInterval(async () => {
      const stats = await this.getQueueStats();

      this.moderators.forEach((moderator, ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'queue_stats_update',
            data: stats,
            timestamp: new Date()
          }));
        }
      });
    }, 10000); // 10 seconds
  }

  /**
   * Stop periodic broadcasts
   */
  stopBroadcasts() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown() {
    this.stopBroadcasts();

    if (this.wss) {
      this.wss.clients.forEach(ws => {
        ws.close(1000, 'Server shutdown');
      });
      this.wss.close();
    }

    logger.info('[WebSocket] Moderation WebSocket server shut down');
  }
}

module.exports = new ModerationWebSocketManager();
