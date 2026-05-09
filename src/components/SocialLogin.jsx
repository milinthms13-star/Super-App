/**
 * SocialLogin.jsx
 * Social authentication component with Google, Facebook, Apple, LinkedIn
 */

import React, { useState } from 'react';
import axios from 'axios';
import './SocialLogin.css';

const SocialLogin = ({ onSuccess, onError, isLinking = false, userId = null }) => {
  const [loading, setLoading] = useState(null); // google | facebook | apple
  const [error, setError] = useState('');

  // Google Login
  const handleGoogleLogin = async (response) => {
    if (!response.credential) return;

    setLoading('google');
    setError('');

    try {
      const endpoint = isLinking ? '/api/auth/social/link-social' : '/api/auth/social/google/login';
      
      const requestData = isLinking
        ? { provider: 'google', profileData: { id: response.credential } }
        : { idToken: response.credential };

      const apiResponse = await axios.post(endpoint, requestData, {
        headers: isLinking ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}
      });

      if (isLinking) {
        onSuccess?.({ type: 'linked', provider: 'google', message: 'Google account linked successfully' });
      } else {
        localStorage.setItem('accessToken', apiResponse.data.data.accessToken);
        localStorage.setItem('user', JSON.stringify(apiResponse.data.data.user));
        onSuccess?.(apiResponse.data.data);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Google login failed. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  // Facebook Login
  const handleFacebookLogin = async () => {
    setLoading('facebook');
    setError('');

    // Facebook SDK should be loaded in HTML
    if (!window.FB) {
      setError('Facebook SDK not loaded');
      setLoading(null);
      return;
    }

    window.FB.login(
      async (response) => {
        if (response.authResponse) {
          try {
            const endpoint = isLinking ? '/api/auth/social/link-social' : '/api/auth/social/facebook/login';
            
            const requestData = isLinking
              ? { provider: 'facebook', profileData: { accessToken: response.authResponse.accessToken } }
              : { accessToken: response.authResponse.accessToken };

            const apiResponse = await axios.post(endpoint, requestData, {
              headers: isLinking ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}
            });

            if (isLinking) {
              onSuccess?.({ type: 'linked', provider: 'facebook', message: 'Facebook account linked successfully' });
            } else {
              localStorage.setItem('accessToken', apiResponse.data.data.accessToken);
              localStorage.setItem('user', JSON.stringify(apiResponse.data.data.user));
              onSuccess?.(apiResponse.data.data);
            }
          } catch (err) {
            const errorMsg = err.response?.data?.error || 'Facebook login failed. Please try again.';
            setError(errorMsg);
            onError?.(errorMsg);
          }
        } else {
          setError('Facebook login cancelled');
        }
        setLoading(null);
      },
      { scope: 'public_profile,email' }
    );
  };

  // Apple Login
  const handleAppleLogin = async () => {
    setLoading('apple');
    setError('');

    try {
      if (!window.AppleID) {
        setError('Apple Sign In not available');
        setLoading(null);
        return;
      }

      window.AppleID.auth.init({
        clientId: process.env.REACT_APP_APPLE_CLIENT_ID,
        teamId: process.env.REACT_APP_APPLE_TEAM_ID,
        keyId: process.env.REACT_APP_APPLE_KEY_ID,
        redirectURI: process.env.REACT_APP_APPLE_REDIRECT_URI,
        usePopup: true
      });

      const data = await window.AppleID.auth.signIn();

      if (data.authorization?.identityToken) {
        const endpoint = isLinking ? '/api/auth/social/link-social' : '/api/auth/social/apple/login';
        
        const requestData = isLinking
          ? { provider: 'apple', profileData: { identityToken: data.authorization.identityToken } }
          : { identityToken: data.authorization.identityToken };

        const apiResponse = await axios.post(endpoint, requestData, {
          headers: isLinking ? { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } : {}
        });

        if (isLinking) {
          onSuccess?.({ type: 'linked', provider: 'apple', message: 'Apple account linked successfully' });
        } else {
          localStorage.setItem('accessToken', apiResponse.data.data.accessToken);
          localStorage.setItem('user', JSON.stringify(apiResponse.data.data.user));
          onSuccess?.(apiResponse.data.data);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Apple login failed. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  // LinkedIn Login (similar pattern)
  const handleLinkedInLogin = async () => {
    setLoading('linkedin');
    setError('');

    try {
      // LinkedIn OAuth flow - simplified
      const clientId = process.env.REACT_APP_LINKEDIN_CLIENT_ID;
      const redirectUri = encodeURIComponent(process.env.REACT_APP_LINKEDIN_REDIRECT_URI);
      const scope = encodeURIComponent('openid profile email');

      window.location.href = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    } catch (err) {
      const errorMsg = 'LinkedIn login failed. Please try again.';
      setError(errorMsg);
      onError?.(errorMsg);
      setLoading(null);
    }
  };

  return (
    <div className="social-login-container">
      <div className="social-login-header">
        <h3>{isLinking ? 'Connect Social Account' : 'Login with'}</h3>
        {error && <div className="social-error-message">{error}</div>}
      </div>

      <div className="social-buttons-grid">
        {/* Google Login Button */}
        <button
          onClick={() => handleGoogleLogin({ credential: 'mock-google-token' })}
          disabled={loading !== null}
          className="social-button google"
          title="Login with Google"
        >
          <div className="social-button-content">
            {loading === 'google' ? (
              <span className="social-spinner"></span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google</span>
              </>
            )}
          </div>
        </button>

        {/* Facebook Login Button */}
        <button
          onClick={handleFacebookLogin}
          disabled={loading !== null}
          className="social-button facebook"
          title="Login with Facebook"
        >
          <div className="social-button-content">
            {loading === 'facebook' ? (
              <span className="social-spinner"></span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="currentColor"
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
                <span>Facebook</span>
              </>
            )}
          </div>
        </button>

        {/* Apple Login Button */}
        <button
          onClick={handleAppleLogin}
          disabled={loading !== null}
          className="social-button apple"
          title="Login with Apple"
        >
          <div className="social-button-content">
            {loading === 'apple' ? (
              <span className="social-spinner"></span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="currentColor"
                    d="M17.05 13.5c-.91 0-1.805.124-2.685.37.12.56.766 2.688 2.335 4.286 1.48 1.51 3.248 2.233 4.298 2.233.07-.015.14-.03.21-.045-.73-1.23-1.648-2.806-2.335-4.286-.687-1.48-1.632-3.248-1.823-2.558zM13.51 2.02c-.158.145-.32.296-.476.453.47.558 1.083 1.288 1.733 2.28.65.99 1.32 2.223 1.85 3.59.52 1.364.883 2.922.883 4.543 0 1.22-.18 2.41-.51 3.56.88.243 1.77.36 2.68.36 1.308 0 2.585-.207 3.82-.626 1.235-.418 2.386-.994 3.35-1.714-.92-1.08-2.38-2.27-4.05-3.29-1.67-1.02-3.54-1.84-5.3-2.16z"
                  />
                </svg>
                <span>Apple</span>
              </>
            )}
          </div>
        </button>

        {/* LinkedIn Login Button */}
        <button
          onClick={handleLinkedInLogin}
          disabled={loading !== null}
          className="social-button linkedin"
          title="Login with LinkedIn"
        >
          <div className="social-button-content">
            {loading === 'linkedin' ? (
              <span className="social-spinner"></span>
            ) : (
              <>
                <svg viewBox="0 0 24 24" width="24" height="24">
                  <path
                    fill="currentColor"
                    d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.39v-1.2h-2.5v8.5h2.5v-4.74c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.74h2.5M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.5H5.5v8.5h2.77z"
                  />
                </svg>
                <span>LinkedIn</span>
              </>
            )}
          </div>
        </button>
      </div>

      {!isLinking && (
        <p className="social-terms">
          By signing in, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
        </p>
      )}
    </div>
  );
};

export default SocialLogin;
