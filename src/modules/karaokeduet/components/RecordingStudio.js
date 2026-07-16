/**
 * Recording Studio Component
 * Main recording interface with dual singer support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioRecorder from '../audio/audioRecorder';
import { AudioPlayer } from '../audio/audioPlayer';
import WaveformVisualizer from './WaveformVisualizer';
import LyricsDisplay from './LyricsDisplay';
import sessionService from '../services/sessionService';

const RecordingStudio = ({ session, onComplete, setStatus }) => {
  const [singer, setSinger] = useState('A'); // A or B
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [waveformData, setWaveformData] = useState([]);
  const [recordings, setRecordings] = useState({ A: null, B: null });
  const [isMixing, setIsMixing] = useState(false);

  const recorderRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize recorder
  useEffect(() => {
    const initRecorder = async () => {
      try {
        if (!AudioRecorder.isSupported()) {
          setStatus({ type: 'error', message: 'Recording not supported in this browser' });
          return;
        }

        recorderRef.current = new AudioRecorder();
        await recorderRef.current.init({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          enableVisualization: true,
        });
      } catch (error) {
        setStatus({ type: 'error', message: `Failed to initialize recorder: ${error.message}` });
      }
    };

    initRecorder();

    return () => {
      if (recorderRef.current) {
        recorderRef.current.cleanup();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setStatus]);

  // Load existing recordings
  useEffect(() => {
    const loadRecordings = async () => {
      try {
        const recs = await sessionService.getRecordings();
        const recordingsMap = { A: null, B: null };
        recs.forEach((rec) => {
          recordingsMap[rec.singer] = rec;
        });
        setRecordings(recordingsMap);
      } catch (error) {
        console.error('Failed to load recordings:', error);
      }
    };

    loadRecordings();
  }, []);

  // Start recording
  const handleStartRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      recorderRef.current.start({
        visualizationCallback: (data) => {
          setVolumeLevel(data.volume);
          setWaveformData(data.waveform);
        },
      });

      setIsRecording(true);
      setIsPaused(false);

      // Update duration timer
      intervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setDuration(recorderRef.current.getCurrentDuration());
        }
      }, 100);

      setStatus({ type: 'info', message: `🎙️ Recording Singer ${singer}...` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }, [singer, setStatus]);

  // Pause recording
  const handlePauseRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  };

  // Resume recording
  const handleResumeRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.resume();
      setIsPaused(false);
    }
  };

  // Stop recording
  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current) return;

    try {
      const result = await recorderRef.current.stop();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setIsRecording(false);
      setIsPaused(false);

      // Save recording
      const savedRecording = await sessionService.saveRecording(singer, {
        blob: result.blob,
        duration: result.duration,
        format: result.mimeType.split('/')[1] || 'webm',
        waveformData: waveformData,
      });

      setRecordings((prev) => ({
        ...prev,
        [singer]: savedRecording,
      }));

      setStatus({
        type: 'success',
        message: `✅ Singer ${singer} recording saved! (${Math.round(result.duration)}s)`,
      });

      setDuration(0);
      setVolumeLevel(0);
      setWaveformData([]);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  }, [singer, waveformData, setStatus]);

  // Delete recording
  const handleDeleteRecording = async (singerToDelete) => {
    if (!window.confirm(`Delete Singer ${singerToDelete} recording?`)) {
      return;
    }

    try {
      const recording = recordings[singerToDelete];
      if (recording) {
        await sessionService.deleteRecording(recording.id, singerToDelete);
        setRecordings((prev) => ({
          ...prev,
          [singerToDelete]: null,
        }));
        setStatus({ type: 'success', message: `Recording deleted` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    }
  };

  // Mix recordings
  const handleMixRecordings = async () => {
    if (!recordings.A && !recordings.B) {
      setStatus({ type: 'error', message: 'Need at least one recording to mix' });
      return;
    }

    try {
      setIsMixing(true);
      setStatus({ type: 'info', message: '🎵 Mixing recordings...' });

      const project = await sessionService.mixRecordings({
        format: 'mp3',
        trackVolume: 0.7,
        targetLevel: -3,
      });

      setStatus({ type: 'success', message: '✅ Mix complete! Ready to download.' });
      
      // Trigger download
      const url = URL.createObjectURL(project.mixedAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.title || 'duet'}-mixed.mp3`;
      a.click();
      URL.revokeObjectURL(url);

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsMixing(false);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="kdp-grid">
        {/* Singer Selection */}
        <div className="kdp-card">
          <h3 className="kdp-card-title">
            <span className="kdp-card-icon">👤</span>
            Singer Selection
          </h3>
          <div className="kdp-button-group">
            <button
              className={`kdp-button ${singer === 'A' ? 'kdp-button-primary' : 'kdp-button-secondary'}`}
              onClick={() => setSinger('A')}
              disabled={isRecording}
            >
              🎤 Singer A
            </button>
            <button
              className={`kdp-button ${singer === 'B' ? 'kdp-button-primary' : 'kdp-button-secondary'}`}
              onClick={() => setSinger('B')}
              disabled={isRecording}
            >
              🎤 Singer B
            </button>
          </div>

          {/* Recording Status */}
          <div className="kdp-stats-grid" style={{ marginTop: '20px' }}>
            <div className="kdp-stat-card">
              <div className="kdp-stat-value">{recordings.A ? '✅' : '⏺️'}</div>
              <div className="kdp-stat-label">Singer A</div>
            </div>
            <div className="kdp-stat-card">
              <div className="kdp-stat-value">{recordings.B ? '✅' : '⏺️'}</div>
              <div className="kdp-stat-label">Singer B</div>
            </div>
          </div>
        </div>

        {/* Recording Info */}
        <div className="kdp-card">
          <h3 className="kdp-card-title">
            <span className="kdp-card-icon">ℹ️</span>
            Session Info
          </h3>
          <div className="kdp-form-group">
            <label className="kdp-label">Title</label>
            <p style={{ margin: 0 }}>{session.title}</p>
          </div>
          {session.songTitle && (
            <div className="kdp-form-group">
              <label className="kdp-label">Song</label>
              <p style={{ margin: 0 }}>{session.songTitle}</p>
            </div>
          )}
          <div className="kdp-form-group">
            <label className="kdp-label">BPM</label>
            <p style={{ margin: 0 }}>{session.bpm}</p>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="kdp-card">
        <h3 className="kdp-card-title">
          <span className="kdp-card-icon">🎙️</span>
          Recording Singer {singer}
        </h3>

        <div className="kdp-recording-control">
          <div className="kdp-recording-timer">{formatDuration(duration)}</div>

          {/* Volume Meter */}
          <div className="kdp-volume-meter">
            <div
              className="kdp-volume-level"
              style={{ width: `${Math.min(100, volumeLevel * 200)}%` }}
            />
          </div>

          {/* Recording Button */}
          {!isRecording ? (
            <button
              className="kdp-recording-button"
              onClick={handleStartRecording}
              disabled={recordings[singer] !== null}
            >
              ⏺️
            </button>
          ) : (
            <div className="kdp-button-group">
              {!isPaused ? (
                <button className="kdp-button kdp-button-secondary" onClick={handlePauseRecording}>
                  ⏸️ Pause
                </button>
              ) : (
                <button className="kdp-button kdp-button-primary" onClick={handleResumeRecording}>
                  ▶️ Resume
                </button>
              )}
              <button className="kdp-button kdp-button-danger" onClick={handleStopRecording}>
                ⏹️ Stop
              </button>
            </div>
          )}

          {recordings[singer] && !isRecording && (
            <div className="kdp-button-group">
              <button className="kdp-button kdp-button-danger" onClick={() => handleDeleteRecording(singer)}>
                🗑️ Delete & Re-record
              </button>
            </div>
          )}
        </div>

        {/* Waveform */}
        {waveformData.length > 0 && (
          <WaveformVisualizer data={waveformData} width={800} height={100} />
        )}
      </div>

      {/* Lyrics Display */}
      {session.lyrics && session.lyrics.length > 0 && (
        <div className="kdp-card">
          <h3 className="kdp-card-title">
            <span className="kdp-card-icon">📝</span>
            Lyrics Reference
          </h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#f8f8f8', padding: '15px', borderRadius: '10px' }}>
            {session.lyrics.map((lyric, index) => (
              <p key={index} style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
                <strong>[{lyric.time}s]</strong> {lyric.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mix Controls */}
      <div className="kdp-card">
        <h3 className="kdp-card-title">
          <span className="kdp-card-icon">🎵</span>
          Final Mix
        </h3>

        <div className="kdp-stats-grid">
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">
              {recordings.A && recordings.B ? '✅' : recordings.A || recordings.B ? '⚠️' : '❌'}
            </div>
            <div className="kdp-stat-label">Ready Status</div>
          </div>
          <div className="kdp-stat-card">
            <div className="kdp-stat-value">
              {(recordings.A ? 1 : 0) + (recordings.B ? 1 : 0)}/2
            </div>
            <div className="kdp-stat-label">Recordings</div>
          </div>
        </div>

        <button
          className="kdp-button kdp-button-success"
          onClick={handleMixRecordings}
          disabled={(!recordings.A && !recordings.B) || isMixing}
          style={{ width: '100%', marginTop: '20px', fontSize: '1.1rem', padding: '16px' }}
        >
          {isMixing ? '🎵 Mixing...' : '🎵 Mix & Download Final Duet'}
        </button>

        <p style={{ margin: '10px 0 0 0', textAlign: 'center', color: '#999', fontSize: '0.85rem' }}>
          All mixing happens locally in your browser
        </p>
      </div>

      {/* Back Button */}
      <div className="kdp-card">
        <button
          className="kdp-button kdp-button-secondary"
          onClick={onComplete}
          style={{ width: '100%' }}
          disabled={isRecording || isMixing}
        >
          ← Back to Session
        </button>
      </div>
    </div>
  );
};

export default RecordingStudio;
