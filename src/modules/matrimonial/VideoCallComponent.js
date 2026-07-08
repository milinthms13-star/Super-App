/**
 * Video/Voice Call Component
 * Handles Jitsi and Twilio video/voice calls
 */

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Load Jitsi Meet API script
const loadJitsiScript = () => {
  return new Promise((resolve) => {
    if (window.JitsiMeetExternalAPI) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

const VideoCallComponent = ({ 
  callData, 
  onCallEnd, 
  onCallError,
  currentUser 
}) => {
  const jitsiContainerRef = useRef(null);
  const [jitsiApi, setJitsiApi] = useState(null);
  const [callStatus, setCallStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  useEffect(() => {
    if (!callData) return;

    const initializeCall = async () => {
      try {
        setCallStatus('connecting');

        if (callData.provider === 'jitsi' || !callData.provider) {
          await initializeJitsi();
        } else if (callData.provider === 'twilio') {
          await initializeTwilio();
        }
      } catch (err) {
        console.error('Error initializing call:', err);
        setError('Failed to initialize call');
        if (onCallError) {
          onCallError(err);
        }
      }
    };

    initializeCall();

    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callData]);

  const initializeJitsi = async () => {
    const scriptLoaded = await loadJitsiScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load Jitsi Meet API');
    }

    const roomData = callData.roomData || {};
    const domain = roomData.domain || 'meet.jit.si';
    const roomName = roomData.roomId || callData.roomId;

    const options = {
      roomName,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: callData.callType === 'video' ? false : false,
        startWithVideoMuted: callData.callType === 'voice' ? true : false,
        disableModeratorIndicator: true,
        enableEmailInStats: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'sharedvideo',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'stats',
          'shortcuts',
          'tileview',
          'download',
          'help',
          'mute-everyone'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false
      },
      userInfo: {
        displayName: currentUser?.name || 'User',
        email: currentUser?.email || ''
      }
    };

    if (roomData.token) {
      options.jwt = roomData.token;
    }

    const api = new window.JitsiMeetExternalAPI(domain, options);

    // Event listeners
    api.addEventListener('videoConferenceJoined', () => {
      setCallStatus('connected');
      callStartTime.current = new Date();
      
      // Start duration counter
      durationInterval.current = setInterval(() => {
        if (callStartTime.current) {
          const duration = Math.floor((new Date() - callStartTime.current) / 1000);
          setCallDuration(duration);
        }
      }, 1000);
    });

    api.addEventListener('videoConferenceLeft', () => {
      handleCallEnd();
    });

    api.addEventListener('readyToClose', () => {
      handleCallEnd();
    });

    api.addEventListener('errorOccurred', (error) => {
      console.error('Jitsi error:', error);
      setError('Call error occurred');
      if (onCallError) {
        onCallError(error);
      }
    });

    setJitsiApi(api);
  };

  const initializeTwilio = async () => {
    // Twilio Video implementation
    // This would use Twilio Video SDK
    setError('Twilio integration coming soon');
  };

  const handleCallEnd = async () => {
    try {
      const duration = callDuration;
      
      // Update call status on backend
      await axios.post(
        `${API_BASE_URL}/matrimonial/calls/${callData.callId || callData.id}/end`,
        {
          duration,
          startTime: callStartTime.current,
          callQuality: 'good' // Could be determined by connection stats
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
          }
        }
      );

      if (jitsiApi) {
        jitsiApi.dispose();
        setJitsiApi(null);
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }

      setCallStatus('ended');

      if (onCallEnd) {
        onCallEnd({ duration, callId: callData.callId || callData.id });
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callData) {
    return null;
  }

  return (
    <div className="video-call-container">
      <div className="call-header">
        <div className="call-info">
          <span className="call-type">
            {callData.callType === 'video' ? '📹 Video Call' : '📞 Voice Call'}
          </span>
          <span className="call-status">{callStatus}</span>
          {callStatus === 'connected' && (
            <span className="call-duration">{formatDuration(callDuration)}</span>
          )}
        </div>
        <button 
          className="btn btn-danger btn-end-call"
          onClick={handleCallEnd}
        >
          End Call
        </button>
      </div>

      {error && (
        <div className="call-error">
          <p>{error}</p>
          <button className="btn btn-outline" onClick={onCallEnd}>
            Close
          </button>
        </div>
      )}

      <div 
        ref={jitsiContainerRef} 
        className="jitsi-meet-container"
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 100px)',
          backgroundColor: '#000'
        }}
      />

      <style jsx>{`
        .video-call-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: #000;
        }

        .call-header {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10000;
        }

        .call-info {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .call-type {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .call-status {
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          font-size: 0.9rem;
        }

        .call-duration {
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: bold;
        }

        .btn-end-call {
          background: #dc3545;
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-end-call:hover {
          background: #c82333;
        }

        .call-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 2rem;
          border-radius: 8px;
          text-align: center;
          z-index: 10001;
        }

        .jitsi-meet-container {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
};

VideoCallComponent.propTypes = {
  callData: PropTypes.shape({
    id: PropTypes.string,
    callId: PropTypes.string,
    callType: PropTypes.string,
    provider: PropTypes.string,
    roomId: PropTypes.string,
    roomData: PropTypes.object
  }),
  onCallEnd: PropTypes.func,
  onCallError: PropTypes.func,
  currentUser: PropTypes.object
};

export default VideoCallComponent;
