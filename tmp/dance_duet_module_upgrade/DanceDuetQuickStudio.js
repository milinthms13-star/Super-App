import React, { useMemo, useState } from 'react';
import {
  DANCE_STAGE_MODES,
  DANCE_OUTPUT_FORMATS,
  formatFileSize,
  getDanceReadinessScore,
  openWhatsAppShare,
  validateDanceVideoFile,
} from './danceDuetUpgradeUtils';
import './DanceDuetUpgrade.css';

const processingSteps = [
  'Uploading dancer videos',
  'Normalizing size and duration',
  'Preparing stage layout',
  'Merging dancers and audio',
  'Exporting MP4',
];

const DanceDuetQuickStudio = () => {
  const [video1File, setVideo1File] = useState(null);
  const [video2File, setVideo2File] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [stageMode, setStageMode] = useState('auto');
  const [outputFormat, setOutputFormat] = useState('reel');
  const [backgroundColor, setBackgroundColor] = useState('black');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [syncAudio, setSyncAudio] = useState(true);
  const [mirrorSecondVideo, setMirrorSecondVideo] = useState(false);
  const [status, setStatus] = useState('Upload two dancer videos to create duet.');
  const [activeStep, setActiveStep] = useState(-1);
  const [outputUrl, setOutputUrl] = useState('');
  const [warning, setWarning] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const readiness = useMemo(
    () => getDanceReadinessScore({ video1File, video2File, removeBackground, stageMode, outputFormat }),
    [video1File, video2File, removeBackground, stageMode, outputFormat]
  );

  const canMerge = video1File && video2File && !isProcessing;

  const handleVideoChange = (setter) => (event) => {
    const file = event.target.files?.[0] || null;
    const validation = validateDanceVideoFile(file);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      setter(null);
      return;
    }
    setErrorMessage('');
    setter(file);
  };

  const runStepAnimation = () => {
    setActiveStep(0);
    processingSteps.forEach((_, index) => {
      setTimeout(() => setActiveStep(index), index * 900);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setWarning('');
    setOutputUrl('');
    setStatus('Creating your dance duet...');
    setIsProcessing(true);
    runStepAnimation();

    try {
      const formData = new FormData();
      formData.append('video1', video1File);
      formData.append('video2', video2File);
      if (backgroundFile) formData.append('backgroundImage', backgroundFile);
      formData.append('mode', stageMode);
      formData.append('outputFormat', outputFormat);
      formData.append('backgroundColor', backgroundColor);
      formData.append('removeBackground', String(removeBackground));
      formData.append('syncAudio', String(syncAudio));
      formData.append('mirrorSecondVideo', String(mirrorSecondVideo));

      const response = await fetch('/api/dance-duet/merge', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || 'Failed to merge dance videos.');
      }

      setOutputUrl(result.outputUrl);
      setWarning(result.warning || '');
      setStatus('Your AI dance duet is ready.');
      setActiveStep(processingSteps.length - 1);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create dance duet.');
      setStatus('Dance duet failed. Please try shorter clips.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="dance-duet-studio">
      <section className="dance-duet-hero">
        <div>
          <p className="dance-duet-eyebrow">NilaHub AI Studio</p>
          <h1>Auto Dance Duet Maker</h1>
          <p>Merge two dance videos into one reel, shared stage, or premium split-screen performance.</p>
        </div>
        <div className="dance-duet-score-card">
          <span>{readiness.label}</span>
          <strong>{readiness.score}%</strong>
          <small>Duet readiness</small>
        </div>
      </section>

      <form className="dance-duet-card" onSubmit={handleSubmit}>
        <div className="dance-duet-upload-grid">
          <label className="dance-duet-upload-box">
            <span>Primary dancer video</span>
            <input type="file" accept="video/*" onChange={handleVideoChange(setVideo1File)} />
            <strong>{video1File ? video1File.name : 'Upload video 1'}</strong>
            {video1File && <small>{formatFileSize(video1File.size)}</small>}
          </label>

          <label className="dance-duet-upload-box">
            <span>Second dancer video</span>
            <input type="file" accept="video/*" onChange={handleVideoChange(setVideo2File)} />
            <strong>{video2File ? video2File.name : 'Upload video 2'}</strong>
            {video2File && <small>{formatFileSize(video2File.size)}</small>}
          </label>
        </div>

        <div className="dance-duet-options-grid">
          <label>
            Stage style
            <select value={stageMode} onChange={(event) => setStageMode(event.target.value)}>
              {DANCE_STAGE_MODES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <small>{DANCE_STAGE_MODES.find((item) => item.value === stageMode)?.helper}</small>
          </label>

          <label>
            Output format
            <select value={outputFormat} onChange={(event) => setOutputFormat(event.target.value)}>
              {DANCE_OUTPUT_FORMATS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>

          <label>
            Stage color
            <select value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)}>
              <option value="black">Black</option>
              <option value="white">White</option>
              <option value="green">Green</option>
              <option value="blue">Blue</option>
              <option value="pink">Pink</option>
            </select>
          </label>

          <label>
            Optional stage background
            <input type="file" accept="image/png,image/jpeg" onChange={(event) => setBackgroundFile(event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="dance-duet-switch-row">
          <label><input type="checkbox" checked={removeBackground} onChange={(e) => setRemoveBackground(e.target.checked)} /> Remove green/blue background</label>
          <label><input type="checkbox" checked={syncAudio} onChange={(e) => setSyncAudio(e.target.checked)} /> Use primary dancer audio</label>
          <label><input type="checkbox" checked={mirrorSecondVideo} onChange={(e) => setMirrorSecondVideo(e.target.checked)} /> Mirror second dancer</label>
        </div>

        <div className="dance-duet-tips">
          {readiness.tips.map((tip) => <span key={tip}>💡 {tip}</span>)}
        </div>

        {isProcessing && (
          <div className="dance-duet-progress">
            {processingSteps.map((step, index) => (
              <div key={step} className={index <= activeStep ? 'active' : ''}>
                <span>{index + 1}</span>{step}
              </div>
            ))}
          </div>
        )}

        <div className="dance-duet-action-row">
          <button type="submit" disabled={!canMerge}>{isProcessing ? 'Creating...' : 'Create 10/10 Dance Duet'}</button>
          <p>{status}</p>
        </div>

        {warning && <div className="dance-duet-warning">⚠️ {warning}</div>}
        {errorMessage && <div className="dance-duet-error">{errorMessage}</div>}
      </form>

      {outputUrl && (
        <section className="dance-duet-result-card">
          <h2>Duet Output</h2>
          <video controls src={outputUrl} className="dance-duet-result-video" />
          <div className="dance-duet-result-actions">
            <a href={outputUrl} download="nilahub-dance-duet.mp4">Download MP4</a>
            <button type="button" onClick={() => openWhatsAppShare(outputUrl)}>Share WhatsApp</button>
          </div>
        </section>
      )}
    </main>
  );
};

export default DanceDuetQuickStudio;
