import React, { useState, useRef, useEffect } from 'react';
import './VideoRecorder.css';

/**
 * VideoRecorder Component
 * Captures video from device camera with quality selection
 * Ready for transcoding to MP4 and S3 storage
 */
const VideoRecorder = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  onVideoData,
  maxDuration = 300, // 5 minutes
  qualityPreset = 'medium' // low, medium, high
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, processing
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(qualityPreset);
  const [videoStats, setVideoStats] = useState({
    frames: 0,
    fps: 0,
    bitrate: '0 kbps',
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const videoChunksRef = useRef([]);
  const frameCountRef = useRef(0);
  const startTimeRef = useRef(null);

  /**
   * Quality presets for different connection speeds
   */
  const QUALITY_PRESETS = {
    low: {
      video: { width: 320, height: 240, facingMode: 'user' },
      mimeType: 'video/webm;codecs=vp8',
      bitrate: 500000, // 500 kbps
    },
    medium: {
      video: { width: 640, height: 480, facingMode: 'user' },
      mimeType: 'video/webm;codecs=vp8,opus',
      bitrate: 2500000, // 2.5 Mbps
    },
    high: {
      video: { width: 1280, height: 720, facingMode: 'user' },
      mimeType: 'video/webm;codecs=vp9,opus',
      bitrate: 5000000, // 5 Mbps
    },
  };

  /**
   * Request camera access and initialize MediaRecorder
   */
  const initializeVideoRecording = async () => {
    try {
      setPermissionDenied(false);
      const preset = QUALITY_PRESETS[selectedQuality];

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: preset.video,
      });

      streamRef.current = stream;
      videoChunksRef.current = [];
      frameCountRef.current = 0;
      startTimeRef.current = Date.now();

      // Display camera preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }

      // Create MediaRecorder with appropriate MIME type
      const mimeType = preset.mimeType;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: preset.bitrate,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Collect video chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });

        // Convert to base64 for transmission
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Video = reader.result.split(',')[1];

          onVideoData?.({
            video: base64Video,
            duration: recordingTime,
            mimeType,
            quality: selectedQuality,
            resolution: `${preset.video.width}x${preset.video.height}`,
            bitrate: preset.bitrate,
            timestamp: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(videoBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setCameraActive(false);
        setRecordingState('idle');
      };

      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      onStartRecording?.();

      // Start timer and stats
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });

        // Update frame count
        frameCountRef.current++;
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const fps = Math.round(frameCountRef.current / elapsed);
        const bitrate = Math.round((videoChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0) / elapsed) * 8);

        setVideoStats({
          frames: frameCountRef.current,
          fps,
          bitrate: bitrate > 1000 ? `${(bitrate / 1000).toFixed(1)} Mbps` : `${bitrate} kbps`,
        });
      }, 1000);
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        console.error('Camera permission denied:', error);
      } else {
        console.error('Video recording error:', error);
      }
    }
  };

  /**
   * Start recording video
   */
  const startRecording = async () => {
    await initializeVideoRecording();
  };

  /**
   * Stop recording and process video
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      setRecordingState('processing');
      mediaRecorderRef.current.stop();

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      onStopRecording?.();
    }
  };

  /**
   * Cancel recording and cleanup
   */
  const cancelRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    videoChunksRef.current = [];
    mediaRecorderRef.current = null;
    setCameraActive(false);
    setRecordingState('idle');
    setRecordingTime(0);
  };

  /**
   * Format time (MM:SS)
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const recordingPercentage = (recordingTime / maxDuration) * 100;

  if (permissionDenied) {
    return (
      <div className="video-recorder permission-denied">
        <div className="video-recorder-error">
          <span className="material-icons">videocam_off</span>
          <p>Camera access denied</p>
          <small>Please allow camera permissions to record video</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-recorder recording-state-${recordingState}`}>
      <div className="video-recorder-header">
        <span className="material-icons">videocam</span>
        <h3>Video Recording</h3>
        <span className="time-display">{formatTime(recordingTime)}</span>
      </div>

      {/* Camera Preview */}
      {(recordingState === 'idle' || recordingState === 'recording') && (
        <div className="camera-preview-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />
          {recordingState === 'recording' && (
            <div className="recording-overlay">
              <span className="recording-indicator">
                <span className="pulse-dot"></span>
                REC
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recording Status */}
      {recordingState === 'recording' && (
        <div className="recording-status">
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Quality</span>
              <span className="stat-value">{selectedQuality.toUpperCase()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">FPS</span>
              <span className="stat-value">{videoStats.fps}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Bitrate</span>
              <span className="stat-value">{videoStats.bitrate}</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="recording-progress">
        <div
          className="progress-bar"
          style={{ width: `${recordingPercentage}%` }}
        ></div>
      </div>

      {/* Duration Info */}
      <div className="duration-info">
        <span>{recordingTime}s</span>
        <span className="duration-max">{maxDuration}s max</span>
      </div>

      {/* Quality Selection */}
      {recordingState === 'idle' && (
        <div className="quality-selector">
          <label>Video Quality</label>
          <div className="quality-buttons">
            {['low', 'medium', 'high'].map(quality => (
              <button
                key={quality}
                className={`quality-btn ${selectedQuality === quality ? 'active' : ''}`}
                onClick={() => setSelectedQuality(quality)}
              >
                {quality.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="video-recorder-controls">
        {recordingState === 'idle' && (
          <button
            className="btn-start-recording"
            onClick={startRecording}
            disabled={isRecording}
          >
            <span className="material-icons">play_arrow</span>
            Start Recording
          </button>
        )}

        {recordingState === 'recording' && (
          <>
            <button
              className="btn-stop-recording"
              onClick={stopRecording}
            >
              <span className="material-icons">stop_circle</span>
              Stop Recording
            </button>
            <button
              className="btn-cancel-recording"
              onClick={cancelRecording}
            >
              <span className="material-icons">close</span>
              Cancel
            </button>
          </>
        )}

        {recordingState === 'processing' && (
          <div className="processing-spinner">
            <span className="material-icons spinning">hourglass_bottom</span>
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Help Text */}
      <small className="video-recorder-info">
        📌 Record emergency scene video for evidence. Will be transcoded to MP4 for compatibility.
      </small>
    </div>
  );
};

export default VideoRecorder;
