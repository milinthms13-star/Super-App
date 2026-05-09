/**
 * Firebase Phone OTP - Backend Integration Guide
 * 
 * This file shows how to verify Firebase tokens on your backend
 * and integrate phone authentication with your API.
 */

// ============================================
// Node.js / Express Backend Implementation
// ============================================

// 1. Setup Firebase Admin SDK
// npm install firebase-admin

const admin = require('firebase-admin');
const express = require('express');
const app = express();

// Initialize Firebase Admin
const serviceAccount = require('./path/to/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.database();
const auth = admin.auth();

// 2. Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
      email: decodedToken.email || null,
      isNewUser: decodedToken.firebase.sign_in_provider === 'anonymous',
    };
    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: error.message 
    });
  }
};

// 3. User Registration/Sync endpoint
app.post('/api/auth/sync-firebase-user', verifyFirebaseToken, async (req, res) => {
  try {
    const { phoneNumber, email, displayName } = req.body;
    const uid = req.user.uid;

    // Check if user exists
    const existingUser = await db.ref(`users/${uid}`).once('value');

    const userData = {
      uid,
      phoneNumber: req.user.phoneNumber,
      email: email || req.user.email || null,
      displayName: displayName || null,
      isNewUser: !existingUser.exists(),
      createdAt: existingUser.val()?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authMethod: 'firebase-phone',
    };

    // Save user to database
    await db.ref(`users/${uid}`).set(userData);

    res.json({
      success: true,
      user: userData,
      isNewUser: !existingUser.exists(),
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to sync user',
      details: error.message 
    });
  }
});

