const express = require('express');
const router = express.Router();

// Controllers
const OrderTrackingController = require('../controllers/FoodDeliveryOrderTrackingController');
const ChatController = require('../controllers/FoodDeliveryChatController');

// Validations
const {
  startTrackingValidation,
  getTrackingStatusValidation,
  getTrackingByOrderIdValidation,
  updateRiderLocationValidation,
  getRouteHistoryValidation,
  markPickedUpValidation,
  markDeliveredValidation,
  reportIssueValidation,
  getNearbyOrdersValidation,
  emergencyCallValidation,
  getOrCreateChatValidation,
  sendMessageValidation,
  getMessagesValidation,
  markAsReadValidation,
  getUnreadCountValidation,
  initiateCallValidation,
  endCallValidation,
  getCallHistoryValidation,
  sendLocationValidation,
  sendImageValidation,
  blockChatValidation,
  unblockChatValidation,
  getChatSummaryValidation,
  getUserChatsValidation,
  getQuickRepliesValidation,
  closeChatValidation,
  muteNotificationsValidation,
  unmuteNotificationsValidation,
} = require('../middleware/FoodDeliveryPhase4Validations');

// Auth middleware (to be integrated with your auth system)
const authenticateToken = require('../middleware/auth');

/**
 * ============================================
 * ORDER TRACKING ENDPOINTS (10)
 * ============================================
 */

// Start tracking for an order
router.post(
  '/orders/:orderId/tracking/start',
  authenticateToken,
  startTrackingValidation,
  OrderTrackingController.startTracking
);

// Get tracking status
router.get(
  '/tracking/:trackingId/status',
  authenticateToken,
  getTrackingStatusValidation,
  OrderTrackingController.getTrackingStatus
);

// Get tracking by order ID
router.get(
  '/orders/:orderId/tracking',
  authenticateToken,
  getTrackingByOrderIdValidation,
  OrderTrackingController.getTrackingByOrderId
);

// Update rider location (real-time)
router.put(
  '/tracking/:trackingId/location',
  authenticateToken,
  updateRiderLocationValidation,
  OrderTrackingController.updateRiderLocation
);

// Get route history
router.get(
  '/tracking/:trackingId/route-history',
  authenticateToken,
  getRouteHistoryValidation,
  OrderTrackingController.getRouteHistory
);

// Mark delivery as picked up
router.put(
  '/tracking/:trackingId/picked-up',
  authenticateToken,
  markPickedUpValidation,
  OrderTrackingController.markPickedUp
);

// Mark delivery as completed
router.put(
  '/tracking/:trackingId/delivered',
  authenticateToken,
  markDeliveredValidation,
  OrderTrackingController.markDelivered
);

// Report delivery issue
router.post(
  '/tracking/:trackingId/issue',
  authenticateToken,
  reportIssueValidation,
  OrderTrackingController.reportIssue
);

// Get rider's active trackings
router.get(
  '/tracking/rider/active',
  authenticateToken,
  OrderTrackingController.getRiderActiveTrackings
);

// Get customer's trackings
router.get(
  '/tracking/customer/all',
  authenticateToken,
  OrderTrackingController.getCustomerTrackings
);

// Get nearby orders (for rider assignment)
router.get(
  '/tracking/nearby-orders',
  authenticateToken,
  getNearbyOrdersValidation,
  OrderTrackingController.getNearbyOrders
);

// Emergency call endpoints
router.post(
  '/tracking/:trackingId/emergency-call/start',
  authenticateToken,
  emergencyCallValidation,
  OrderTrackingController.startEmergencyCall
);

router.post(
  '/tracking/:trackingId/emergency-call/end',
  authenticateToken,
  emergencyCallValidation,
  OrderTrackingController.endEmergencyCall
);

/**
 * ============================================
 * CHAT ENDPOINTS (17)
 * ============================================
 */

// Get or create chat for order
router.get(
  '/orders/:orderId/chat',
  authenticateToken,
  getOrCreateChatValidation,
  ChatController.getOrCreateChat
);

// Send message
router.post(
  '/orders/:orderId/chat/message',
  authenticateToken,
  sendMessageValidation,
  ChatController.sendMessage
);

// Get chat messages
router.get(
  '/orders/:orderId/chat/messages',
  authenticateToken,
  getMessagesValidation,
  ChatController.getMessages
);

// Mark messages as read
router.put(
  '/orders/:orderId/chat/read',
  authenticateToken,
  markAsReadValidation,
  ChatController.markAsRead
);

// Get unread message count
router.get(
  '/orders/:orderId/chat/unread-count',
  authenticateToken,
  getUnreadCountValidation,
  ChatController.getUnreadCount
);

// Initiate call
router.post(
  '/orders/:orderId/chat/call/initiate',
  authenticateToken,
  initiateCallValidation,
  ChatController.initiateCall
);

// End call
router.put(
  '/orders/:orderId/chat/call/end',
  authenticateToken,
  endCallValidation,
  ChatController.endCall
);

// Get call history
router.get(
  '/orders/:orderId/chat/call-history',
  authenticateToken,
  getCallHistoryValidation,
  ChatController.getCallHistory
);

// Send location
router.post(
  '/orders/:orderId/chat/location',
  authenticateToken,
  sendLocationValidation,
  ChatController.sendLocation
);

// Send image
router.post(
  '/orders/:orderId/chat/image',
  authenticateToken,
  sendImageValidation,
  ChatController.sendImage
);

// Block chat
router.put(
  '/orders/:orderId/chat/block',
  authenticateToken,
  blockChatValidation,
  ChatController.blockChat
);

// Unblock chat
router.put(
  '/orders/:orderId/chat/unblock',
  authenticateToken,
  unblockChatValidation,
  ChatController.unblockChat
);

// Get chat summary
router.get(
  '/orders/:orderId/chat/summary',
  authenticateToken,
  getChatSummaryValidation,
  ChatController.getChatSummary
);

// Get user chats
router.get(
  '/chat/user/all',
  authenticateToken,
  getUserChatsValidation,
  ChatController.getUserChats
);

// Get quick replies
router.get(
  '/orders/:orderId/chat/quick-replies',
  authenticateToken,
  getQuickRepliesValidation,
  ChatController.getQuickReplies
);

// Close chat
router.put(
  '/orders/:orderId/chat/close',
  authenticateToken,
  closeChatValidation,
  ChatController.closeChat
);

// Mute notifications
router.put(
  '/orders/:orderId/chat/mute',
  authenticateToken,
  muteNotificationsValidation,
  ChatController.muteNotifications
);

// Unmute notifications
router.put(
  '/orders/:orderId/chat/unmute',
  authenticateToken,
  unmuteNotificationsValidation,
  ChatController.unmuteNotifications
);

/**
 * ============================================
 * NOTIFICATION ENDPOINTS (via separate routes)
 * ============================================
 * Note: Notification endpoints should be in a separate
 * file or module, handling push/SMS/email delivery
 */

// Health check for Phase 4
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Food Delivery Phase 4 API is running',
    features: ['Order Tracking', 'Real-time Chat', 'Push Notifications', 'WebSocket Support'],
    timestamp: new Date(),
  });
});

module.exports = router;
