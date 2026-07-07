import React, { useEffect, useRef, useState } from "react";
import { healthcareApi } from "../services/healthcareApi";
import "./VideoConsultation.css";

const VideoConsultation = ({ appointmentId, userRole = "patient", onEnd }) => {
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callStatus, setCallStatus] = useState("connecting");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    loadConsultation();
    return () => {
      cleanupCall();
    };
  }, [appointmentId]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const data = await healthcareApi.getVideoConsultation(appointmentId);
      setConsultation(data);
      
      if (data.status === "scheduled" || data.status === "ready") {
        await initializeCall();
      } else if (data.status === "in_progress") {
        await joinCall();
      }
    } catch (err) {
      setError(err.message || "Failed to load video consultation");
    } finally {
      setLoading(false);
    }
  };

  const initializeCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      
      setLocalStream(stream);
      setCallStatus("ready");

      // Auto-start call after getting media
      if (userRole === "doctor") {
        await startCall(stream);
      }
    } catch (err) {
      console.error("Failed to get user media:", err);
      setError("Failed to access camera/microphone. Please check permissions.");
      setCallStatus("error");
    }
  };

  const startCall = async (stream) => {
    try {
      setCallStatus("connecting");
      
      // Create peer connection (simplified WebRTC setup)
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setCallStatus("connected");
        startDurationTimer();
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send candidate to signaling server (simplified)
          console.log("ICE candidate:", event.candidate);
        }
      };

      // Update consultation status
      await healthcareApi.startVideoConsultation(consultation.id);
      
    } catch (err) {
      console.error("Failed to start call:", err);
      setError("Failed to start video call");
      setCallStatus("error");
    }
  };

  const joinCall = async () => {
    await initializeCall();
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    try {
      await healthcareApi.endVideoConsultation(consultation.id);
      cleanupCall();
      if (onEnd) {
        onEnd();
      }
    } catch (err) {
      console.error("Failed to end call:", err);
      cleanupCall();
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setCallStatus("ended");
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;

    const message = {
      id: Date.now(),
      sender: userRole,
      text: chatInput,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, message]);
    setChatInput("");

    // In production, send message through WebSocket or signaling server
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="video-consultation">
        <div className="loading-state">Loading video consultation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-consultation">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadConsultation}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-consultation" data-testid="video-consultation">
      <div className="video-header">
        <div className="consultation-info">
          <h3>Video Consultation</h3>
          <span className="call-status">{callStatus}</span>
          {callStatus === "connected" && (
            <span className="call-duration">{formatDuration(callDuration)}</span>
          )}
        </div>
        <button className="close-btn" onClick={endCall}>×</button>
      </div>

      <div className="video-container">
        <div className="remote-video-wrapper">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="remote-video"
            />
          ) : (
            <div className="waiting-for-remote">
              <div className="avatar-placeholder">
                <span>{userRole === "doctor" ? "P" : "D"}</span>
              </div>
              <p>Waiting for {userRole === "doctor" ? "patient" : "doctor"} to join...</p>
            </div>
          )}
        </div>

        <div className="local-video-wrapper">
          {localStream && !isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          ) : (
            <div className="video-off-placeholder">
              <span>Video Off</span>
            </div>
          )}
        </div>
      </div>

      <div className="video-controls">
        <button
          className={`control-btn ${isMuted ? "active" : ""}`}
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
        >
          <span className="icon">{isMuted ? "🔇" : "🎤"}</span>
        </button>

        <button
          className={`control-btn ${isVideoOff ? "active" : ""}`}
          onClick={toggleVideo}
          title={isVideoOff ? "Turn on video" : "Turn off video"}
        >
          <span className="icon">{isVideoOff ? "📹" : "📷"}</span>
        </button>

        <button
          className="control-btn"
          onClick={() => setShowChat(!showChat)}
          title="Toggle chat"
        >
          <span className="icon">💬</span>
          {chatMessages.length > 0 && (
            <span className="badge">{chatMessages.length}</span>
          )}
        </button>

        <button
          className="control-btn end-call-btn"
          onClick={endCall}
          title="End call"
        >
          <span className="icon">📞</span>
        </button>
      </div>

      {showChat && (
        <div className="chat-panel">
          <div className="chat-header">
            <h4>Chat</h4>
            <button onClick={() => setShowChat(false)}>×</button>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.sender === userRole ? "own" : "other"}`}
              >
                <div className="message-sender">{msg.sender === userRole ? "You" : "Other"}</div>
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
              placeholder="Type a message..."
            />
            <button onClick={sendChatMessage}>Send</button>
          </div>
        </div>
      )}

      <div className="consultation-details">
        <p><strong>Meeting ID:</strong> {consultation?.meetingId}</p>
        <p><strong>Provider:</strong> {consultation?.meetingProvider}</p>
      </div>
    </div>
  );
};

export default VideoConsultation;
