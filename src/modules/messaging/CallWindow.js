import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import './CallWindow.css';

const CallWindow = ({ call, onEndCall, onAcceptCall, onDeclineCall }) => {
  const { apiCall, currentUser } = useApp();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(call.callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState(call.status);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // WebRTC configuration
  const rtcConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (call.status === 'accepted') {
      initializeCall();
      startDurationTimer();
    }

    return () => {
      cleanupCall();
    };
  }, [call.status]);

  const initializeCall = async () => {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: call.callType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to remote peer via WebSocket
          // This would be handled by the WebSocket connection
        }
      };

      // Create offer if initiator
      if (call.initiatorId === currentUser._id) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        // Send offer to remote peer
        // This would be handled by the WebSocket connection
      }

    } catch (error) {
      console.error('Failed to initialize call:', error);
      onEndCall();
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const cleanupCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks().find(track =>
            track.getSettings().displaySurface
          );
          if (screenTrack) {
            screenTrack.stop();
          }
        }
        setIsScreenSharing(false);
      } else {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream;
        }

        // Add screen track to peer connection
        const screenTrack = screenStream.getVideoTracks()[0];
        if (peerConnectionRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s =>
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          // Restore camera track
          if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            if (peerConnectionRef.current && cameraTrack) {
              const sender = peerConnectionRef.current.getSenders().find(s =>
                s.track && s.track.kind === 'video'
              );
              if (sender) {
                sender.replaceTrack(cameraTrack);
              }
            }
          }
        };

        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen sharing failed:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'initiating': return 'Calling...';
      case 'ringing': return 'Ringing...';
      case 'accepted': return formatDuration(callDuration);
      case 'declined': return 'Call declined';
      case 'ended': return 'Call ended';
      default: return 'Connecting...';
    }
  };

  const isIncomingCall = call.recipientId === currentUser._id;
  const otherParticipant = call.initiatorId === currentUser._id
    ? call.recipientId
    : call.initiatorId;

  return (
    <div className="call-window-overlay">
      <div className="call-window">
        <div className="call-header">
          <div className="call-info">
            <h3>{otherParticipant?.name || 'Unknown'}</h3>
            <p className="call-status">{getCallStatusText()}</p>
          </div>
          <button className="btn-close-call" onClick={onEndCall}>
            ✕
          </button>
        </div>

        <div className="call-content">
          {call.callType === 'video' && (
            <div className="video-container">
              <video
                ref={remoteVideoRef}
                className="remote-video"
                autoPlay
                playsInline
              />
              <video
                ref={localVideoRef}
                className="local-video"
                autoPlay
                playsInline
                muted
              />
              {isScreenSharing && (
                <video
                  ref={screenVideoRef}
                  className="screen-video"
                  autoPlay
                  playsInline
                />
              )}
            </div>
          )}

          {call.callType === 'audio' && (
            <div className="audio-call-container">
              <div className="audio-avatar">
                <span className="avatar-icon">🎤</span>
              </div>
              <div className="audio-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          )}
        </div>

        <div className="call-controls">
          {call.status === 'ringing' && isIncomingCall ? (
            <>
              <button className="btn-call-control decline" onClick={onDeclineCall}>
                <span className="control-icon">📞</span>
                Decline
              </button>
              <button className="btn-call-control accept" onClick={onAcceptCall}>
                <span className="control-icon">📞</span>
                Accept
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-call-control ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
              >
                <span className="control-icon">{isMuted ? '🔇' : '🎤'}</span>
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              {call.callType === 'video' && (
                <>
                  <button
                    className={`btn-call-control ${!isVideoEnabled ? 'active' : ''}`}
                    onClick={toggleVideo}
                  >
                    <span className="control-icon">{!isVideoEnabled ? '📷' : '📹'}</span>
                    {!isVideoEnabled ? 'Turn On' : 'Turn Off'}
                  </button>

                  <button
                    className={`btn-call-control ${isScreenSharing ? 'active' : ''}`}
                    onClick={toggleScreenShare}
                  >
                    <span className="control-icon">🖥️</span>
                    Share Screen
                  </button>
                </>
              )}

              <button className="btn-call-control end" onClick={onEndCall}>
                <span className="control-icon">📞</span>
                End Call
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallWindow;