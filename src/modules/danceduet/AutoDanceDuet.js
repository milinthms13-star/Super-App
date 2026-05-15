import React, { useState } from 'react';
import './AutoDanceDuet.css';

const stageOptions = [
  { value: 'side-by-side', label: 'Side-by-side duet' },
  { value: 'same-background', label: 'Shared stage background' },
  { value: 'immersive-360', label: 'Immersive 360° stage' },
];

const colorOptions = [
  { value: 'black', label: 'Black stage' },
  { value: 'white', label: 'White stage' },
  { value: 'green', label: 'Green screen' },
  { value: 'blue', label: 'Blue screen' },
];

const AutoDanceDuet = () => {
  const [video1File, setVideo1File] = useState(null);
  const [video2File, setVideo2File] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [stageMode, setStageMode] = useState('side-by-side');
  const [backgroundColor, setBackgroundColor] = useState('black');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [status, setStatus] = useState('Ready to create your dance duet.');
  const [outputUrl, setOutputUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canMerge = video1File && video2File && !isProcessing;

  const handleFileChange = (setter) => (event) => {
    setter(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setOutputUrl('');
    setStatus('Uploading videos and creating your duet...');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('video1', video1File);
      formData.append('video2', video2File);
      if (backgroundFile) {
        formData.append('backgroundImage', backgroundFile);
      }
      formData.append('mode', stageMode);
      formData.append('backgroundColor', backgroundColor);
      formData.append('removeBackground', String(removeBackground));

      const response = await fetch('/api/dance-duet/merge', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to merge dance videos.');
      }

      setOutputUrl(result.outputUrl);
      setStatus('Your dance duet is ready!');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create the dance duet.');
      setStatus('Something went wrong.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!outputUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + outputUrl);
      setStatus('Link copied to clipboard.');
    } catch (copyError) {
      setErrorMessage('Unable to copy the link.');
    }
  };

  return (
    <div className="auto-dance-duet-page">
      <section className="hero-panel">
        <div>
          <h1>AI Dance Duet Studio</h1>
          <p>Create a premium dance merge experience by combining two dancer videos into one synchronized performance with immersive 360° stage options.</p>
        </div>
      </section>
      <form className="dance-form" onSubmit={handleSubmit}>
        <div className="upload-note-block">
          <p className="upload-note">Max upload size: 180 MB per video. Ideal duration: 10-30 seconds. For immersive results, choose <strong>Immersive 360° stage</strong> and optionally add a background image.</p>
        </div>
        <div className="field-grid">
          <label>
            Primary dancer video
            <input type="file" accept="video/*" onChange={handleFileChange(setVideo1File)} />
            {video1File && <span className="file-note">Selected: {video1File.name}</span>}
          </label>
          <label>
            Secondary dancer video
            <input type="file" accept="video/*" onChange={handleFileChange(setVideo2File)} />
            {video2File && <span className="file-note">Selected: {video2File.name}</span>}
          </label>
          <label>
            Optional stage background image
            <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange(setBackgroundFile)} />
            {backgroundFile && <span className="file-note">Selected: {backgroundFile.name}</span>}
          </label>
        </div>

        <div className="settings-row">
          <div>
            <label>Stage style</label>
            <select value={stageMode} onChange={(ev) => setStageMode(ev.target.value)}>
              {stageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Stage color</label>
            <select value={backgroundColor} onChange={(ev) => setBackgroundColor(ev.target.value)}>
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="checkbox-field">
            <input
              id="removeBackground"
              type="checkbox"
              checked={removeBackground}
              onChange={(ev) => setRemoveBackground(ev.target.checked)}
            />
            <label htmlFor="removeBackground">Attempt green/blue screen removal</label>
          </div>
        </div>

        <div className="helper-row">
          <p>For best results, upload two high-quality dancer clips of similar length. Use green or blue clothing for background removal.</p>
        </div>

        <div className="action-row">
          <button type="submit" disabled={!canMerge} className="primary-button">
            {isProcessing ? 'Merging video...' : 'Create Dance Duet'}
          </button>
          <span className="status-text">{status}</span>
        </div>

        {errorMessage && <div className="error-box">{errorMessage}</div>}
      </form>

      {outputUrl && (
        <div className="result-panel">
          <h2>Duet Output</h2>
          <video controls src={outputUrl} className="result-video" />
          <div className="result-actions">
            <a href={outputUrl} download="ai-dance-duet.mp4" className="secondary-button">
              Download MP4
            </a>
            <button type="button" onClick={handleCopyLink} className="secondary-button">
              Copy share link
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoDanceDuet;
