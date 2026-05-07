import React, { useRef, useState, useEffect } from "react";
import "../sos/PhotoCapture.css";

const PhotoCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("user"); // user | environment
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (error) {
        console.error("Camera access denied:", error);
        setError("Camera permission required to capture evidence.");
        setTimeout(onClose, 2000);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, onClose]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      const video = videoRef.current;

      // Set canvas dimensions
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;

      // Mirror front camera
      if (facingMode === "user") {
        context.scale(-1, 1);
        context.drawImage(video, -video.videoWidth, 0, video.videoWidth, video.videoHeight);
      } else {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      }

      canvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            onCapture(blob);
          }
        },
        "image/jpeg",
        0.9
      );
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  if (error) {
    return (
      <div className="photo-capture-modal">
        <div className="photo-capture-container">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="photo-capture-modal">
      <div className="photo-capture-container">
        <div className="photo-capture-header">
          <h3>Capture Evidence Photo</h3>
          <button className="close-button" onClick={onClose} aria-label="Close camera">
            ✕
          </button>
        </div>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
            width: "100%",
            maxHeight: "400px",
            objectFit: "cover",
            borderRadius: "8px",
            backgroundColor: "#000",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="photo-capture-controls">
          <button onClick={capturePhoto} className="capture-button" title="Capture photo">
            📷 Capture
          </button>
          <button onClick={toggleCamera} className="toggle-button" title="Switch camera">
            🔄 Switch
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCapture;
