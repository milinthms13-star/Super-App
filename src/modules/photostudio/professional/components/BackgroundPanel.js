import React, { useState } from 'react';
import { 
  FiScissors, 
  FiImage,
  FiDroplet,
  FiSun,
  FiZap
} from 'react-icons/fi';
import { 
  aiBackgroundRemoval,
  refineMask,
  replaceBackground,
  applyBackgroundBlur,
  generateSolidBackground,
  generateGradientBackground,
  generateSmartShadow
} from '../utils/backgroundTools';

const BackgroundPanel = ({ canvas, activeObject, onApply }) => {
  const [activeFeature, setActiveFeature] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backgroundSettings, setBackgroundSettings] = useState({
    blurType: 'gaussian',
    blurAmount: 10,
    backgroundColor: '#ffffff',
    gradientType: 'linear',
    gradientStart: '#667eea',
    gradientEnd: '#764ba2',
    shadowAngle: 135,
    shadowDistance: 20,
    shadowBlur: 30,
    shadowOpacity: 0.3
  });
  const [mask, setMask] = useState(null);
  const [uploadedBg, setUploadedBg] = useState(null);

  const backgroundFeatures = [
    { id: 'remove', name: 'Remove Background', icon: FiScissors },
    { id: 'replace', name: 'Replace Background', icon: FiImage },
    { id: 'blur', name: 'Blur Background', icon: FiDroplet },
    { id: 'solid', name: 'Solid Color', icon: FiSun },
    { id: 'gradient', name: 'Gradient', icon: FiZap },
    { id: 'shadow', name: 'Add Shadow', icon: FiSun }
  ];

  const removeBackground = async () => {
    if (!canvas || !activeObject) {
      alert('Please select an image first');
      return;
    }

    setIsProcessing(true);

    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = activeObject.width;
      tempCanvas.height = activeObject.height;

      const img = activeObject.toDataURL();
      const image = new Image();

      image.onload = async () => {
        ctx.drawImage(image, 0, 0);

        // Apply AI background removal
        const resultMask = await aiBackgroundRemoval(tempCanvas);
        setMask(resultMask);

        // Refine the mask
        const refinedMask = refineMask(resultMask, { 
          featherRadius: 2, 
          smoothness: 1 
        });

        // Apply mask to create transparent background
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const maskData = refinedMask.data;

        for (let i = 0; i < imageData.data.length; i += 4) {
          const maskValue = maskData[i];
          imageData.data[i + 3] = maskValue; // Set alpha channel
        }

        ctx.putImageData(imageData, 0, 0);

        // Update canvas
        const dataUrl = tempCanvas.toDataURL('image/png');
        fabric.Image.fromURL(dataUrl, (img) => {
          img.set({
            left: activeObject.left,
            top: activeObject.top,
            scaleX: activeObject.scaleX,
            scaleY: activeObject.scaleY,
            angle: activeObject.angle,
          });

          canvas.remove(activeObject);
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          if (onApply) onApply();
          setIsProcessing(false);
        });
      };

      image.src = img;
    } catch (error) {
      console.error('Background removal failed:', error);
      alert('Background removal failed. Please try again.');
      setIsProcessing(false);
    }
  };

  const applyBackgroundEffect = async () => {
    if (!canvas || !activeObject) {
      alert('Please select an image first');
      return;
    }

    setIsProcessing(true);

    try {
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = activeObject.width;
      tempCanvas.height = activeObject.height;

      const img = activeObject.toDataURL();
      const image = new Image();

      image.onload = async () => {
        ctx.drawImage(image, 0, 0);

        let result = tempCanvas;

        switch (activeFeature) {
          case 'replace':
            if (uploadedBg) {
              result = await replaceBackground(tempCanvas, uploadedBg, mask);
            } else {
              alert('Please upload a background image first');
              setIsProcessing(false);
              return;
            }
            break;

          case 'blur':
            result = await applyBackgroundBlur(
              tempCanvas, 
              backgroundSettings.blurType,
              backgroundSettings.blurAmount,
              mask
            );
            break;

          case 'solid':
            const solidBg = generateSolidBackground(
              tempCanvas.width,
              tempCanvas.height,
              backgroundSettings.backgroundColor
            );
            result = await replaceBackground(tempCanvas, solidBg, mask);
            break;

          case 'gradient':
            const gradientBg = generateGradientBackground(
              tempCanvas.width,
              tempCanvas.height,
              backgroundSettings.gradientType,
              backgroundSettings.gradientStart,
              backgroundSettings.gradientEnd
            );
            result = await replaceBackground(tempCanvas, gradientBg, mask);
            break;

          case 'shadow':
            result = generateSmartShadow(
              tempCanvas,
              mask,
              backgroundSettings.shadowAngle,
              backgroundSettings.shadowDistance,
              backgroundSettings.shadowBlur,
              backgroundSettings.shadowOpacity
            );
            break;

          default:
            break;
        }

        // Update canvas
        const dataUrl = result.toDataURL();
        fabric.Image.fromURL(dataUrl, (img) => {
          img.set({
            left: activeObject.left,
            top: activeObject.top,
            scaleX: activeObject.scaleX,
            scaleY: activeObject.scaleY,
            angle: activeObject.angle,
          });

          canvas.remove(activeObject);
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();

          if (onApply) onApply();
          setIsProcessing(false);
        });
      };

      image.src = img;
    } catch (error) {
      console.error('Background effect failed:', error);
      alert('Failed to apply effect. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleBgUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        setUploadedBg(canvas);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const updateSetting = (key, value) => {
    setBackgroundSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderFeatureControls = () => {
    switch (activeFeature) {
      case 'remove':
        return (
          <div className="feature-controls">
            <h4>AI Background Removal</h4>
            <p className="info-text">
              Uses TensorFlow.js BodyPix for accurate person detection
            </p>
            <button 
              className="btn-process" 
              onClick={removeBackground}
              disabled={isProcessing || !activeObject}
            >
              {isProcessing ? 'Processing...' : 'Remove Background'}
            </button>
            {mask && (
              <div className="success-message">
                ✓ Background removed successfully!
              </div>
            )}
          </div>
        );

      case 'replace':
        return (
          <div className="feature-controls">
            <h4>Replace Background</h4>
            <div className="control-group">
              <label>Upload New Background:</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleBgUpload}
                className="file-input"
              />
              {uploadedBg && <p className="success-text">✓ Background uploaded</p>}
            </div>
            <p className="info-text">
              {!mask && 'First remove the background, then replace it'}
            </p>
            <button 
              className="btn-apply" 
              onClick={applyBackgroundEffect}
              disabled={isProcessing || !activeObject || !mask || !uploadedBg}
            >
              {isProcessing ? 'Processing...' : 'Replace Background'}
            </button>
          </div>
        );

      case 'blur':
        return (
          <div className="feature-controls">
            <h4>Background Blur</h4>
            <div className="control-group">
              <label>Blur Type:</label>
              <select 
                value={backgroundSettings.blurType}
                onChange={(e) => updateSetting('blurType', e.target.value)}
              >
                <option value="gaussian">Gaussian Blur</option>
                <option value="bokeh">Bokeh Effect</option>
                <option value="tilt-shift">Tilt-Shift</option>
              </select>
            </div>
            <div className="control-group">
              <label>Blur Amount: {backgroundSettings.blurAmount}px</label>
              <input 
                type="range" 
                min="0" 
                max="50" 
                value={backgroundSettings.blurAmount}
                onChange={(e) => updateSetting('blurAmount', parseInt(e.target.value))}
              />
            </div>
            <p className="info-text">
              {!mask && 'First remove the background for better results'}
            </p>
            <button 
              className="btn-apply" 
              onClick={applyBackgroundEffect}
              disabled={isProcessing || !activeObject}
            >
              {isProcessing ? 'Processing...' : 'Apply Blur'}
            </button>
          </div>
        );

      case 'solid':
        return (
          <div className="feature-controls">
            <h4>Solid Color Background</h4>
            <div className="control-group">
              <label>Background Color:</label>
              <input 
                type="color" 
                value={backgroundSettings.backgroundColor}
                onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                className="color-picker-large"
              />
            </div>
            <div className="preset-colors">
              <button onClick={() => updateSetting('backgroundColor', '#ffffff')}>White</button>
              <button onClick={() => updateSetting('backgroundColor', '#000000')}>Black</button>
              <button onClick={() => updateSetting('backgroundColor', '#f0f0f0')}>Gray</button>
              <button onClick={() => updateSetting('backgroundColor', '#3498db')}>Blue</button>
              <button onClick={() => updateSetting('backgroundColor', '#2ecc71')}>Green</button>
              <button onClick={() => updateSetting('backgroundColor', '#e74c3c')}>Red</button>
            </div>
            <p className="info-text">
              {!mask && 'First remove the background'}
            </p>
            <button 
              className="btn-apply" 
              onClick={applyBackgroundEffect}
              disabled={isProcessing || !activeObject || !mask}
            >
              {isProcessing ? 'Processing...' : 'Apply Color'}
            </button>
          </div>
        );

      case 'gradient':
        return (
          <div className="feature-controls">
            <h4>Gradient Background</h4>
            <div className="control-group">
              <label>Gradient Type:</label>
              <select 
                value={backgroundSettings.gradientType}
                onChange={(e) => updateSetting('gradientType', e.target.value)}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
                <option value="diagonal">Diagonal</option>
              </select>
            </div>
            <div className="control-group">
              <label>Start Color:</label>
              <input 
                type="color" 
                value={backgroundSettings.gradientStart}
                onChange={(e) => updateSetting('gradientStart', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>End Color:</label>
              <input 
                type="color" 
                value={backgroundSettings.gradientEnd}
                onChange={(e) => updateSetting('gradientEnd', e.target.value)}
              />
            </div>
            <div className="preset-gradients">
              <button onClick={() => {
                updateSetting('gradientStart', '#667eea');
                updateSetting('gradientEnd', '#764ba2');
              }}>Purple</button>
              <button onClick={() => {
                updateSetting('gradientStart', '#f093fb');
                updateSetting('gradientEnd', '#f5576c');
              }}>Pink</button>
              <button onClick={() => {
                updateSetting('gradientStart', '#4facfe');
                updateSetting('gradientEnd', '#00f2fe');
              }}>Blue</button>
              <button onClick={() => {
                updateSetting('gradientStart', '#43e97b');
                updateSetting('gradientEnd', '#38f9d7');
              }}>Green</button>
            </div>
            <p className="info-text">
              {!mask && 'First remove the background'}
            </p>
            <button 
              className="btn-apply" 
              onClick={applyBackgroundEffect}
              disabled={isProcessing || !activeObject || !mask}
            >
              {isProcessing ? 'Processing...' : 'Apply Gradient'}
            </button>
          </div>
        );

      case 'shadow':
        return (
          <div className="feature-controls">
            <h4>Smart Shadow</h4>
            <div className="control-group">
              <label>Shadow Angle: {backgroundSettings.shadowAngle}°</label>
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={backgroundSettings.shadowAngle}
                onChange={(e) => updateSetting('shadowAngle', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Distance: {backgroundSettings.shadowDistance}px</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={backgroundSettings.shadowDistance}
                onChange={(e) => updateSetting('shadowDistance', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Blur: {backgroundSettings.shadowBlur}px</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={backgroundSettings.shadowBlur}
                onChange={(e) => updateSetting('shadowBlur', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Opacity: {Math.round(backgroundSettings.shadowOpacity * 100)}%</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={backgroundSettings.shadowOpacity}
                onChange={(e) => updateSetting('shadowOpacity', parseFloat(e.target.value))}
              />
            </div>
            <p className="info-text">
              {!mask && 'First remove the background'}
            </p>
            <button 
              className="btn-apply" 
              onClick={applyBackgroundEffect}
              disabled={isProcessing || !activeObject || !mask}
            >
              {isProcessing ? 'Processing...' : 'Add Shadow'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="background-panel">
      <div className="panel-header">
        <h3>Background Editing</h3>
      </div>

      {isProcessing && (
        <div className="processing-overlay">
          <div className="spinner"></div>
          <p>Processing with AI...</p>
        </div>
      )}

      <div className="features-list">
        {backgroundFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              className={`feature-button ${activeFeature === feature.id ? 'active' : ''}`}
              onClick={() => setActiveFeature(feature.id)}
              disabled={isProcessing}
            >
              <Icon size={18} />
              <span>{feature.name}</span>
            </button>
          );
        })}
      </div>

      {activeFeature && (
        <div className="feature-settings">
          {renderFeatureControls()}
        </div>
      )}

      <div className="background-info">
        <p>🤖 Powered by TensorFlow.js</p>
        <p>🆓 100% Free - No API costs</p>
        <p>⚡ Client-side processing</p>
      </div>
    </div>
  );
};

export default BackgroundPanel;
