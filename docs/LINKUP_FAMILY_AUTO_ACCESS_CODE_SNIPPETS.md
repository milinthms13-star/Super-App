# LinkUp + Family Auto-Access: Ready-to-Use Code Snippets

## Quick Copy-Paste Code for LinkUp Integration

### 1️⃣ Enhance FamilyAccessManager.js

**Copy this code block and add to:** `src/modules/messaging/FamilyAccessManager.js`

```javascript
import FamilyAccessService from '../../services/familyAccessService';

/**
 * ===== FAMILY AUTO-ACCESS FUNCTIONS =====
 * Add these functions to your existing FamilyAccessManager.js
 */

/**
 * Check if two users are family members with auto-access
 */
export const checkFamilyAutoAccess = async (userId, targetUserId) => {
  try {
    const families = await FamilyAccessService.getUserFamilies();
    
    for (const family of families) {
      const hasBothUsers = family.members.some(m => m.userId === userId) &&
                          family.members.some(m => m.userId === targetUserId);
      
      if (hasBothUsers && family.accessPermissions?.activity?.enabled) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking family access:', error);
    return false;
  }
};

/**
 * Get all family members for quick messaging
 */
export const getFamilyMembersForChat = async () => {
  try {
    const families = await FamilyAccessService.getUserFamilies();
    const members = [];
    
    for (const family of families) {
      family.members.forEach(member => {
        if (member.autoAccessEnabled && member.status === 'active') {
          members.push({
            userId: member.userId,
            name: member.name || member.email,
            email: member.email,
            relationship: member.relationship,
            familyGroup: family.familyGroupId,
            isFamilyMember: true,
          });
        }
      });
    }
    
    return members;
  } catch (error) {
    console.error('Error getting family members:', error);
    return [];
  }
};

/**
 * Check if user should see typing indicator
 */
export const canSeeTypingIndicator = async (userId, targetUserId) => {
  return await checkFamilyAutoAccess(userId, targetUserId);
};

/**
 * Check if user should see read receipts
 */
export const canSeeReadReceipts = async (userId, targetUserId) => {
  return await checkFamilyAutoAccess(userId, targetUserId);
};

/**
 * Check if user should see online status
 */
export const canSeeOnlineStatus = async (userId, targetUserId) => {
  return await checkFamilyAutoAccess(userId, targetUserId);
};

/**
 * Get family member info
 */
export const getFamilyMemberInfo = async (userId) => {
  try {
    const families = await FamilyAccessService.getUserFamilies();
    const memberInfo = [];
    
    for (const family of families) {
      const member = family.members.find(m => m.userId === userId);
      if (member) {
        memberInfo.push({
          familyName: family.familyName,
          relationship: member.relationship,
          isFamilyMember: true,
          autoAccess: member.autoAccessEnabled,
        });
      }
    }
    return memberInfo;
  } catch (error) {
    console.error('Error getting family member info:', error);
    return [];
  }
};
```

---

### 2️⃣ Create FamilyQuickChat.js Component

**Create new file:** `src/modules/messaging/FamilyQuickChat.js`

```javascript
import React, { useState, useEffect } from 'react';
import { getFamilyMembersForChat } from './FamilyAccessManager';
import './FamilyQuickChat.css';

/**
 * FamilyQuickChat Component
 * Displays family members for quick messaging
 * Integrates with LinkUp messaging
 */
const FamilyQuickChat = ({ currentUser, onSelectChat }) => {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFamily = async () => {
      try {
        setLoading(true);
        const members = await getFamilyMembersForChat();
        setFamilyMembers(members);
      } catch (err) {
        console.error('Error loading family members:', err);
        setError('Failed to load family members');
      } finally {
        setLoading(false);
      }
    };

    loadFamily();
  }, []);

  if (loading) {
    return (
      <div className="family-quick-chat loading">
        <div className="spinner"></div>
        <p>Loading family...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="family-quick-chat error">
        <p>{error}</p>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="family-quick-chat empty">
        <p>👨‍👩‍👧 No family members to chat with</p>
        <small>Create a family group first</small>
      </div>
    );
  }

  return (
    <div className="family-quick-chat">
      <div className="family-header">
        <h3>👨‍👩‍👧 Family (Auto-Access)</h3>
        <span className="badge">{familyMembers.length}</span>
      </div>

      <div className="family-members-list">
        {familyMembers.map((member) => (
          <button
            key={member.userId}
            className="family-member-btn"
            onClick={() => onSelectChat(member.userId)}
            title={`${member.relationship} - ${member.email}`}
          >
            <div className="avatar">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="member-info">
              <p className="name">{member.name}</p>
              <p className="relationship">{member.relationship}</p>
            </div>
            <span className="auto-access-badge">✓</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FamilyQuickChat;
```

