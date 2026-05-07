import React, { useState, useRef, useEffect } from 'react';
import './AudioRecorder.css';

/**
 * AudioRecorder Component
 * Captures audio from the device microphone using Web Audio API
 * Records emergency scene audio for evidence and verification
 */
const AudioRecorder = ({ 
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  onAudioData,
  maxDuration = 180 // 3 minutes max
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [recordingState, setRecordingState] = useState('idle'); // idle, recording, processing
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  /**
   * Request microphone permissions and initialize MediaRecorder
   */
  const initializeAudioRecording = async () => {
    try {
      setPermissionDenied(false);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Create MediaRecorder
      const mimeType = 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to base64 for transmission
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(',')[1];
          
          onAudioData({
            audio: base64Audio,
            duration: recordingTime,
            mimeType: 'audio/webm',
            timestamp: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setRecordingState('idle');
      };
      
      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      onStartRecording?.();
      
      // Start timer
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        console.error('Microphone permission denied:', error);
      } else {
        console.error('Audio recording error:', error);
      }
    }
  };

  /**
   * Start recording audio
   */
  const startRecording = async () => {
    await initializeAudioRecording();
  };

  /**
   * Stop recording and process audio
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      setRecordingState('processing');
      mediaRecorderRef.current.stop();
      
      // Clear timer
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
    
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setRecordingState('idle');
    setRecordingTime(0);
  };

  /**
   * Format time for display (MM:SS)
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get recording percentage for progress
   */
  const recordingPercentage = (recordingTime / maxDuration) * 100;

  if (permissionDenied) {
    return (
      <div className="audio-recorder permission-denied">
        <div className="audio-recorder-error">
          <span className="material-icons">mic_off</span>
          <p>Microphone access denied</p>
          <small>Please allow microphone permissions to record audio</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`audio-recorder recording-state-${recordingState}`}>
      <div className="audio-recorder-header">
        <span className="material-icons">mic</span>
        <h3>Audio Recording</h3>
        <span className="time-display">{formatTime(recordingTime)}</span>
      </div>

      {/* Recording Status */}
      {recordingState === 'recording' && (
        <div className="recording-indicator">
          <span className="pulse-dot"></span>
          <span className="status-text">Recording...</span>
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

      {/* Control Buttons */}
      <div className="audio-recorder-controls">
        {recordingState === 'idle' && (
          <button
            className="btn-start-recording"
            onClick={startRecording}
            disabled={isRecording}
          >
            <span className="material-icons">mic</span>
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

      {/* Audio Visualization */}
      <div className="audio-visualization">
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
        <div className="wave-bar"></div>
      </div>

      {/* Help Text */}
      <small className="audio-recorder-info">
        📌 Record audio from the emergency scene for evidence and verification
      </small>
    </div>
  );
};

export default AudioRecorder;
