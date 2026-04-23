import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import './CallWindow.css';
import { getEntityId } from './utils';

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const CallWindow = ({ call, onEndCall, onAcceptCall, onDeclineCall }) => {
  const { currentUser } = useApp();
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

  const currentUserId = getEntityId(call.currentUserId || currentUser);
  const caller = call.caller || call.initiatorId || {};
  const recipient = call.recipient || call.recipientId || {};

  useEffect(() => {
    setCallStatus(call.status);
  }, [call.status]);

  const initializeCall = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: call.callType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);

      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      peerConnectionRef.current.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if (getEntityId(call.initiatorId) === currentUserId) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
      }
    } catch (error) {
      console.error('Failed to initialize call:', error);
      onEndCall();
    }
  }, [call.callType, call.initiatorId, currentUserId, onEndCall]);

  useEffect(() => {
    if (call.status === 'accepted') {
      initializeCall();
      startDurationTimer();
    }

    return () => {
      cleanupCall();
    };
  }, [call.status, initializeCall]);

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((currentDuration) => currentDuration + 1);
    }, 1000);
  };

  const cleanupCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleMute = () => {
    if (!localStreamRef.current) {
      return;
    }

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) {
      return;
    }

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (localStreamRef.current) {
          const screenTrack = localStreamRef.current.getVideoTracks().find((track) =>
            track.getSettings().displaySurface
          );
          if (screenTrack) {
            screenTrack.stop();
          }
        }
        setIsScreenSharing(false);
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }

      const screenTrack = screenStream.getVideoTracks()[0];
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(
          (candidate) => candidate.track && candidate.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        setIsScreenSharing(false);
      };

      setIsScreenSharing(true);
    } catch (error) {
      console.error('Screen sharing failed:', error);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'initiating':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'accepted':
        return formatDuration(callDuration);
      case 'declined':
        return 'Call declined';
      case 'ended':
        return 'Call ended';
      default:
        return 'Connecting...';
    }
  };

  const isIncomingCall = getEntityId(call.recipientId) === currentUserId;
  const otherParticipant = getEntityId(call.initiatorId) === currentUserId ? recipient : caller;

  return (
    <div className="call-window-overlay">
      <div className="call-window">
        <div className="call-header">
          <div className="call-info">
            <h3>{otherParticipant?.name || 'Unknown'}</h3>
            <p className="call-status">{getCallStatusText()}</p>
          </div>
          <button className="btn-close-call" onClick={onEndCall} type="button">
            X
          </button>
        </div>

        <div className="call-content">
          {call.callType === 'video' && (
            <div className="video-container">
              <video ref={remoteVideoRef} className="remote-video" autoPlay playsInline />
              <video ref={localVideoRef} className="local-video" autoPlay playsInline muted />
              {isScreenSharing && (
                <video ref={screenVideoRef} className="screen-video" autoPlay playsInline />
              )}
            </div>
          )}

          {call.callType === 'audio' && (
            <div className="audio-call-container">
              <div className="audio-avatar">
                <span className="avatar-icon">Call</span>
              </div>
            </div>
          )}
        </div>

        <div className="call-controls">
          {call.status === 'ringing' && isIncomingCall ? (
            <>
              <button className="btn-call-control decline" onClick={onDeclineCall} type="button">
                Decline
              </button>
              <button className="btn-call-control accept" onClick={onAcceptCall} type="button">
                Accept
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-call-control ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
                type="button"
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              {call.callType === 'video' && (
                <>
                  <button
                    className={`btn-call-control ${!isVideoEnabled ? 'active' : ''}`}
                    onClick={toggleVideo}
                    type="button"
                  >
                    {!isVideoEnabled ? 'Turn On' : 'Turn Off'}
                  </button>

                  <button
                    className={`btn-call-control ${isScreenSharing ? 'active' : ''}`}
                    onClick={toggleScreenShare}
                    type="button"
                  >
                    Share Screen
                  </button>
                </>
              )}

              <button className="btn-call-control end" onClick={onEndCall} type="button">
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