---

### 3️⃣ Create FamilyQuickChat.css

**Create new file:** `src/modules/messaging/FamilyQuickChat.css`

```css
.family-quick-chat {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.family-quick-chat.loading,
.family-quick-chat.error,
.family-quick-chat.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  color: #666;
}

.family-quick-chat.error {
  background: #ffebee;
  color: #c62828;
}

.family-quick-chat.empty {
  background: #f9f9f9;
  color: #999;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #667eea;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.family-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.3);
}

.family-header h3 {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.badge {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.family-members-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.family-member-btn {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.family-member-btn:hover {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: translateX(2px);
}

.family-member-btn:active {
  transform: translateX(2px);
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 10px;
  flex-shrink: 0;
  font-size: 14px;
}

.family-member-btn:hover .avatar {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-info .name {
  margin: 0;
  font-weight: 600;
  font-size: 13px;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-info .relationship {
  margin: 2px 0 0 0;
  font-size: 11px;
  opacity: 0.7;
  text-transform: capitalize;
  color: inherit;
}

.auto-access-badge {
  font-size: 14px;
  margin-left: 8px;
  opacity: 0.7;
}

.family-member-btn:hover .auto-access-badge {
  opacity: 1;
}
```

---

### 4️⃣ Update ChatWindow.js

**Add to your existing** `src/modules/messaging/ChatWindow.js` at the top:

```javascript
import { checkFamilyAutoAccess, canSeeReadReceipts } from './FamilyAccessManager';

// Add this inside your ChatWindow component
useEffect(() => {
  const checkFamilyAccess = async () => {
    try {
      // Check if family member
      const isFamilyMember = await checkFamilyAutoAccess(
        currentUser._id,
        recipientId
      );
      
      if (isFamilyMember) {
        console.log('✓ Family member detected - enabling auto-access features');
        
        // You can set state or conditionally render family-specific UI
        setIsFamilyMember(isFamilyMember);
        
        // Check read receipt visibility
        const canSee = await canSeeReadReceipts(currentUser._id, recipientId);
        setShowReadReceipts(canSee);
      }
    } catch (error) {
      console.error('Error checking family access:', error);
    }
  };

  if (currentUser?._id && recipientId) {
    checkFamilyAccess();
  }
}, [currentUser?._id, recipientId]);

// In your JSX, add this near the top of the chat window:
{isFamilyMember && (
  <div className="family-badge">
    <span>👨‍👩‍👧 Family Member</span>
    <span className="auto-access">Auto-Access Enabled</span>
  </div>
)}
```

---

### 5️⃣ Add to ChatList.js

**Add to your existing** `src/modules/messaging/ChatList.js`:

```javascript
import { checkFamilyAutoAccess } from './FamilyAccessManager';

// Add this useEffect in ChatList component
useEffect(() => {
  const loadFamilyInfo = async () => {
    const familyData = {};
    
    for (const chat of chats) {
      const recipientId = chat.participants?.find(p => p._id !== currentUser?._id)?._id;
      if (recipientId) {
        try {
          const isFamilyMember = await checkFamilyAutoAccess(
            currentUser._id,
            recipientId
          );
          familyData[recipientId] = isFamilyMember;
        } catch (error) {
          console.error('Error checking family access:', error);
        }
      }
    }
    
    setFamilyMembers(familyData);
  };

  if (chats?.length > 0 && currentUser?._id) {
    loadFamilyInfo();
  }
}, [chats, currentUser?._id]);

// In your chat item rendering, add family indicator:
{familyMembers[recipientId] && (
  <span className="family-indicator" title="Family Member">👨‍👩‍👧</span>
)}

// Also add state at top of component:
const [familyMembers, setFamilyMembers] = useState({});
```

---

### 6️⃣ Backend: Update messagingService.js

**Add these functions to:** `backend/services/messagingService.js`

