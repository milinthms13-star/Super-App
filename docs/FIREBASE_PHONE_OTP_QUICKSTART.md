# Firebase Phone OTP Login - Quick Start Guide

## 📱 What's Implemented?

✅ **Complete Firebase Phone Authentication System**
- Phone OTP login with Firebase
- Secure reCAPTCHA verification
- User session management
- Token-based authentication
- New user detection
- Responsive UI (mobile & desktop)

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Firebase
```bash
npm install firebase
```

### Step 2: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create Project"
3. Fill in project name (e.g., "malabarbazaar")
4. Accept default settings and click "Create"

### Step 3: Enable Phone Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Phone** → **Enable**
3. Add your testing phone number (development)
4. Click **Save**

### Step 4: Get Firebase Credentials
1. Go to **Project Settings** (gear icon)
2. Select **General** tab
3. Scroll to "Your apps" section
4. Click **Web** (</> icon)
5. Copy all the firebase config values

### Step 5: Set Environment Variables
Create `.env.local` file:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Step 6: Use in Your App
```javascript
import FirebasePhoneOTPLogin from './components/auth/FirebasePhoneOTPLogin';

function App() {
  return (
    <FirebasePhoneOTPLogin 
      onLoginSuccess={(user) => {
        console.log('User logged in:', user);
        // Redirect to dashboard
      }}
    />
  );
}
```

## 📁 File Structure

```
src/
├── config/
│   └── firebaseConfig.js              # Firebase initialization
├── services/
│   ├── firebasePhoneAuthService.js    # Auth logic
│   └── firebasePhoneAuthService.test.js
├── components/
│   └── auth/
│       ├── FirebasePhoneOTPLogin.js   # Login component
│       ├── FirebasePhoneOTPLogin.css  # Styling
│       └── FirebasePhoneOTP.examples.js
├── .env.local                         # Environment variables
└── FIREBASE_PHONE_OTP_SETUP.md        # Full documentation
```

## 🎯 Basic Usage

### Simple Login
```javascript
import FirebasePhoneOTPLogin from './components/auth/FirebasePhoneOTPLogin';

export default function LoginPage() {
  const handleSuccess = (user) => {
    console.log('Logged in:', user.phoneNumber);
    // Navigate to dashboard
  };

  return (
    <FirebasePhoneOTPLogin 
      onLoginSuccess={handleSuccess}
      onClose={() => console.log('Closed')}
    />
  );
}
```

### Check if User is Logged In
```javascript
import { onAuthStateChange } from './services/firebasePhoneAuthService';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  if (!user) return <div>Loading...</div>;

  return <h1>Welcome {user.phoneNumber}</h1>;
}
```

### Make Authenticated API Calls
```javascript
import axios from 'axios';
import { getCurrentUserToken } from './services/firebasePhoneAuthService';

async function fetchUserData() {
  const token = await getCurrentUserToken();
  
  const response = await axios.get('/api/user', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  return response.data;
}
```

### Logout
```javascript
import { signOutUser } from './services/firebasePhoneAuthService';

async function handleLogout() {
  const result = await signOutUser();
  if (result.success) {
    window.location.href = '/login';
  }
}
```

## 🔐 Security Features

✅ **reCAPTCHA v3** - Prevents automated abuse
✅ **JWT Tokens** - Secure authentication
✅ **Phone Validation** - Input sanitization
✅ **Session Management** - Automatic token refresh
✅ **Secure Logout** - Proper cleanup

## 🧪 Testing

### Test with Sample Numbers (Development)
1. In Firebase Console → Authentication → Phone
2. Add your phone number to "Testing phone numbers"
3. Firebase Console will show test OTP
4. Use that OTP to test login

### Test Flow
1. Enter phone: `98765 43210`
2. Click "Send OTP"
3. Check Console for test OTP (or SMS if real number)
4. Enter OTP and verify

## ⚙️ API Reference

### Service Methods

**Send OTP**
```javascript
const result = await sendPhoneOTP('+919876543210', 'recaptcha-container');
```

**Verify OTP**
```javascript
const result = await verifyPhoneOTP('123456');
```

**Resend OTP**
```javascript
const result = await resendPhoneOTP('+919876543210', 'recaptcha-container');
```

**Get Current User**
```javascript
const user = getCurrentUser();
```

**Get Auth Token**
```javascript
const token = await getCurrentUserToken();
```

**Listen to Auth Changes**
```javascript
const unsubscribe = onAuthStateChange((user) => {
  if (user) console.log('Logged in');
  else console.log('Logged out');
});
```

**Sign Out**
```javascript
const result = await signOutUser();
```

## 🐛 Troubleshooting

### reCAPTCHA Not Loading
- Check Firebase credentials in `.env.local`
- Ensure `recaptcha-container` div exists
- Check browser console for errors

### OTP Not Received
- Verify phone number format: `10 digits`
- Check if phone is added to testing numbers (dev)
- Check SMS/spam folder

### Firebase Not Initialized
- Verify `.env.local` variables
- Check if all 6 environment variables are set
- Restart dev server: `npm start`

### "Invalid Phone Format"
- Must be 10 digits
- Must be Indian number (for +91)
- Allowed formats: `9876543210`, `+919876543210`, `98-765-43210`

## 📱 Component Props

```javascript
<FirebasePhoneOTPLogin
  onLoginSuccess={function}   // Called when login succeeds
  role="user"                 // User role (user, driver, seller, etc)
  onClose={function}          // Called when close button clicked
/>
```

## 💾 Data Storage

Local storage keys:
- `firebaseUser` - User information
- `firebaseIdToken` - Authentication token
- `userRole` - User's role

## 🔗 Integration with Existing Auth

To replace existing login:
```javascript
// Old way
import LoginFlow from './modules/ridesharing/components/auth/LoginFlow';

// New way
import FirebasePhoneOTPLogin from './components/auth/FirebasePhoneOTPLogin';
```

## 📚 Full Documentation

See `FIREBASE_PHONE_OTP_SETUP.md` for:
- Detailed setup instructions
- Security considerations
- Backend integration
- Error handling
- Production deployment
- Advanced features

## ✨ Features Summary

| Feature | Status |
|---------|--------|
| Phone OTP Login | ✅ |
| reCAPTCHA Protection | ✅ |
| User Sessions | ✅ |
| Token Management | ✅ |
| Error Handling | ✅ |
| Mobile Responsive | ✅ |
| Dark Mode | ✅ |
| Resend OTP | ✅ |
| New User Detection | ✅ |
| Logout | ✅ |
| Protected Routes | ✅ |
| Backend Integration | ✅ |

## 🚀 Next Steps

1. ✅ Set up Firebase project
2. ✅ Add environment variables
3. ✅ Install dependencies
4. ✅ Test login flow
5. ⏭️ Integrate with your backend
6. ⏭️ Deploy to production

## 📞 Support Resources

- Firebase Docs: https://firebase.google.com/docs/auth/web/phone-auth
- reCAPTCHA: https://www.google.com/recaptcha/admin
- Examples: See `FirebasePhoneOTP.examples.js`

---

**Ready to use!** 🎉

Start with `npm install firebase` and add your Firebase credentials to `.env.local`
