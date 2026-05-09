/**
 * Firebase Phone OTP Login - Integration Examples
 * Shows how to integrate Firebase phone authentication in various components
 */

// Example 1: Simple Login Modal
// ============================================
import React, { useState } from 'react';
import FirebasePhoneOTPLogin from './components/auth/FirebasePhoneOTPLogin';

export function LoginModalExample() {
  const [showLogin, setShowLogin] = useState(false);

  const handleLoginSuccess = (user) => {
    console.log('User logged in:', user);
    setShowLogin(false);
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };

  return (
    <>
      <button onClick={() => setShowLogin(true)}>Login with Phone</button>
      {showLogin && (
        <FirebasePhoneOTPLogin
          onLoginSuccess={handleLoginSuccess}
          role="user"
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}

// Example 2: Protected Route with Firebase Auth
// ============================================
import { useEffect, useState } from 'react';
import { getCurrentUser, onAuthStateChange } from './services/firebasePhoneAuthService';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

// Example 3: User Profile Component
// ============================================
import { getCurrentUserToken, signOutUser } from './services/firebasePhoneAuthService';

export function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const user = getCurrentUser();
    setUser(user);
  }, []);

  const handleLogout = async () => {
    const result = await signOutUser();
    if (result.success) {
      window.location.href = '/login';
    }
  };

  const handleGetToken = async () => {
    const token = await getCurrentUserToken();
    console.log('Current token:', token);
    // Use this token for API calls
  };

  if (!user) return <div>Not authenticated</div>;

  return (
    <div className="profile-card">
      <h2>Profile</h2>
      <p>Phone: {user.phoneNumber}</p>
      <p>UID: {user.uid}</p>
      <button onClick={handleGetToken}>Get Auth Token</button>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

// Example 4: API Call with Firebase Token
// ============================================
import axios from 'axios';
import { getCurrentUserToken } from './services/firebasePhoneAuthService';

export async function makeAuthenticatedRequest(endpoint, data = null) {
  try {
    const token = await getCurrentUserToken();

    if (!token) {
      throw new Error('No authentication token');
    }

    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const response = data
      ? await axios.post(endpoint, data, config)
      : await axios.get(endpoint, config);

    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Example 5: App-level Auth State Management
// ============================================
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChange, getCurrentUserToken } from './services/firebasePhoneAuthService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await getCurrentUserToken();
        setIdToken(token);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, idToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Usage in component:
// function MyComponent() {
//   const { user, idToken, loading } = useAuth();
//   if (loading) return <div>Loading...</div>;
//   return <div>Welcome {user?.phoneNumber}</div>;
// }

// Example 6: Module Integration (RideSharing)
// ============================================
export function RideSharingLoginWithFirebase() {
  const [authMethod, setAuthMethod] = useState('firebase'); // 'firebase' | 'existing'

  const handleFirebaseSuccess = (firebaseUser) => {
    // Convert Firebase user to your app format
    const appUser = {
      uid: firebaseUser.uid,
      phone: firebaseUser.phoneNumber,
      isNewUser: firebaseUser.isNewUser,
      source: 'firebase',
    };

    // Save to app context or localStorage
    localStorage.setItem('appUser', JSON.stringify(appUser));

    // Sync with backend if needed
    syncUserWithBackend(appUser);
  };

  async function syncUserWithBackend(user) {
    try {
      const token = await getCurrentUserToken();
      const response = await axios.post('/api/auth/sync-firebase-user', {
        firebaseUser: user,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('User synced:', response.data);
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  return (
    <div>
      {authMethod === 'firebase' && (
        <FirebasePhoneOTPLogin
          onLoginSuccess={handleFirebaseSuccess}
          role="driver"
        />
      )}
    </div>
  );
}

// Example 7: Multi-Step Authentication with Profile
// ============================================
export function AuthenticationFlow({ onComplete }) {
  const [step, setStep] = useState('login'); // 'login' | 'profile' | 'verification'
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (firebaseUser) => {
    setUser(firebaseUser);

    if (firebaseUser.isNewUser) {
      setStep('profile');
    } else {
      setStep('verification');
    }
  };

  const handleProfileComplete = (profile) => {
    const completeUser = { ...user, ...profile };
    setUser(completeUser);
    setStep('verification');
  };

  const handleVerificationComplete = () => {
    onComplete(user);
  };

  return (
    <>
      {step === 'login' && (
        <FirebasePhoneOTPLogin onLoginSuccess={handleLoginSuccess} />
      )}
      {step === 'profile' && user?.isNewUser && (
        <UserProfileForm
          onComplete={handleProfileComplete}
          user={user}
        />
      )}
      {step === 'verification' && (
        <VerificationStep
          onComplete={handleVerificationComplete}
          user={user}
        />
      )}
    </>
  );
}

// Helper: UserProfileForm Component
export function UserProfileForm({ onComplete, user }) {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(profile);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="First Name"
        value={profile.firstName}
        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Last Name"
        value={profile.lastName}
        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={profile.email}
        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
      />
      <button type="submit">Continue</button>
    </form>
  );
}

// Helper: VerificationStep Component
export function VerificationStep({ onComplete, user }) {
  return (
    <div>
      <h2>Verification Pending</h2>
      <p>Your account {user.phoneNumber} is being verified.</p>
      <button onClick={onComplete}>Proceed to Dashboard</button>
    </div>
  );
}

// Example 8: Error Boundary for Auth
// ============================================
export class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Auth Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Authentication Error</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default {
  LoginModalExample,
  ProtectedRoute,
  UserProfile,
  makeAuthenticatedRequest,
  AuthProvider,
  useAuth,
  RideSharingLoginWithFirebase,
  AuthenticationFlow,
};
