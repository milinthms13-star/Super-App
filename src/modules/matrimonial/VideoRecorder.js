import React, { useState, useRef, useEffect } from 'react';
import './VideoRecorder.css';

const VideoRecorder = ({ onComplete, onCancel, maxDuration = 60 }) => {
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [duration, setDuration] = useState(0);
  const [preview, setPreview] = useState(false);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recording]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      alert('Camera access denied. Please allow camera and microphone access.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecordingCountdown = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(countdownInterval);
          startRecording();
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setPreview(true);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
    setDuration(0);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleRetake = () => {
    setRecordedBlob(null);
    setPreview(false);
    setDuration(0);
    startCamera();
  };

  const handleComplete = () => {
    if (recordedBlob) {
      onComplete(recordedBlob);
      stopCamera();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="video-recorder">
      <div className="recorder-container">
        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {preview && recordedBlob ? (
          <video
            src={URL.createObjectURL(recordedBlob)}
            controls
            className="video-preview"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="video-stream"
          />
        )}

        {recording && (
          <div className="recording-indicator">
            <span className="rec-dot"></span>
            REC {formatTime(duration)} / {formatTime(maxDuration)}
          </div>
        )}
      </div>

      <div className="recorder-controls">
        {!preview ? (
          <>
            {!recording ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={startRecordingCountdown}
              >
                Start Recording
              </button>
            ) : (
              <button
                className="btn btn-danger btn-lg"
                onClick={stopRecording}
              >
                Stop Recording
              </button>
            )}
            
            <button
              className="btn btn-outline"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleComplete}
            >
              Use This Video
            </button>
            
            <button
              className="btn btn-outline"
              onClick={handleRetake}
            >
              Retake
            </button>
          </>
        )}
      </div>

      <div className="recorder-tips">
        <h4>Recording Tips:</h4>
        <ul>
          <li>Ensure good lighting on your face</li>
          <li>Speak clearly and introduce yourself</li>
          <li>Maximum duration: {maxDuration} seconds</li>
          <li>Mention your name, profession, and what you're looking for</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoRecorder;
