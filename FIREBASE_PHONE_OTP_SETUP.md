# Firebase Phone OTP Login Implementation Guide

## Overview
This implementation provides Firebase-based phone authentication with OTP verification for your application.

## Setup Steps

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing one
3. Enable Phone Authentication:
   - Go to Authentication → Sign-in method
   - Enable "Phone" provider
   - Add your testing phone numbers (for development)
4. Get your Firebase credentials:
   - Project Settings → General tab
   - Copy Web API credentials

### 2. Environment Variables

1. Copy `.env.firebase.example` to `.env.local`
   ```bash
   cp .env.firebase.example .env.local
   ```

2. Fill in your Firebase credentials:
   ```env
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

### 3. Install Dependencies

```bash
npm install firebase
```

### 4. Initialize Firebase in Your App

Add this to your `App.js` or main component:

```javascript
import { onAuthStateChange } from './services/firebasePhoneAuthService';

useEffect(() => {
  const unsubscribe = onAuthStateChange((user) => {
    if (user) {
      console.log('User authenticated:', user);
      // Handle authenticated user
    } else {
      console.log('User not authenticated');
      // Handle unauthenticated state
    }
  });

  return unsubscribe;
}, []);
```

### 5. Add Login Component

Import and use the Firebase Phone OTP Login component:

```javascript
import FirebasePhoneOTPLogin from './components/auth/FirebasePhoneOTPLogin';

function MyApp() {
  const handleLoginSuccess = (user) => {
    console.log('Login successful:', user);
    // Redirect to dashboard or home
  };

  return (
    <FirebasePhoneOTPLogin 
      onLoginSuccess={handleLoginSuccess}
      role="user"
      onClose={() => console.log('Login closed')}
    />
  );
}
```

## Features

### ✅ Phone Number Input
- 10-digit Indian phone format support
- Real-time validation
- Automatic formatting

### ✅ OTP Sending
- Firebase reCAPTCHA protection
- Automatic reCAPTCHA management
- Error handling

### ✅ OTP Verification
- 6-digit OTP input
- Real-time verification
- Automatic token generation

### ✅ User Experience
- Auto-countdown timer for resend
- Clear error messages
- Success notifications
- Mobile-friendly design
- Dark mode support

## API Reference

### Service: `firebasePhoneAuthService.js`

#### `sendPhoneOTP(phoneNumber, recaptchaContainerId)`
Sends OTP to the provided phone number.

**Parameters:**
- `phoneNumber` (string): Phone in international format (+919876543210)
- `recaptchaContainerId` (string): HTML element ID for reCAPTCHA

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  error?: string
}
```

#### `verifyPhoneOTP(otp)`
Verifies the OTP code.

**Parameters:**
- `otp` (string): 6-digit OTP code

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  user?: {
    uid: string,
    phoneNumber: string,
    isNewUser: boolean,
    metadata: object
  },
  idToken?: string,
  error?: string
}
```

#### `resendPhoneOTP(phoneNumber, recaptchaContainerId)`
Resends OTP to the phone number.

**Parameters:** Same as `sendPhoneOTP`

**Returns:** Same as `sendPhoneOTP`

#### `signOutUser()`
Signs out the current user.

**Returns:**
```javascript
{
  success: boolean,
  message: string
}
```

#### `getCurrentUser()`
Gets the currently authenticated user.

**Returns:** Firebase User object or null

#### `getCurrentUserToken()`
Gets the current user's ID token.

**Returns:** Promise<string|null>

#### `onAuthStateChange(callback)`
Listens to authentication state changes.

**Parameters:**
- `callback` (function): Called with user object

**Returns:** Unsubscribe function

#### `formatPhoneForFirebase(phoneNumber)`
Formats a 10-digit phone number to international format.

**Parameters:**
- `phoneNumber` (string): 10-digit phone number

**Returns:** string (formatted phone with +91)

## Security Considerations

### ✅ reCAPTCHA Protection
- Prevents automated abuse
- Invisible reCAPTCHA v3
- Automatic verification

### ✅ Token Management
- JWT tokens stored securely
- Token auto-refresh on expiry
- Secure logout handling

### ✅ Phone Number Validation
- International format validation
- 10-digit Indian number support
- Input sanitization

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid phone number format" | Wrong format | Use +91 with 10-digit number |
| "reCAPTCHA failed" | Bot detection | Wait and retry |
| "Invalid OTP" | Wrong code | Check SMS and re-enter |
| "Firebase not initialized" | Config missing | Check .env.local variables |

## Testing

### Development Mode
1. Add test phone numbers in Firebase Console
2. Use Firebase console to see test OTPs
3. Test with various phone formats

### Production Mode
1. Real phone numbers and SMS delivery
2. Proper rate limiting
3. Error monitoring

## Data Storage

User data stored locally:
```javascript
// User information
localStorage.setItem('firebaseUser', JSON.stringify(user))

// Authentication token
localStorage.setItem('firebaseIdToken', idToken)

// User role
localStorage.setItem('userRole', role)
```

## Integration with Backend

To validate tokens on your backend:

```javascript
// Backend example (Node.js/Express)
const admin = require('firebase-admin');

app.post('/api/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    res.json({
      uid: decodedToken.uid,
      phoneNumber: decodedToken.phone_number,
      email: decodedToken.email
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

## Troubleshooting

### reCAPTCHA Not Loading
- Check Firebase credentials
- Ensure reCAPTCHA container exists in DOM
- Check browser console for errors

### OTP Not Received
- Check phone number format
- Verify SMS is enabled in Firebase
- Check spam folder

### Token Expired
- Call `getCurrentUserToken()` to refresh
- Log user back in
- Store token in secure cookie

## Future Enhancements

- [ ] Biometric authentication fallback
- [ ] SMS template customization
- [ ] Rate limiting indicators
- [ ] WhatsApp OTP support
- [ ] Multi-language support

## Support

For issues or questions:
1. Check Firebase Console logs
2. Review error messages in browser console
3. Test with Firebase emulator
4. Check Firebase documentation: https://firebase.google.com/docs/auth/web/phone-auth
