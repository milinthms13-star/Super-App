import React, { useState, useEffect, useRef } from 'react';
import { 
  FiType, 
  FiBold,
  FiItalic,
  FiUnderline,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiAlignJustify
} from 'react-icons/fi';
import { TextEngine, loadGoogleFont } from '../utils/textTools';

const TextPanel = ({ canvas, activeObject }) => {
  const [textSettings, setTextSettings] = useState({
    text: 'Double click to edit',
    fontSize: 48,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#000000',
    textAlign: 'left',
    lineHeight: 1.2,
    charSpacing: 0,
    underline: false,
    linethrough: false,
  });

  const [textEffects, setTextEffects] = useState({
    outline: false,
    outlineWidth: 2,
    outlineColor: '#ffffff',
    shadow: false,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 5,
    shadowOffsetX: 5,
    shadowOffsetY: 5,
    glow: false,
    glowColor: '#ffffff',
    glowBlur: 10,
    gradient: false,
    gradientType: 'linear',
    gradientStart: '#000000',
    gradientEnd: '#ffffff',
  });

  const [activePreset, setActivePreset] = useState(null);
  const textEngineRef = useRef(null);

  useEffect(() => {
    if (canvas && !textEngineRef.current) {
      textEngineRef.current = new TextEngine(canvas);
    }

    return () => {
      if (textEngineRef.current) {
        textEngineRef.current.destroy();
      }
    };
  }, [canvas]);

  // Update settings when active object changes
  useEffect(() => {
    if (activeObject && activeObject.type === 'i-text') {
      setTextSettings({
        text: activeObject.text,
        fontSize: activeObject.fontSize,
        fontFamily: activeObject.fontFamily,
        fontWeight: activeObject.fontWeight,
        fontStyle: activeObject.fontStyle,
        fill: typeof activeObject.fill === 'string' ? activeObject.fill : '#000000',
        textAlign: activeObject.textAlign,
        lineHeight: activeObject.lineHeight,
        charSpacing: activeObject.charSpacing / 10,
        underline: activeObject.underline,
        linethrough: activeObject.linethrough,
      });
    }
  }, [activeObject]);

  const fonts = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Impact',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Raleway',
    'PT Sans',
    'Merriweather',
    'Playfair Display',
    'Ubuntu',
  ];

  const presets = {
    heading1: { name: 'Heading 1', icon: 'H1' },
    heading2: { name: 'Heading 2', icon: 'H2' },
    heading3: { name: 'Heading 3', icon: 'H3' },
    body: { name: 'Body', icon: 'B' },
    caption: { name: 'Caption', icon: 'C' },
    quote: { name: 'Quote', icon: 'Q' },
    impact: { name: 'Impact', icon: '!' },
    elegant: { name: 'Elegant', icon: 'E' },
    modern: { name: 'Modern', icon: 'M' },
    retro: { name: 'Retro', icon: 'R' },
  };

  const addNewText = () => {
    if (!textEngineRef.current) return;

    textEngineRef.current.addText(textSettings.text, textSettings);
  };

  const updateTextProperty = (property, value) => {
    setTextSettings(prev => ({ ...prev, [property]: value }));

    if (activeObject && textEngineRef.current) {
      textEngineRef.current.updateProperty(activeObject, property, value);
    }
  };

  const toggleBold = () => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.toggleBold(activeObject);
      setTextSettings(prev => ({
        ...prev,
        fontWeight: activeObject.fontWeight,
      }));
    }
  };

  const toggleItalic = () => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.toggleItalic(activeObject);
      setTextSettings(prev => ({
        ...prev,
        fontStyle: activeObject.fontStyle,
      }));
    }
  };

  const toggleUnderline = () => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.toggleUnderline(activeObject);
      setTextSettings(prev => ({
        ...prev,
        underline: activeObject.underline,
      }));
    }
  };

  const setAlignment = (alignment) => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.alignText(activeObject, alignment);
      setTextSettings(prev => ({ ...prev, textAlign: alignment }));
    }
  };

  const applyPreset = (presetName) => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.applyPreset(activeObject, presetName);
      setActivePreset(presetName);
    }
  };

  const applyEffect = (effect) => {
    if (!activeObject || !textEngineRef.current) return;

    switch (effect) {
      case 'outline':
        if (textEffects.outline) {
          textEngineRef.current.removeOutline(activeObject);
          setTextEffects(prev => ({ ...prev, outline: false }));
        } else {
          textEngineRef.current.applyOutline(activeObject, {
            width: textEffects.outlineWidth,
            color: textEffects.outlineColor,
          });
          setTextEffects(prev => ({ ...prev, outline: true }));
        }
        break;

      case 'shadow':
        if (textEffects.shadow) {
          textEngineRef.current.removeShadow(activeObject);
          setTextEffects(prev => ({ ...prev, shadow: false }));
        } else {
          textEngineRef.current.applyShadow(activeObject, {
            color: textEffects.shadowColor,
            blur: textEffects.shadowBlur,
            offsetX: textEffects.shadowOffsetX,
            offsetY: textEffects.shadowOffsetY,
          });
          setTextEffects(prev => ({ ...prev, shadow: true }));
        }
        break;

      case 'glow':
        if (textEffects.glow) {
          textEngineRef.current.removeShadow(activeObject);
          setTextEffects(prev => ({ ...prev, glow: false }));
        } else {
          textEngineRef.current.applyGlow(activeObject, {
            color: textEffects.glowColor,
            blur: textEffects.glowBlur,
          });
          setTextEffects(prev => ({ ...prev, glow: true }));
        }
        break;

      case 'gradient':
        if (textEffects.gradient) {
          textEngineRef.current.removeGradient(activeObject, textSettings.fill);
          setTextEffects(prev => ({ ...prev, gradient: false }));
        } else {
          textEngineRef.current.applyGradient(activeObject, {
            type: textEffects.gradientType,
            colors: [textEffects.gradientStart, textEffects.gradientEnd],
          });
          setTextEffects(prev => ({ ...prev, gradient: true }));
        }
        break;

      case '3d':
        textEngineRef.current.apply3D(activeObject);
        break;

      default:
        break;
    }
  };

  const centerText = (axis = 'both') => {
    if (activeObject && textEngineRef.current) {
      textEngineRef.current.centerText(activeObject, axis);
    }
  };

  const handleFontChange = async (fontFamily) => {
    // Load Google Font if needed
    const googleFonts = [
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Oswald',
      'Raleway',
      'PT Sans',
      'Merriweather',
      'Playfair Display',
      'Ubuntu',
    ];

    if (googleFonts.includes(fontFamily)) {
      await loadGoogleFont(fontFamily);
    }

    updateTextProperty('fontFamily', fontFamily);
  };

  return (
    <div className="text-panel">
      <div className="panel-header">
        <h3>Text Tools</h3>
      </div>

      <div className="add-text-section">
        <button className="btn-add-text" onClick={addNewText}>
          <FiType size={18} />
          <span>Add New Text</span>
        </button>
      </div>

      {/* Text Presets */}
      <div className="text-presets">
        <h4>Presets</h4>
        <div className="presets-grid">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              className={`preset-button ${activePreset === key ? 'active' : ''}`}
              onClick={() => applyPreset(key)}
              disabled={!activeObject || activeObject.type !== 'i-text'}
              title={preset.name}
            >
              {preset.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Font Settings */}
      <div className="text-settings">
        <h4>Font Settings</h4>

        <div className="control-group">
          <label>Font Family:</label>
          <select
            value={textSettings.fontFamily}
            onChange={(e) => handleFontChange(e.target.value)}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            {fonts.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Font Size: {textSettings.fontSize}px</label>
          <input
            type="range"
            min="8"
            max="200"
            value={textSettings.fontSize}
            onChange={(e) => updateTextProperty('fontSize', parseInt(e.target.value))}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          />
        </div>

        <div className="control-group">
          <label>Text Color:</label>
          <input
            type="color"
            value={textSettings.fill}
            onChange={(e) => updateTextProperty('fill', e.target.value)}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          />
        </div>

        {/* Text Formatting */}
        <div className="text-formatting">
          <button
            className={`format-btn ${textSettings.fontWeight === 'bold' ? 'active' : ''}`}
            onClick={toggleBold}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Bold"
          >
            <FiBold />
          </button>
          <button
            className={`format-btn ${textSettings.fontStyle === 'italic' ? 'active' : ''}`}
            onClick={toggleItalic}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Italic"
          >
            <FiItalic />
          </button>
          <button
            className={`format-btn ${textSettings.underline ? 'active' : ''}`}
            onClick={toggleUnderline}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Underline"
          >
            <FiUnderline />
          </button>
        </div>

        {/* Text Alignment */}
        <div className="text-alignment">
          <button
            className={`align-btn ${textSettings.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => setAlignment('left')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Align Left"
          >
            <FiAlignLeft />
          </button>
          <button
            className={`align-btn ${textSettings.textAlign === 'center' ? 'active' : ''}`}
            onClick={() => setAlignment('center')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Align Center"
          >
            <FiAlignCenter />
          </button>
          <button
            className={`align-btn ${textSettings.textAlign === 'right' ? 'active' : ''}`}
            onClick={() => setAlignment('right')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Align Right"
          >
            <FiAlignRight />
          </button>
          <button
            className={`align-btn ${textSettings.textAlign === 'justify' ? 'active' : ''}`}
            onClick={() => setAlignment('justify')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
            title="Justify"
          >
            <FiAlignJustify />
          </button>
        </div>

        <div className="control-group">
          <label>Line Height: {textSettings.lineHeight.toFixed(1)}</label>
          <input
            type="range"
            min="0.8"
            max="3"
            step="0.1"
            value={textSettings.lineHeight}
            onChange={(e) => updateTextProperty('lineHeight', parseFloat(e.target.value))}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          />
        </div>

        <div className="control-group">
          <label>Letter Spacing: {textSettings.charSpacing}</label>
          <input
            type="range"
            min="-10"
            max="50"
            value={textSettings.charSpacing}
            onChange={(e) => updateTextProperty('charSpacing', parseInt(e.target.value) * 10)}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          />
        </div>
      </div>

      {/* Text Effects */}
      <div className="text-effects">
        <h4>Text Effects</h4>

        <div className="effects-buttons">
          <button
            className={`effect-btn ${textEffects.outline ? 'active' : ''}`}
            onClick={() => applyEffect('outline')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Outline
          </button>
          <button
            className={`effect-btn ${textEffects.shadow ? 'active' : ''}`}
            onClick={() => applyEffect('shadow')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Shadow
          </button>
          <button
            className={`effect-btn ${textEffects.glow ? 'active' : ''}`}
            onClick={() => applyEffect('glow')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Glow
          </button>
          <button
            className={`effect-btn ${textEffects.gradient ? 'active' : ''}`}
            onClick={() => applyEffect('gradient')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Gradient
          </button>
          <button
            className="effect-btn"
            onClick={() => applyEffect('3d')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            3D
          </button>
        </div>

        {/* Outline Settings */}
        {textEffects.outline && (
          <div className="effect-settings">
            <div className="control-group">
              <label>Outline Width: {textEffects.outlineWidth}px</label>
              <input
                type="range"
                min="1"
                max="20"
                value={textEffects.outlineWidth}
                onChange={(e) => setTextEffects(prev => ({ ...prev, outlineWidth: parseInt(e.target.value) }))}
              />
            </div>
            <div className="control-group">
              <label>Outline Color:</label>
              <input
                type="color"
                value={textEffects.outlineColor}
                onChange={(e) => setTextEffects(prev => ({ ...prev, outlineColor: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Shadow Settings */}
        {textEffects.shadow && (
          <div className="effect-settings">
            <div className="control-group">
              <label>Shadow Blur: {textEffects.shadowBlur}px</label>
              <input
                type="range"
                min="0"
                max="50"
                value={textEffects.shadowBlur}
                onChange={(e) => setTextEffects(prev => ({ ...prev, shadowBlur: parseInt(e.target.value) }))}
              />
            </div>
            <div className="control-group">
              <label>Offset X: {textEffects.shadowOffsetX}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={textEffects.shadowOffsetX}
                onChange={(e) => setTextEffects(prev => ({ ...prev, shadowOffsetX: parseInt(e.target.value) }))}
              />
            </div>
            <div className="control-group">
              <label>Offset Y: {textEffects.shadowOffsetY}px</label>
              <input
                type="range"
                min="-50"
                max="50"
                value={textEffects.shadowOffsetY}
                onChange={(e) => setTextEffects(prev => ({ ...prev, shadowOffsetY: parseInt(e.target.value) }))}
              />
            </div>
          </div>
        )}

        {/* Gradient Settings */}
        {textEffects.gradient && (
          <div className="effect-settings">
            <div className="control-group">
              <label>Gradient Type:</label>
              <select
                value={textEffects.gradientType}
                onChange={(e) => setTextEffects(prev => ({ ...prev, gradientType: e.target.value }))}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>
            <div className="control-group">
              <label>Start Color:</label>
              <input
                type="color"
                value={textEffects.gradientStart}
                onChange={(e) => setTextEffects(prev => ({ ...prev, gradientStart: e.target.value }))}
              />
            </div>
            <div className="control-group">
              <label>End Color:</label>
              <input
                type="color"
                value={textEffects.gradientEnd}
                onChange={(e) => setTextEffects(prev => ({ ...prev, gradientEnd: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Position Controls */}
      <div className="text-position">
        <h4>Position</h4>
        <div className="position-buttons">
          <button
            onClick={() => centerText('horizontal')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Center H
          </button>
          <button
            onClick={() => centerText('vertical')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Center V
          </button>
          <button
            onClick={() => centerText('both')}
            disabled={!activeObject || activeObject.type !== 'i-text'}
          >
            Center Both
          </button>
        </div>
      </div>

      <div className="text-info">
        <p>💡 Double-click text on canvas to edit</p>
        <p>✨ Use presets for quick styling</p>
      </div>
    </div>
  );
};

export default TextPanel;