```javascript
const FamilyAccessService = require('./FamilyAccessService');

/**
 * Check if message should be delivered (family members always receive)
 */
exports.shouldDeliverMessage = async (senderId, recipientId) => {
  try {
    // Check family access first
    const isFamilyMember = await FamilyAccessService.hasAutoLocationAccess(
      senderId,
      recipientId
    );

    if (isFamilyMember) {
      return {
        deliver: true,
        reason: 'family_auto_access',
        skipBlockCheck: true, // Skip block list for family
      };
    }

    // Normal delivery logic
    return {
      deliver: true,
      reason: 'normal_delivery',
      skipBlockCheck: false,
    };
  } catch (error) {
    console.error('Error in shouldDeliverMessage:', error);
    return {
      deliver: true,
      reason: 'normal_delivery',
      skipBlockCheck: false,
    };
  }
};

/**
 * Check if user can see read receipts
 */
exports.canSeeReadReceipt = async (senderId, recipientId) => {
  try {
    return await FamilyAccessService.hasAutoLocationAccess(senderId, recipientId);
  } catch (error) {
    console.error('Error in canSeeReadReceipt:', error);
    return false;
  }
};

/**
 * Check if user can see typing indicator
 */
exports.canSeeTypingIndicator = async (senderId, recipientId) => {
  try {
    return await FamilyAccessService.hasAutoLocationAccess(senderId, recipientId);
  } catch (error) {
    console.error('Error in canSeeTypingIndicator:', error);
    return false;
  }
};
```

---

### 7️⃣ Backend: Update messagingController.js

**Add to:** `backend/controllers/messagingController.js`

```javascript
const FamilyAccessService = require('../services/FamilyAccessService');
const messagingService = require('../services/messagingService');

/**
 * GET /api/messaging/chats/family
 * Get all family member chats
 */
exports.getFamilyChats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get family members
    const members = await FamilyAccessService.getFamilyMembersWithLocationAccess(userId);

    // Get or create chats with each family member
    const familyChats = [];
    for (const member of members) {
      let chat = await Chat.findOne({
        type: 'direct',
        participants: { $all: [userId, member.memberId] },
      }).populate('participants', 'name email');

      if (!chat) {
        // Create new chat if doesn't exist
        chat = new Chat({
          type: 'direct',
          participants: [userId, member.memberId],
        });
        await chat.save();
      }

      familyChats.push({
        ...chat.toObject(),
        isFamilyMember: true,
        relationship: member.relationship,
        autoAccess: true,
        showReadReceipts: true,
      });
    }

    res.json({
      success: true,
      chats: familyChats,
      count: familyChats.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Enhanced message sending with family auto-access
 * Replace or update your existing sendMessage endpoint
 */
exports.sendMessageWithFamilyAccess = async (req, res) => {
  try {
    const { recipientId, content, chatId } = req.body;
    const senderId = req.user._id;

    // Check if should deliver (includes family auto-access)
    const deliveryCheck = await messagingService.shouldDeliverMessage(
      senderId,
      recipientId
    );

    if (!deliveryCheck.deliver && !deliveryCheck.skipBlockCheck) {
      return res.status(403).json({
        error: 'Recipient has blocked you',
        blocked: true,
      });
    }

    // Create message
    const message = new Message({
      chatId,
      senderId,
      content,
      isFamilyMessage: deliveryCheck.reason === 'family_auto_access',
      metadata: {
        deliveryMethod: deliveryCheck.reason,
      },
    });

    await message.save();

    // Check if recipient should see read receipts
    const showReadReceipt = await messagingService.canSeeReadReceipt(
      senderId,
      recipientId
    );

    // Emit socket event to recipient
    const io = require('../websocket/websocketManager').getIO();
    io.to(recipientId).emit('message:received', {
      ...message.toObject(),
      showReadReceipt,
      isFamilyMessage: deliveryCheck.reason === 'family_auto_access',
    });

    res.json({
      success: true,
      message,
      deliveryMethod: deliveryCheck.reason,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

### 8️⃣ Add Routes to API

**Add to your Express routes file** (e.g., `backend/routes/messagingRoutes.js`):

```javascript
const { getFamilyChats, sendMessageWithFamilyAccess } = require('../controllers/messagingController');

// Family messaging endpoints
router.get('/chats/family', requireAuth, getFamilyChats);
router.post('/send-with-family-access', requireAuth, sendMessageWithFamilyAccess);
```

---

## ✅ Integration Checklist

- [ ] Copy code to FamilyAccessManager.js
- [ ] Create FamilyQuickChat.js
- [ ] Create FamilyQuickChat.css
- [ ] Update ChatWindow.js
- [ ] Update ChatList.js
- [ ] Update messagingService.js
- [ ] Update messagingController.js
- [ ] Add API routes
- [ ] Import FamilyQuickChat in Messaging.js
- [ ] Test family messaging
- [ ] Test read receipts with family
- [ ] Test typing indicators with family

---

## 🧪 Quick Test

```javascript
// Test in browser console
import { checkFamilyAutoAccess, getFamilyMembersForChat } from './modules/messaging/FamilyAccessManager';

// Check if family members exist
const members = await getFamilyMembersForChat();
console.log('Family members:', members);

// Check if has family access
const hasAccess = await checkFamilyAutoAccess(userId1, userId2);
console.log('Has family access:', hasAccess);
```

---

**Ready to paste and go!** 🚀

