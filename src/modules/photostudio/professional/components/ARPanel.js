import React, { useState, useEffect, useRef } from 'react';
import { 
  FiCamera, 
  FiEye,
  FiStar,
  FiSmile,
  FiUser,
  FiHeart
} from 'react-icons/fi';
import { 
  loadFaceDetector,
  getFaceLandmarks,
  applyVirtualMakeup,
  applyVirtualGlasses,
  applyVirtualJewelry,
  applyFaceFilter,
  applyHairColor,
  applySelfieSegmentation
} from '../utils/arFeatures';

const ARPanel = ({ canvas, activeObject, onApply }) => {
  const [arMode, setArMode] = useState(null);
  const [arSettings, setArSettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [faceLandmarks, setFaceLandmarks] = useState(null);
  const [error, setError] = useState(null);
  const detectorRef = useRef(null);

  const arFeatures = [
    { id: 'makeup', name: 'Virtual Makeup', icon: FiHeart },
    { id: 'glasses', name: 'Virtual Glasses', icon: FiEye },
    { id: 'jewelry', name: 'Virtual Jewelry', icon: FiStar },
    { id: 'filter', name: 'Face Filters', icon: FiSmile },
    { id: 'hair', name: 'Hair Color', icon: FiUser },
    { id: 'segmentation', name: 'Background Blur', icon: FiCamera },
  ];

  // Initialize face detector
  useEffect(() => {
    const initDetector = async () => {
      try {
        setIsLoading(true);
        detectorRef.current = await loadFaceDetector();
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load AR features. Please refresh.');
        setIsLoading(false);
      }
    };

    if (!detectorRef.current) {
      initDetector();
    }
  }, []);

  const detectFace = async () => {
    if (!canvas || !activeObject || !detectorRef.current) {
      setError('Please select an image first');
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get canvas from active object
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = activeObject.width;
      tempCanvas.height = activeObject.height;

      const img = activeObject.toDataURL();
      const image = new Image();
      
      return new Promise((resolve, reject) => {
        image.onload = async () => {
          ctx.drawImage(image, 0, 0);
          
          try {
            const landmarks = await getFaceLandmarks(tempCanvas, detectorRef.current);
            
            if (!landmarks || landmarks.length === 0) {
              setError('No face detected. Please use an image with a clear face.');
              setIsLoading(false);
              resolve(null);
              return;
            }

            setFaceLandmarks(landmarks[0]); // Use first detected face
            setIsLoading(false);
            resolve(landmarks[0]);
          } catch (err) {
            setError('Face detection failed');
            setIsLoading(false);
            reject(err);
          }
        };
        
        image.onerror = () => {
          setError('Failed to load image');
          setIsLoading(false);
          reject(new Error('Image load failed'));
        };
        
        image.src = img;
      });
    } catch (err) {
      setError('An error occurred during face detection');
      setIsLoading(false);
      return null;
    }
  };

  const applyAREffect = async () => {
    if (!canvas || !activeObject) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Detect face if not already detected
      let landmarks = faceLandmarks;
      if (!landmarks) {
        landmarks = await detectFace();
        if (!landmarks) return;
      }

      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      tempCanvas.width = activeObject.width;
      tempCanvas.height = activeObject.height;

      const img = activeObject.toDataURL();
      const image = new Image();

      image.onload = async () => {
        ctx.drawImage(image, 0, 0);

        let result;

        switch (arMode) {
          case 'makeup':
            result = await applyVirtualMakeup(tempCanvas, landmarks, {
              lipstick: arSettings.lipstick || { enabled: true, color: '#ff69b4', opacity: 0.6 },
              eyeshadow: arSettings.eyeshadow || { enabled: true, color: '#daa520', opacity: 0.5 },
              eyeliner: arSettings.eyeliner || { enabled: true, color: '#000000', thickness: 2 },
              blush: arSettings.blush || { enabled: true, color: '#ff9999', opacity: 0.4 },
              eyebrows: arSettings.eyebrows || { enabled: true, color: '#654321', thickness: 3 }
            });
            break;

          case 'glasses':
            result = await applyVirtualGlasses(tempCanvas, landmarks, {
              type: arSettings.glassesType || 'round',
              color: arSettings.glassesColor || '#333333',
              opacity: arSettings.glassesOpacity || 0.8
            });
            break;

          case 'jewelry':
            result = await applyVirtualJewelry(tempCanvas, landmarks, {
              type: arSettings.jewelryType || 'earrings',
              style: arSettings.jewelryStyle || 'simple',
              color: arSettings.jewelryColor || '#ffd700'
            });
            break;

          case 'filter':
            result = await applyFaceFilter(tempCanvas, landmarks, {
              type: arSettings.filterType || 'beauty',
              intensity: arSettings.filterIntensity || 0.5
            });
            break;

          case 'hair':
            result = await applyHairColor(tempCanvas, landmarks, {
              color: arSettings.hairColor || '#ff6347',
              intensity: arSettings.hairIntensity || 0.7
            });
            break;

          case 'segmentation':
            result = await applySelfieSegmentation(tempCanvas, {
              blurAmount: arSettings.blurAmount || 10
            });
            break;

          default:
            setIsLoading(false);
            return;
        }

        // Apply result to canvas
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
          setIsLoading(false);
        });
      };

      image.src = img;
    } catch (err) {
      setError('Failed to apply AR effect: ' + err.message);
      setIsLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setArSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderARControls = () => {
    switch (arMode) {
      case 'makeup':
        return (
          <div className="ar-controls">
            <h4>Virtual Makeup</h4>
            
            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={arSettings.lipstick?.enabled !== false}
                  onChange={(e) => updateSetting('lipstick', { 
                    ...arSettings.lipstick, 
                    enabled: e.target.checked 
                  })}
                />
                Lipstick
              </label>
              <input 
                type="color" 
                value={arSettings.lipstick?.color || '#ff69b4'}
                onChange={(e) => updateSetting('lipstick', { 
                  ...arSettings.lipstick, 
                  color: e.target.value 
                })}
              />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={arSettings.lipstick?.opacity || 0.6}
                onChange={(e) => updateSetting('lipstick', { 
                  ...arSettings.lipstick, 
                  opacity: parseFloat(e.target.value) 
                })}
              />
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={arSettings.eyeshadow?.enabled !== false}
                  onChange={(e) => updateSetting('eyeshadow', { 
                    ...arSettings.eyeshadow, 
                    enabled: e.target.checked 
                  })}
                />
                Eyeshadow
              </label>
              <input 
                type="color" 
                value={arSettings.eyeshadow?.color || '#daa520'}
                onChange={(e) => updateSetting('eyeshadow', { 
                  ...arSettings.eyeshadow, 
                  color: e.target.value 
                })}
              />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={arSettings.eyeshadow?.opacity || 0.5}
                onChange={(e) => updateSetting('eyeshadow', { 
                  ...arSettings.eyeshadow, 
                  opacity: parseFloat(e.target.value) 
                })}
              />
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={arSettings.eyeliner?.enabled !== false}
                  onChange={(e) => updateSetting('eyeliner', { 
                    ...arSettings.eyeliner, 
                    enabled: e.target.checked 
                  })}
                />
                Eyeliner
              </label>
              <input 
                type="range" 
                min="1" 
                max="5" 
                value={arSettings.eyeliner?.thickness || 2}
                onChange={(e) => updateSetting('eyeliner', { 
                  ...arSettings.eyeliner, 
                  thickness: parseInt(e.target.value) 
                })}
              />
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={arSettings.blush?.enabled !== false}
                  onChange={(e) => updateSetting('blush', { 
                    ...arSettings.blush, 
                    enabled: e.target.checked 
                  })}
                />
                Blush
              </label>
              <input 
                type="color" 
                value={arSettings.blush?.color || '#ff9999'}
                onChange={(e) => updateSetting('blush', { 
                  ...arSettings.blush, 
                  color: e.target.value 
                })}
              />
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={arSettings.eyebrows?.enabled !== false}
                  onChange={(e) => updateSetting('eyebrows', { 
                    ...arSettings.eyebrows, 
                    enabled: e.target.checked 
                  })}
                />
                Eyebrows Enhancement
              </label>
            </div>
          </div>
        );

      case 'glasses':
        return (
          <div className="ar-controls">
            <h4>Virtual Glasses</h4>
            <div className="control-group">
              <label>Style:</label>
              <select 
                value={arSettings.glassesType || 'round'}
                onChange={(e) => updateSetting('glassesType', e.target.value)}
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="cat-eye">Cat Eye</option>
                <option value="aviator">Aviator</option>
                <option value="wayfarer">Wayfarer</option>
              </select>
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input 
                type="color" 
                value={arSettings.glassesColor || '#333333'}
                onChange={(e) => updateSetting('glassesColor', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Opacity: {arSettings.glassesOpacity || 0.8}</label>
              <input 
                type="range" 
                min="0.3" 
                max="1" 
                step="0.1"
                value={arSettings.glassesOpacity || 0.8}
                onChange={(e) => updateSetting('glassesOpacity', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'jewelry':
        return (
          <div className="ar-controls">
            <h4>Virtual Jewelry</h4>
            <div className="control-group">
              <label>Type:</label>
              <select 
                value={arSettings.jewelryType || 'earrings'}
                onChange={(e) => updateSetting('jewelryType', e.target.value)}
              >
                <option value="earrings">Earrings</option>
                <option value="necklace">Necklace</option>
                <option value="nose-ring">Nose Ring</option>
              </select>
            </div>
            <div className="control-group">
              <label>Style:</label>
              <select 
                value={arSettings.jewelryStyle || 'simple'}
                onChange={(e) => updateSetting('jewelryStyle', e.target.value)}
              >
                <option value="simple">Simple</option>
                <option value="elegant">Elegant</option>
                <option value="fancy">Fancy</option>
                <option value="traditional">Traditional</option>
              </select>
            </div>
            <div className="control-group">
              <label>Color:</label>
              <input 
                type="color" 
                value={arSettings.jewelryColor || '#ffd700'}
                onChange={(e) => updateSetting('jewelryColor', e.target.value)}
              />
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="ar-controls">
            <h4>Face Filters</h4>
            <div className="control-group">
              <label>Filter Type:</label>
              <select 
                value={arSettings.filterType || 'beauty'}
                onChange={(e) => updateSetting('filterType', e.target.value)}
              >
                <option value="beauty">Beauty (Skin Smoothing)</option>
                <option value="glow">Glow</option>
                <option value="sharpen">Sharpen</option>
                <option value="vintage">Vintage</option>
              </select>
            </div>
            <div className="control-group">
              <label>Intensity: {arSettings.filterIntensity || 0.5}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={arSettings.filterIntensity || 0.5}
                onChange={(e) => updateSetting('filterIntensity', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'hair':
        return (
          <div className="ar-controls">
            <h4>Hair Color</h4>
            <div className="control-group">
              <label>Color:</label>
              <input 
                type="color" 
                value={arSettings.hairColor || '#ff6347'}
                onChange={(e) => updateSetting('hairColor', e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Intensity: {arSettings.hairIntensity || 0.7}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={arSettings.hairIntensity || 0.7}
                onChange={(e) => updateSetting('hairIntensity', parseFloat(e.target.value))}
              />
            </div>
            <div className="preset-colors">
              <button onClick={() => updateSetting('hairColor', '#000000')}>Black</button>
              <button onClick={() => updateSetting('hairColor', '#8b4513')}>Brown</button>
              <button onClick={() => updateSetting('hairColor', '#ffd700')}>Blonde</button>
              <button onClick={() => updateSetting('hairColor', '#ff6347')}>Red</button>
              <button onClick={() => updateSetting('hairColor', '#9b59b6')}>Purple</button>
              <button onClick={() => updateSetting('hairColor', '#3498db')}>Blue</button>
              <button onClick={() => updateSetting('hairColor', '#2ecc71')}>Green</button>
              <button onClick={() => updateSetting('hairColor', '#e91e63')}>Pink</button>
            </div>
          </div>
        );

      case 'segmentation':
        return (
          <div className="ar-controls">
            <h4>Background Blur</h4>
            <div className="control-group">
              <label>Blur Amount: {arSettings.blurAmount || 10}</label>
              <input 
                type="range" 
                min="0" 
                max="30" 
                value={arSettings.blurAmount || 10}
                onChange={(e) => updateSetting('blurAmount', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ar-panel">
      <div className="panel-header">
        <h3>AR Features</h3>
      </div>

      {isLoading && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading AR features...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <div className="ar-features-list">
        {arFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              className={`ar-button ${arMode === feature.id ? 'active' : ''}`}
              onClick={() => setArMode(feature.id)}
              disabled={isLoading}
            >
              <Icon size={18} />
              <span>{feature.name}</span>
            </button>
          );
        })}
      </div>

      {arMode && (
        <div className="ar-settings">
          {renderARControls()}

          <div className="ar-actions">
            <button 
              className="btn-detect" 
              onClick={detectFace}
              disabled={isLoading}
            >
              {faceLandmarks ? '✓ Face Detected' : 'Detect Face'}
            </button>
            <button 
              className="btn-apply" 
              onClick={applyAREffect}
              disabled={isLoading || !activeObject}
            >
              Apply Effect
            </button>
            <button 
              className="btn-reset" 
              onClick={() => {
                setArSettings({});
                setArMode(null);
                setFaceLandmarks(null);
                setError(null);
              }}
              disabled={isLoading}
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="ar-info">
        <p>💡 Tip: Works best with clear, front-facing photos</p>
        <p>🆓 100% Free - Powered by MediaPipe</p>
      </div>
    </div>
  );
};

export default ARPanel;
