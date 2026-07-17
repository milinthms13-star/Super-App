import React, { useState, useRef, useEffect } from 'react';
import {
  mergeVideos,
  generatePreviewFrame,
  checkBrowserCompatibility,
  formatFileSize as formatSize,
  estimateFileSize,
} from './videoMerger';
import {
  saveProject,
  getAllProjects,
  deleteProject,
  getStorageUsage,
  clearAllStorage,
} from './storageManager';
import './DanceDuetMerger.css';

/**
 * Dance Duet Merger - 100% Client-Side
 * No database, no backend API calls
 * Uses: MediaRecorder, Canvas API, localStorage/IndexedDB
 * All FREE browser APIs
 */

const DanceDuetMerger = () => {
  // Video sources
  const [dancer1Video, setDancer1Video] = useState(null);
  const [dancer2Video, setDancer2Video] = useState(null);
  const [dancer1Blob, setDancer1Blob] = useState(null);
  const [dancer2Blob, setDancer2Blob] = useState(null);
  
  // Background
  const [backgroundType, setBackgroundType] = useState('solid'); // solid, image, video, gradient
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundVideo, setBackgroundVideo] = useState(null);
  const [gradientStart, setGradientStart] = useState('#667eea');
  const [gradientEnd, setGradientEnd] = useState('#764ba2');
  
  // Layout
  const [layoutMode, setLayoutMode] = useState('side-by-side'); // side-by-side, overlay, picture-in-picture
  const [dancer1Position, setDancer1Position] = useState({ x: 0, y: 0, scale: 1 });
  const [dancer2Position, setDancer2Position] = useState({ x: 50, y: 0, scale: 1 });
  
  // Recording states
  const [isRecording1, setIsRecording1] = useState(false);
  const [isRecording2, setIsRecording2] = useState(false);
  const [recordingTime1, setRecordingTime1] = useState(0);
  const [recordingTime2, setRecordingTime2] = useState(0);
  
  // Merging state
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergedVideoUrl, setMergedVideoUrl] = useState(null);
  const [mergedBlob, setMergedBlob] = useState(null);
  
  // Preview
  const [showPreview, setShowPreview] = useState(false);
  
  // Storage
  const [savedProjects, setSavedProjects] = useState([]);
  const [storageInfo, setStorageInfo] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Refs
  const dancer1VideoRef = useRef(null);
  const dancer2VideoRef = useRef(null);
  const mergeCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const mediaRecorder1Ref = useRef(null);
  const mediaRecorder2Ref = useRef(null);
  const stream1Ref = useRef(null);
  const stream2Ref = useRef(null);
  const recordingInterval1Ref = useRef(null);
  const recordingInterval2Ref = useRef(null);
  
  // Load saved projects from localStorage
  useEffect(() => {
    loadSavedProjects();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllStreams();
      if (recordingInterval1Ref.current) clearInterval(recordingInterval1Ref.current);
      if (recordingInterval2Ref.current) clearInterval(recordingInterval2Ref.current);
    };
  }, []);
  
  // Load saved projects from localStorage
  useEffect(() => {
    loadSavedProjects();
    updateStorageInfo();
  }, []);
  
  // Load saved projects from IndexedDB
  const loadSavedProjects = async () => {
    try {
      const projects = await getAllProjects();
      setSavedProjects(projects);
    } catch (error) {
      console.error('Failed to load saved projects:', error);
    }
  };
  
  // Update storage information
  const updateStorageInfo = async () => {
    const info = await getStorageUsage();
    setStorageInfo(info);
  };
  
  // Save project to IndexedDB
  const saveProjectData = async (projectData) => {
    try {
      await saveProject(projectData);
      await loadSavedProjects();
      await updateStorageInfo();
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project. Storage may be full.');
    }
  };
  
  // Delete project
  const handleDeleteProject = async (id) => {
    const confirmed = window.confirm('Delete this project from history?');
    if (!confirmed) return;
    
    try {
      await deleteProject(id);
      await loadSavedProjects();
      await updateStorageInfo();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project.');
    }
  };
  
  // Clear all storage
  const handleClearAllStorage = async () => {
    const confirmed = window.confirm(
      'This will delete ALL saved projects and clear all storage. Are you sure?'
    );
    if (!confirmed) return;
    
    try {
      await clearAllStorage();
      await loadSavedProjects();
      await updateStorageInfo();
      alert('All storage cleared successfully!');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      alert('Failed to clear storage.');
    }
  };
  
  // Stop all media streams
  const stopAllStreams = () => {
    if (stream1Ref.current) {
      stream1Ref.current.getTracks().forEach(track => track.stop());
      stream1Ref.current = null;
    }
    if (stream2Ref.current) {
      stream2Ref.current.getTracks().forEach(track => track.stop());
      stream2Ref.current = null;
    }
  };
  
  // Start webcam for dancer 1
  const startWebcam1 = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      stream1Ref.current = stream;
      if (dancer1VideoRef.current) {
        dancer1VideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to start webcam 1:', error);
      alert('Could not access webcam. Please check permissions.');
    }
  };
  
  // Start webcam for dancer 2
  const startWebcam2 = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      stream2Ref.current = stream;
      if (dancer2VideoRef.current) {
        dancer2VideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to start webcam 2:', error);
      alert('Could not access webcam. Please check permissions.');
    }
  };
  
  // Start recording dancer 1
  const startRecording1 = async () => {
    if (!stream1Ref.current) {
      alert('Please start webcam first!');
      return;
    }
    
    try {
      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream1Ref.current, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setDancer1Blob(blob);
        const url = URL.createObjectURL(blob);
        setDancer1Video(url);
        if (dancer1VideoRef.current) {
          dancer1VideoRef.current.srcObject = null;
          dancer1VideoRef.current.src = url;
        }
      };
      
      mediaRecorder.start();
      mediaRecorder1Ref.current = mediaRecorder;
      setIsRecording1(true);
      setRecordingTime1(0);
      
      // Update recording time
      recordingInterval1Ref.current = setInterval(() => {
        setRecordingTime1(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording 1:', error);
      alert('Failed to start recording. Try a different browser.');
    }
  };
  
  // Stop recording dancer 1
  const stopRecording1 = () => {
    if (mediaRecorder1Ref.current && mediaRecorder1Ref.current.state !== 'inactive') {
      mediaRecorder1Ref.current.stop();
      setIsRecording1(false);
      if (recordingInterval1Ref.current) {
        clearInterval(recordingInterval1Ref.current);
      }
      // Stop webcam stream
      if (stream1Ref.current) {
        stream1Ref.current.getTracks().forEach(track => track.stop());
        stream1Ref.current = null;
      }
    }
  };
  
  // Start recording dancer 2
  const startRecording2 = async () => {
    if (!stream2Ref.current) {
      alert('Please start webcam first!');
      return;
    }
    
    try {
      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream2Ref.current, {
        mimeType: 'video/webm;codecs=vp9',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setDancer2Blob(blob);
        const url = URL.createObjectURL(blob);
        setDancer2Video(url);
        if (dancer2VideoRef.current) {
          dancer2VideoRef.current.srcObject = null;
          dancer2VideoRef.current.src = url;
        }
      };
      
      mediaRecorder.start();
      mediaRecorder2Ref.current = mediaRecorder;
      setIsRecording2(true);
      setRecordingTime2(0);
      
      // Update recording time
      recordingInterval2Ref.current = setInterval(() => {
        setRecordingTime2(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording 2:', error);
      alert('Failed to start recording. Try a different browser.');
    }
  };
  
  // Stop recording dancer 2
  const stopRecording2 = () => {
    if (mediaRecorder2Ref.current && mediaRecorder2Ref.current.state !== 'inactive') {
      mediaRecorder2Ref.current.stop();
      setIsRecording2(false);
      if (recordingInterval2Ref.current) {
        clearInterval(recordingInterval2Ref.current);
      }
      // Stop webcam stream
      if (stream2Ref.current) {
        stream2Ref.current.getTracks().forEach(track => track.stop());
        stream2Ref.current = null;
      }
    }
  };
  
  // Handle file upload for dancer 1
  const handleUpload1 = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file!');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('Video file too large! Please use a file under 100MB.');
      return;
    }
    
    setDancer1Blob(file);
    const url = URL.createObjectURL(file);
    setDancer1Video(url);
    if (dancer1VideoRef.current) {
      dancer1VideoRef.current.srcObject = null;
      dancer1VideoRef.current.src = url;
    }
  };
  
  // Handle file upload for dancer 2
  const handleUpload2 = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file!');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      alert('Video file too large! Please use a file under 100MB.');
      return;
    }
    
    setDancer2Blob(file);
    const url = URL.createObjectURL(file);
    setDancer2Video(url);
    if (dancer2VideoRef.current) {
      dancer2VideoRef.current.srcObject = null;
      dancer2VideoRef.current.src = url;
    }
  };
  
  // Handle background image upload
  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file!');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setBackgroundImage(url);
  };
  
  // Handle background video upload
  const handleBackgroundVideoUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file!');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setBackgroundVideo(url);
  };
  
  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Apply layout preset
  const applyLayout = (mode) => {
    setLayoutMode(mode);
    switch (mode) {
      case 'side-by-side':
        setDancer1Position({ x: 0, y: 0, scale: 1 });
        setDancer2Position({ x: 50, y: 0, scale: 1 });
        break;
      case 'overlay':
        setDancer1Position({ x: 0, y: 0, scale: 1 });
        setDancer2Position({ x: 25, y: 25, scale: 0.5 });
        break;
      case 'picture-in-picture':
        setDancer1Position({ x: 0, y: 0, scale: 1 });
        setDancer2Position({ x: 65, y: 65, scale: 0.3 });
        break;
      default:
        break;
    }
  };
  
  // Merge videos using Canvas API
  const handleMergeVideos = async () => {
    if (!dancer1Video || !dancer2Video) {
      alert('Please add both dancer videos first!');
      return;
    }
    
    // Check browser compatibility
    const compat = checkBrowserCompatibility();
    if (!compat.supported) {
      alert(compat.message);
      return;
    }
    
    setIsMerging(true);
    setMergeProgress(0);
    
    try {
      const result = await mergeVideos({
        video1Element: dancer1VideoRef.current,
        video2Element: dancer2VideoRef.current,
        backgroundType,
        backgroundColor,
        backgroundImage,
        backgroundVideo,
        gradientStart,
        gradientEnd,
        layoutMode,
        dancer1Position,
        dancer2Position,
        outputWidth: 1920,
        outputHeight: 1080,
        fps: 30,
        onProgress: (progress) => {
          setMergeProgress(progress);
        },
      });
      
      setMergedVideoUrl(result.url);
      setMergedBlob(result.blob);
      
      // Save to IndexedDB project history
      const projectData = {
        timestamp: new Date().toISOString(),
        layoutMode,
        backgroundType,
        fileSize: formatSize(result.blob.size),
        videoUrl: result.url,
        duration: Math.round(dancer1VideoRef.current.duration),
      };
      await saveProjectData(projectData);
      
      alert('Video merged successfully! 🎉');
      
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Failed to merge videos: ' + error.message);
    } finally {
      setIsMerging(false);
    }
  };
  
  // Update live preview
  useEffect(() => {
    if (!showPreview || !dancer1VideoRef.current || !dancer2VideoRef.current || !previewCanvasRef.current) {
      return;
    }
    
    const updatePreview = () => {
      generatePreviewFrame({
        video1Element: dancer1VideoRef.current,
        video2Element: dancer2VideoRef.current,
        canvas: previewCanvasRef.current,
        backgroundType,
        backgroundColor,
        backgroundImage,
        backgroundVideo,
        gradientStart,
        gradientEnd,
        layoutMode,
        dancer1Position,
        dancer2Position,
      });
    };
    
    // Update preview every 100ms
    const intervalId = setInterval(updatePreview, 100);
    
    return () => clearInterval(intervalId);
  }, [
    showPreview,
    backgroundType,
    backgroundColor,
    backgroundImage,
    backgroundVideo,
    gradientStart,
    gradientEnd,
    layoutMode,
    dancer1Position,
    dancer2Position,
  ]);
  
  return (
    <div className="dance-duet-merger">
      <header className="merger-header">
        <h1>🕺💃 Dance Duet Merger</h1>
        <p>Merge two dancers into one epic video - 100% free, no signup required!</p>
      </header>
      
      <div className="merger-container">
        {/* Dancer 1 Section */}
        <section className="dancer-section">
          <h2>👤 Dancer 1</h2>
          
          <div className="video-preview">
            <video
              ref={dancer1VideoRef}
              autoPlay
              muted
              playsInline
              controls={!!dancer1Video}
              className="dancer-video"
            />
            {isRecording1 && (
              <div className="recording-indicator">
                🔴 Recording: {formatTime(recordingTime1)}
              </div>
            )}
          </div>
          
          <div className="dancer-controls">
            {!dancer1Video && !stream1Ref.current && (
              <button onClick={startWebcam1} className="btn-primary">
                📷 Start Webcam
              </button>
            )}
            
            {stream1Ref.current && !isRecording1 && !dancer1Video && (
              <button onClick={startRecording1} className="btn-record">
                ⏺️ Start Recording
              </button>
            )}
            
            {isRecording1 && (
              <button onClick={stopRecording1} className="btn-stop">
                ⏹️ Stop Recording
              </button>
            )}
            
            <label className="btn-upload">
              📁 Upload Video
              <input
                type="file"
                accept="video/*"
                onChange={handleUpload1}
                style={{ display: 'none' }}
              />
            </label>
            
            {dancer1Video && (
              <button
                onClick={() => {
                  setDancer1Video(null);
                  setDancer1Blob(null);
                  if (dancer1VideoRef.current) {
                    dancer1VideoRef.current.src = '';
                  }
                }}
                className="btn-clear"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </section>
        
        {/* Dancer 2 Section */}
        <section className="dancer-section">
          <h2>👤 Dancer 2</h2>
          
          <div className="video-preview">
            <video
              ref={dancer2VideoRef}
              autoPlay
              muted
              playsInline
              controls={!!dancer2Video}
              className="dancer-video"
            />
            {isRecording2 && (
              <div className="recording-indicator">
                🔴 Recording: {formatTime(recordingTime2)}
              </div>
            )}
          </div>
          
          <div className="dancer-controls">
            {!dancer2Video && !stream2Ref.current && (
              <button onClick={startWebcam2} className="btn-primary">
                📷 Start Webcam
              </button>
            )}
            
            {stream2Ref.current && !isRecording2 && !dancer2Video && (
              <button onClick={startRecording2} className="btn-record">
                ⏺️ Start Recording
              </button>
            )}
            
            {isRecording2 && (
              <button onClick={stopRecording2} className="btn-stop">
                ⏹️ Stop Recording
              </button>
            )}
            
            <label className="btn-upload">
              📁 Upload Video
              <input
                type="file"
                accept="video/*"
                onChange={handleUpload2}
                style={{ display: 'none' }}
              />
            </label>
            
            {dancer2Video && (
              <button
                onClick={() => {
                  setDancer2Video(null);
                  setDancer2Blob(null);
                  if (dancer2VideoRef.current) {
                    dancer2VideoRef.current.src = '';
                  }
                }}
                className="btn-clear"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </section>
      </div>
      
      {/* Background & Layout Settings */}
      {dancer1Video && dancer2Video && (
        <section className="settings-section">
          <h2>🎨 Background & Layout</h2>
          
          <div className="settings-grid">
            {/* Background Type */}
            <div className="setting-group">
              <label>Background Type:</label>
              <select
                value={backgroundType}
                onChange={(e) => setBackgroundType(e.target.value)}
                className="setting-select"
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
            
            {/* Solid Color */}
            {backgroundType === 'solid' && (
              <div className="setting-group">
                <label>Background Color:</label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="color-picker"
                />
              </div>
            )}
            
            {/* Gradient */}
            {backgroundType === 'gradient' && (
              <>
                <div className="setting-group">
                  <label>Gradient Start:</label>
                  <input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="color-picker"
                  />
                </div>
                <div className="setting-group">
                  <label>Gradient End:</label>
                  <input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="color-picker"
                  />
                </div>
              </>
            )}
            
            {/* Image Upload */}
            {backgroundType === 'image' && (
              <div className="setting-group">
                <label className="btn-upload-bg">
                  🖼️ Upload Background Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {backgroundImage && <span className="upload-success">✓ Image uploaded</span>}
              </div>
            )}
            
            {/* Video Upload */}
            {backgroundType === 'video' && (
              <div className="setting-group">
                <label className="btn-upload-bg">
                  🎥 Upload Background Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleBackgroundVideoUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                {backgroundVideo && <span className="upload-success">✓ Video uploaded</span>}
              </div>
            )}
            
            {/* Layout Mode */}
            <div className="setting-group layout-buttons">
              <label>Layout:</label>
              <div className="layout-options">
                <button
                  onClick={() => applyLayout('side-by-side')}
                  className={layoutMode === 'side-by-side' ? 'active' : ''}
                >
                  ⬌ Side by Side
                </button>
                <button
                  onClick={() => applyLayout('overlay')}
                  className={layoutMode === 'overlay' ? 'active' : ''}
                >
                  ⊞ Overlay
                </button>
                <button
                  onClick={() => applyLayout('picture-in-picture')}
                  className={layoutMode === 'picture-in-picture' ? 'active' : ''}
                >
                  ⧉ Picture-in-Picture
                </button>
              </div>
            </div>
          </div>
          
          {/* Merge Button */}
          <div className="merge-actions">
            <button
              onClick={handleMergeVideos}
              disabled={isMerging || !dancer1Video || !dancer2Video}
              className="btn-merge"
            >
              {isMerging ? `⏳ Merging... ${mergeProgress}%` : '🎬 Merge Videos'}
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="btn-preview"
            >
              {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
            </button>
          </div>
        </section>
      )}
      
      {/* Preview Canvas */}
      {showPreview && dancer1Video && dancer2Video && (
        <section className="preview-section">
          <h2>🎥 Live Preview</h2>
          <canvas
            ref={previewCanvasRef}
            width="1920"
            height="1080"
            className="preview-canvas"
          />
        </section>
      )}
      
      {/* Merged Video Result */}
      {mergedVideoUrl && (
        <section className="result-section">
          <h2>✅ Merged Video Ready!</h2>
          <video
            src={mergedVideoUrl}
            controls
            className="result-video"
          />
          <div className="result-actions">
            <a
              href={mergedVideoUrl}
              download="dance-duet-merged.mp4"
              className="btn-download"
            >
              ⬇️ Download Video
            </a>
            <button
              onClick={() => {
                if (navigator.share && mergedBlob) {
                  navigator.share({
                    title: 'Dance Duet Video',
                    files: [new File([mergedBlob], 'dance-duet.mp4', { type: 'video/mp4' })]
                  }).catch(console.error);
                } else {
                  alert('Sharing not supported on this device');
                }
              }}
              className="btn-share"
            >
              📤 Share
            </button>
          </div>
        </section>
      )}
      
      {/* Hidden canvas for merging */}
      <canvas
        ref={mergeCanvasRef}
        width="1920"
        height="1080"
        style={{ display: 'none' }}
      />
      
      {/* Info Section */}
      <section className="info-section">
        <h3>ℹ️ How It Works</h3>
        <ul>
          <li>✅ 100% free - No signup, no credits, no limits</li>
          <li>✅ Client-side only - Videos never leave your device</li>
          <li>✅ Record with webcam or upload existing videos</li>
          <li>✅ Custom backgrounds - Solid colors, gradients, images, or videos</li>
          <li>✅ Multiple layouts - Side-by-side, overlay, or picture-in-picture</li>
          <li>✅ Download as MP4 - Works on all devices</li>
          <li>⚠️ Large files may take time to process</li>
        </ul>
        
        {/* Storage Info */}
        {storageInfo && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#f3f4f6', borderRadius: '10px' }}>
            <strong>💾 Storage Usage:</strong> {storageInfo.usedMB} MB / {storageInfo.quotaMB} MB ({storageInfo.percentUsed}% used)
          </div>
        )}
        
        {/* Project History Toggle */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-primary"
            style={{ marginRight: '10px' }}
          >
            {showHistory ? '📦 Hide History' : '📦 Show Project History'}
          </button>
          
          {savedProjects.length > 0 && (
            <button
              onClick={handleClearAllStorage}
              className="btn-clear"
            >
              🗑️ Clear All Storage
            </button>
          )}
        </div>
      </section>
      
      {/* Project History */}
      {showHistory && (
        <section className="settings-section">
          <h2>📂 Project History ({savedProjects.length} projects)</h2>
          
          {savedProjects.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              No projects saved yet. Create your first dance duet!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {savedProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    background: '#f9fafb',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <strong style={{ fontSize: '16px', color: '#333' }}>
                      {new Date(project.timestamp).toLocaleString()}
                    </strong>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <span>📐 Layout: {project.layoutMode || 'side-by-side'}</span>
                  </div>
                  
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                    <span>🎨 Background: {project.backgroundType || 'solid'}</span>
                  </div>
                  
                  {project.fileSize && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <span>📦 Size: {project.fileSize}</span>
                    </div>
                  )}
                  
                  {project.duration && (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                      <span>⏱️ Duration: {project.duration}s</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="btn-clear"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default DanceDuetMerger;
