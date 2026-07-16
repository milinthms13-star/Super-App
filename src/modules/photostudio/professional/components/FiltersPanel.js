import React, { useState } from 'react';
import { 
  FiSliders, 
  FiSun, 
  FiDroplet,
  FiZap,
  FiAperture,
  FiTrendingUp,
  FiCircle
} from 'react-icons/fi';
import { 
  applyCurves, 
  applyLevels, 
  applyHueSaturationLightness,
  applyColorBalance,
  applyVibrance,
  applyBrightnessContrast,
  applySharpen,
  applyNoiseReduction,
  applyVignette,
  applyExposure,
  applyTemperatureTint
} from '../utils/imageFilters';

const FiltersPanel = ({ canvas, activeObject, onApply }) => {
  const [activeFilter, setActiveFilter] = useState(null);
  const [filterSettings, setFilterSettings] = useState({});

  const filters = [
    { id: 'curves', name: 'Curves', icon: FiTrendingUp },
    { id: 'levels', name: 'Levels', icon: FiSliders },
    { id: 'hsl', name: 'Hue/Saturation', icon: FiDroplet },
    { id: 'colorBalance', name: 'Color Balance', icon: FiCircle },
    { id: 'brightness', name: 'Brightness/Contrast', icon: FiSun },
    { id: 'exposure', name: 'Exposure', icon: FiAperture },
    { id: 'vibrance', name: 'Vibrance', icon: FiZap },
    { id: 'sharpen', name: 'Sharpen', icon: FiSliders },
    { id: 'vignette', name: 'Vignette', icon: FiCircle },
    { id: 'temperature', name: 'Temperature', icon: FiSun },
  ];

  const applyFilter = async () => {
    if (!canvas || !activeObject) return;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = activeObject.width;
    tempCanvas.height = activeObject.height;

    // Draw current object
    const img = activeObject.toDataURL();
    const image = new Image();
    image.src = img;

    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      
      let result = imageData;

      // Apply the selected filter
      switch (activeFilter) {
        case 'curves':
          const { red = [0, 255], green = [0, 255], blue = [0, 255] } = filterSettings;
          result = applyCurves(imageData, red, green, blue);
          break;

        case 'levels':
          const { blackPoint = 0, whitePoint = 255, midtone = 1.0, outputBlack = 0, outputWhite = 255 } = filterSettings;
          result = applyLevels(imageData, blackPoint, whitePoint, midtone, outputBlack, outputWhite);
          break;

        case 'hsl':
          const { hue = 0, saturation = 0, lightness = 0 } = filterSettings;
          result = applyHueSaturationLightness(imageData, hue, saturation, lightness);
          break;

        case 'colorBalance':
          const { 
            shadowsCyan = 0, shadowsMagenta = 0, shadowsYellow = 0,
            midtonesCyan = 0, midtonesMagenta = 0, midtonesYellow = 0,
            highlightsCyan = 0, highlightsMagenta = 0, highlightsYellow = 0
          } = filterSettings;
          result = applyColorBalance(imageData, 
            [shadowsCyan, shadowsMagenta, shadowsYellow],
            [midtonesCyan, midtonesMagenta, midtonesYellow],
            [highlightsCyan, highlightsMagenta, highlightsYellow]
          );
          break;

        case 'brightness':
          const { brightness = 0, contrast = 0 } = filterSettings;
          result = applyBrightnessContrast(imageData, brightness, contrast);
          break;

        case 'exposure':
          const { exposure = 0 } = filterSettings;
          result = applyExposure(imageData, exposure);
          break;

        case 'vibrance':
          const { vibrance = 0 } = filterSettings;
          result = applyVibrance(imageData, vibrance);
          break;

        case 'sharpen':
          const { amount = 1.0, radius = 1.0, threshold = 0 } = filterSettings;
          result = applySharpen(imageData, amount, radius, threshold);
          break;

        case 'vignette':
          const { vignetteAmount = 0.5, vignetteSize = 0.5 } = filterSettings;
          result = applyVignette(imageData, vignetteAmount, vignetteSize);
          break;

        case 'temperature':
          const { temperature = 0, tint = 0 } = filterSettings;
          result = applyTemperatureTint(imageData, temperature, tint);
          break;

        default:
          break;
      }

      // Apply result to canvas
      ctx.putImageData(result, 0, 0);
      const dataUrl = tempCanvas.toDataURL();
      
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
      });
    };
  };

  const updateSetting = (key, value) => {
    setFilterSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderFilterControls = () => {
    switch (activeFilter) {
      case 'curves':
        return (
          <div className="filter-controls">
            <h4>Curves</h4>
            <div className="curve-editor">
              <div className="control-group">
                <label>Red Channel</label>
                <div className="range-inputs">
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.red?.[0] || 0}
                    onChange={(e) => updateSetting('red', [parseInt(e.target.value), filterSettings.red?.[1] || 255])}
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.red?.[1] || 255}
                    onChange={(e) => updateSetting('red', [filterSettings.red?.[0] || 0, parseInt(e.target.value)])}
                  />
                </div>
              </div>
              <div className="control-group">
                <label>Green Channel</label>
                <div className="range-inputs">
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.green?.[0] || 0}
                    onChange={(e) => updateSetting('green', [parseInt(e.target.value), filterSettings.green?.[1] || 255])}
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.green?.[1] || 255}
                    onChange={(e) => updateSetting('green', [filterSettings.green?.[0] || 0, parseInt(e.target.value)])}
                  />
                </div>
              </div>
              <div className="control-group">
                <label>Blue Channel</label>
                <div className="range-inputs">
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.blue?.[0] || 0}
                    onChange={(e) => updateSetting('blue', [parseInt(e.target.value), filterSettings.blue?.[1] || 255])}
                  />
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    value={filterSettings.blue?.[1] || 255}
                    onChange={(e) => updateSetting('blue', [filterSettings.blue?.[0] || 0, parseInt(e.target.value)])}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'levels':
        return (
          <div className="filter-controls">
            <h4>Levels</h4>
            <div className="control-group">
              <label>Black Point: {filterSettings.blackPoint || 0}</label>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={filterSettings.blackPoint || 0}
                onChange={(e) => updateSetting('blackPoint', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>White Point: {filterSettings.whitePoint || 255}</label>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={filterSettings.whitePoint || 255}
                onChange={(e) => updateSetting('whitePoint', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Midtone: {filterSettings.midtone || 1.0}</label>
              <input 
                type="range" 
                min="0.1" 
                max="9.9" 
                step="0.1"
                value={filterSettings.midtone || 1.0}
                onChange={(e) => updateSetting('midtone', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'hsl':
        return (
          <div className="filter-controls">
            <h4>Hue/Saturation/Lightness</h4>
            <div className="control-group">
              <label>Hue: {filterSettings.hue || 0}°</label>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                value={filterSettings.hue || 0}
                onChange={(e) => updateSetting('hue', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Saturation: {filterSettings.saturation || 0}%</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.saturation || 0}
                onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Lightness: {filterSettings.lightness || 0}%</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.lightness || 0}
                onChange={(e) => updateSetting('lightness', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'colorBalance':
        return (
          <div className="filter-controls">
            <h4>Color Balance</h4>
            <div className="tone-group">
              <h5>Shadows</h5>
              <div className="control-group">
                <label>Cyan ← → Red</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.shadowsCyan || 0}
                  onChange={(e) => updateSetting('shadowsCyan', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Magenta ← → Green</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.shadowsMagenta || 0}
                  onChange={(e) => updateSetting('shadowsMagenta', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Yellow ← → Blue</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.shadowsYellow || 0}
                  onChange={(e) => updateSetting('shadowsYellow', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="tone-group">
              <h5>Midtones</h5>
              <div className="control-group">
                <label>Cyan ← → Red</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.midtonesCyan || 0}
                  onChange={(e) => updateSetting('midtonesCyan', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Magenta ← → Green</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.midtonesMagenta || 0}
                  onChange={(e) => updateSetting('midtonesMagenta', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Yellow ← → Blue</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.midtonesYellow || 0}
                  onChange={(e) => updateSetting('midtonesYellow', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="tone-group">
              <h5>Highlights</h5>
              <div className="control-group">
                <label>Cyan ← → Red</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.highlightsCyan || 0}
                  onChange={(e) => updateSetting('highlightsCyan', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Magenta ← → Green</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.highlightsMagenta || 0}
                  onChange={(e) => updateSetting('highlightsMagenta', parseInt(e.target.value))}
                />
              </div>
              <div className="control-group">
                <label>Yellow ← → Blue</label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value={filterSettings.highlightsYellow || 0}
                  onChange={(e) => updateSetting('highlightsYellow', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        );

      case 'brightness':
        return (
          <div className="filter-controls">
            <h4>Brightness/Contrast</h4>
            <div className="control-group">
              <label>Brightness: {filterSettings.brightness || 0}</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.brightness || 0}
                onChange={(e) => updateSetting('brightness', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Contrast: {filterSettings.contrast || 0}</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.contrast || 0}
                onChange={(e) => updateSetting('contrast', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'exposure':
        return (
          <div className="filter-controls">
            <h4>Exposure</h4>
            <div className="control-group">
              <label>Exposure: {filterSettings.exposure || 0} stops</label>
              <input 
                type="range" 
                min="-2" 
                max="2" 
                step="0.1"
                value={filterSettings.exposure || 0}
                onChange={(e) => updateSetting('exposure', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'vibrance':
        return (
          <div className="filter-controls">
            <h4>Vibrance</h4>
            <div className="control-group">
              <label>Vibrance: {filterSettings.vibrance || 0}</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.vibrance || 0}
                onChange={(e) => updateSetting('vibrance', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'sharpen':
        return (
          <div className="filter-controls">
            <h4>Sharpen</h4>
            <div className="control-group">
              <label>Amount: {filterSettings.amount || 1.0}</label>
              <input 
                type="range" 
                min="0" 
                max="5" 
                step="0.1"
                value={filterSettings.amount || 1.0}
                onChange={(e) => updateSetting('amount', parseFloat(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Radius: {filterSettings.radius || 1.0}</label>
              <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.1"
                value={filterSettings.radius || 1.0}
                onChange={(e) => updateSetting('radius', parseFloat(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Threshold: {filterSettings.threshold || 0}</label>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={filterSettings.threshold || 0}
                onChange={(e) => updateSetting('threshold', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'vignette':
        return (
          <div className="filter-controls">
            <h4>Vignette</h4>
            <div className="control-group">
              <label>Amount: {filterSettings.vignetteAmount || 0.5}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={filterSettings.vignetteAmount || 0.5}
                onChange={(e) => updateSetting('vignetteAmount', parseFloat(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Size: {filterSettings.vignetteSize || 0.5}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={filterSettings.vignetteSize || 0.5}
                onChange={(e) => updateSetting('vignetteSize', parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case 'temperature':
        return (
          <div className="filter-controls">
            <h4>Temperature & Tint</h4>
            <div className="control-group">
              <label>Temperature: {filterSettings.temperature || 0}</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.temperature || 0}
                onChange={(e) => updateSetting('temperature', parseInt(e.target.value))}
              />
            </div>
            <div className="control-group">
              <label>Tint: {filterSettings.tint || 0}</label>
              <input 
                type="range" 
                min="-100" 
                max="100" 
                value={filterSettings.tint || 0}
                onChange={(e) => updateSetting('tint', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="filters-panel">
      <div className="panel-header">
        <h3>Filters & Adjustments</h3>
      </div>

      <div className="filters-list">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <button
              key={filter.id}
              className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(filter.id)}
            >
              <Icon size={18} />
              <span>{filter.name}</span>
            </button>
          );
        })}
      </div>

      {activeFilter && (
        <div className="filter-settings">
          {renderFilterControls()}
          
          <div className="filter-actions">
            <button className="btn-apply" onClick={applyFilter}>
              Apply Filter
            </button>
            <button 
              className="btn-reset" 
              onClick={() => {
                setFilterSettings({});
                setActiveFilter(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersPanel;