// 4. Get current user endpoint
app.get('/api/auth/current-user', verifyFirebaseToken, async (req, res) => {
  try {
    const userRef = db.ref(`users/${req.user.uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get user',
      details: error.message 
    });
  }
});

// 5. Update user profile
app.put('/api/auth/profile', verifyFirebaseToken, async (req, res) => {
  try {
    const { displayName, email, profilePicture } = req.body;
    const uid = req.user.uid;

    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (email) updateData.email = email;
    if (profilePicture) updateData.profilePicture = profilePicture;
    updateData.updatedAt = new Date().toISOString();

    await db.ref(`users/${uid}`).update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      updates: updateData,
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

// 6. Logout endpoint (optional - mostly frontend)
app.post('/api/auth/logout', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Optional: Revoke tokens
    await auth.revokeRefreshTokens(uid);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to logout',
      details: error.message 
    });
  }
});

// 7. Protected API route example
app.get('/api/user/data', verifyFirebaseToken, async (req, res) => {
  try {
    // Now req.user contains authenticated user info
    const userData = await db.ref(`users/${req.user.uid}/data`).once('value');

    res.json({
      success: true,
      user: req.user,
      data: userData.val(),
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user data',
      details: error.message 
    });
  }
});

// 8. Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================
// Python / Flask Backend Implementation
// ============================================

/*
from flask import Flask, request, jsonify
from firebase_admin import initialize_app, credentials, auth, db
import json
from datetime import datetime
from functools import wraps

app = Flask(__name__)

# Initialize Firebase
cred = credentials.Certificate('path/to/serviceAccountKey.json')
initialize_app(cred, {
    'databaseURL': 'https://your-project.firebaseio.com'
})

# Verify token middleware
def verify_firebase_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            # Remove 'Bearer ' prefix
            token = token.split('Bearer ')[-1]
            decoded_token = auth.verify_id_token(token)
            request.user = {
                'uid': decoded_token['uid'],
                'phoneNumber': decoded_token.get('phone_number'),
                'email': decoded_token.get('email'),
            }
            return f(*args, **kwargs)
        except auth.AuthError as e:
            return jsonify({'error': 'Invalid token', 'details': str(e)}), 401
    
    return decorated_function

# Sync user endpoint
@app.route('/api/auth/sync-firebase-user', methods=['POST'])
@verify_firebase_token
def sync_firebase_user():
    try:
        data = request.get_json()
        uid = request.user['uid']
        
        user_data = {
            'uid': uid,
            'phoneNumber': request.user['phoneNumber'],
            'email': data.get('email') or request.user.get('email'),
            'displayName': data.get('displayName'),
            'updatedAt': datetime.now().isoformat(),
            'authMethod': 'firebase-phone',
        }
        
        # Save to Realtime Database
        db.reference(f'users/{uid}').set(user_data)
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to sync user',
            'details': str(e)
        }), 500

# Get current user
@app.route('/api/auth/current-user', methods=['GET'])
@verify_firebase_token
def get_current_user():
    try:
        uid = request.user['uid']
        user_ref = db.reference(f'users/{uid}')
        user_data = user_ref.get()
        
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to get user',
            'details': str(e)
        }), 500

# Protected route
@app.route('/api/user/data', methods=['GET'])
@verify_firebase_token
def get_user_data():
    try:
        uid = request.user['uid']
        user_data = db.reference(f'users/{uid}/data').get()
        
        return jsonify({
            'success': True,
            'user': request.user,
            'data': user_data
        }), 200
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch user data',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)
*/

// ============================================
// Java / Spring Boot Backend Implementation
// ============================================

/*
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private FirebaseAuth firebaseAuth;
    
    @Autowired
    private DatabaseReference databaseReference;

    // Verify token
    @PostMapping("/sync-firebase-user")
    public ResponseEntity<?> syncFirebaseUser(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody SyncUserRequest request) {
        try {
            String token = authHeader.replace("Bearer ", "");
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);
            
            String uid = decodedToken.getUid();
            String phoneNumber = decodedToken.getPhoneNumber();
            
            UserData userData = new UserData();
            userData.setUid(uid);
            userData.setPhoneNumber(phoneNumber);
            userData.setEmail(request.getEmail());
            userData.setDisplayName(request.getDisplayName());
            userData.setAuthMethod("firebase-phone");
            userData.setUpdatedAt(Instant.now().toString());
            
            databaseReference.child("users").child(uid).setValueAsync(userData);
            
            return ResponseEntity.ok(new ApiResponse(true, "User synced", userData));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Invalid token"));
        }
    }

    @GetMapping("/current-user")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");
            FirebaseToken decodedToken = firebaseAuth.verifyIdToken(token);
            String uid = decodedToken.getUid();
            
            UserData userData = databaseReference
                .child("users").child(uid)
                .getValueAsync(UserData.class).getResult();
            
            return ResponseEntity.ok(new ApiResponse(true, "User fetched", userData));
        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(401).body(new ApiResponse(false, "Invalid token"));
        }
    }
}
*/

// ============================================
// Database Schema (Firebase Realtime Database)
// ============================================

/*
{
  "users": {
    "uid123": {
      "uid": "uid123",
      "phoneNumber": "+919876543210",
      "email": "user@example.com",
      "displayName": "John Doe",
      "profilePicture": "https://...",
      "authMethod": "firebase-phone",
      "isNewUser": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "role": "user",
      "verified": true,
      "metadata": {
        "lastLogin": "2024-01-15T10:30:00Z",
        "loginCount": 5,
        "device": "mobile"
      }
    }
  }
}
*/

// ============================================
// Frontend + Backend Integration Example
// ============================================

export const setupBackendIntegration = () => {
  // After Firebase authentication
  return async (firebaseUser) => {
    try {
      // Get Firebase token
      const token = await firebaseUser.getIdToken();

      // Sync user with backend
      const response = await fetch('/api/auth/sync-firebase-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('User synced with backend');
        localStorage.setItem('backendUser', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Backend sync failed:', error);
    }
  };
};

// ============================================
// Security Best Practices
// ============================================

/*
1. ALWAYS verify token on backend
2. Never trust client-side authentication alone
3. Use HTTPS only
4. Set appropriate CORS headers
5. Implement rate limiting
6. Log authentication attempts
7. Use environment variables for secrets
8. Revoke tokens on logout
9. Implement token refresh
10. Monitor suspicious activities
*/

// ============================================
// Common Error Codes
// ============================================

/*
401 - Unauthorized (no token or invalid token)
403 - Forbidden (token valid but user lacks permission)
404 - Not Found (user doesn't exist)
500 - Server Error

Firebase Error Codes:
- auth/invalid-token
- auth/token-expired
- auth/user-disabled
- auth/user-not-found
*/

export default {
  verifyFirebaseToken,
  syncUserEndpoint: '/api/auth/sync-firebase-user',
  currentUserEndpoint: '/api/auth/current-user',
};
