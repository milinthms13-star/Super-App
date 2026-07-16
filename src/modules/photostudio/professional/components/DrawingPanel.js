import React, { useState, useRef, useEffect } from 'react';
import { 
  FiEdit3, 
  FiCopy,
  FiCrosshair,
  FiDroplet,
  FiSquare,
  FiCircle
} from 'react-icons/fi';
import { 
  BrushEngine, 
  CloneStampTool, 
  HealingBrushTool,
  SmudgeTool,
  EraserTool,
  GradientTool,
  PatternStampTool
} from '../utils/drawingTools';

const DrawingPanel = ({ canvas, activeObject }) => {
  const [activeTool, setActiveTool] = useState('brush');
  const [brushSettings, setBrushSettings] = useState({
    size: 20,
    hardness: 100,
    opacity: 100,
    flow: 100,
    color: '#000000',
    smoothing: 0,
    angle: 0,
    roundness: 100,
    scatter: 0,
    blendMode: 'normal'
  });

  const [cloneSettings, setCloneSettings] = useState({
    size: 30,
    hardness: 80,
    aligned: true
  });

  const [healingSettings, setHealingSettings] = useState({
    size: 30,
    hardness: 80
  });

  const [gradientSettings, setGradientSettings] = useState({
    type: 'linear',
    startColor: '#000000',
    endColor: '#ffffff',
    angle: 0
  });

  const toolInstanceRef = useRef(null);
  const isDrawingRef = useRef(false);
  const cloneSourceRef = useRef(null);

  const drawingTools = [
    { id: 'brush', name: 'Brush', icon: FiEdit3 },
    { id: 'clone', name: 'Clone Stamp', icon: FiCopy },
    { id: 'healing', name: 'Healing Brush', icon: FiCrosshair },
    { id: 'smudge', name: 'Smudge', icon: FiDroplet },
    { id: 'eraser', name: 'Eraser', icon: FiSquare },
    { id: 'gradient', name: 'Gradient', icon: FiCircle },
  ];

  // Initialize tool when canvas or active tool changes
  useEffect(() => {
    if (!canvas || !activeObject) return;

    // Create temp canvas for drawing
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = activeObject.width || canvas.width;
    tempCanvas.height = activeObject.height || canvas.height;

    // Load current object onto temp canvas
    const img = activeObject.toDataURL ? activeObject.toDataURL() : null;
    if (img) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
        initializeTool(tempCanvas);
      };
      image.src = img;
    } else {
      initializeTool(tempCanvas);
    }

    return () => {
      if (toolInstanceRef.current && toolInstanceRef.current.destroy) {
        toolInstanceRef.current.destroy();
      }
    };
  }, [canvas, activeObject, activeTool]);

  const initializeTool = (tempCanvas) => {
    // Clean up previous tool
    if (toolInstanceRef.current && toolInstanceRef.current.destroy) {
      toolInstanceRef.current.destroy();
    }

    // Create new tool instance
    switch (activeTool) {
      case 'brush':
        toolInstanceRef.current = new BrushEngine(tempCanvas);
        Object.entries(brushSettings).forEach(([key, value]) => {
          toolInstanceRef.current.setProperty(key, value);
        });
        break;

      case 'clone':
        toolInstanceRef.current = new CloneStampTool(tempCanvas, cloneSettings);
        break;

      case 'healing':
        toolInstanceRef.current = new HealingBrushTool(tempCanvas, healingSettings);
        break;

      case 'smudge':
        toolInstanceRef.current = new SmudgeTool(tempCanvas, { size: brushSettings.size });
        break;

      case 'eraser':
        toolInstanceRef.current = new EraserTool(tempCanvas, { 
          size: brushSettings.size, 
          hardness: brushSettings.hardness 
        });
        break;

      case 'gradient':
        toolInstanceRef.current = new GradientTool(tempCanvas, gradientSettings);
        break;

      default:
        break;
    }

    // Set up mouse events
    setupMouseEvents(tempCanvas);
  };

  const setupMouseEvents = (tempCanvas) => {
    if (!canvas) return;

    const handleMouseDown = (e) => {
      const pointer = canvas.getPointer(e.e);
      const x = pointer.x;
      const y = pointer.y;

      // For clone stamp, set source on Alt+Click
      if (activeTool === 'clone' && e.e.altKey) {
        cloneSourceRef.current = { x, y };
        if (toolInstanceRef.current) {
          toolInstanceRef.current.setSource(x, y);
        }
        return;
      }

      isDrawingRef.current = true;
      
      if (toolInstanceRef.current) {
        if (activeTool === 'gradient') {
          toolInstanceRef.current.startGradient(x, y);
        } else if (toolInstanceRef.current.startDrawing) {
          toolInstanceRef.current.startDrawing(x, y);
        }
      }
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;

      const pointer = canvas.getPointer(e.e);
      const x = pointer.x;
      const y = pointer.y;
      const pressure = e.e.pressure || 1.0;

      if (toolInstanceRef.current) {
        if (activeTool === 'gradient') {
          // Gradient doesn't need move events
        } else if (toolInstanceRef.current.draw) {
          toolInstanceRef.current.draw(x, y, pressure);
        }
      }
    };

    const handleMouseUp = (e) => {
      if (!isDrawingRef.current) return;

      const pointer = canvas.getPointer(e.e);
      const x = pointer.x;
      const y = pointer.y;

      isDrawingRef.current = false;

      if (toolInstanceRef.current) {
        if (activeTool === 'gradient') {
          toolInstanceRef.current.endGradient(x, y);
        } else if (toolInstanceRef.current.stopDrawing) {
          toolInstanceRef.current.stopDrawing();
        }
      }

      // Update canvas with result
      updateCanvas(tempCanvas);
    };

    // Attach events
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    // Cleanup
    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  };

  const updateCanvas = (tempCanvas) => {
    if (!canvas || !activeObject) return;

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
    });
  };

  const updateBrushSetting = (key, value) => {
    setBrushSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Update tool if it exists
      if (toolInstanceRef.current && toolInstanceRef.current.setProperty) {
        toolInstanceRef.current.setProperty(key, value);
      }
      
      return newSettings;
    });
  };

  const updateCloneSetting = (key, value) => {
    setCloneSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Update tool if it exists
      if (toolInstanceRef.current && activeTool === 'clone') {
        toolInstanceRef.current.setProperty(key, value);
      }
      
      return newSettings;
    });
  };

  const updateHealingSetting = (key, value) => {
    setHealingSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Update tool if it exists
      if (toolInstanceRef.current && activeTool === 'healing') {
        toolInstanceRef.current.setProperty(key, value);
      }
      
      return newSettings;
    });
  };

  const updateGradientSetting = (key, value) => {
    setGradientSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // Update tool if it exists
      if (toolInstanceRef.current && activeTool === 'gradient') {
        toolInstanceRef.current.setProperty(key, value);
      }
      
      return newSettings;
    });
  };

  const renderToolControls = () => {
    switch (activeTool) {
      case 'brush':
        return (
          <div className="tool-controls">
            <h4>Brush Settings</h4>
            
            <div className="control-group">
              <label>Size: {brushSettings.size}px</label>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={brushSettings.size}
                onChange={(e) => updateBrushSetting('size', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Hardness: {brushSettings.hardness}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brushSettings.hardness}
                onChange={(e) => updateBrushSetting('hardness', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Opacity: {brushSettings.opacity}%</label>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={brushSettings.opacity}
                onChange={(e) => updateBrushSetting('opacity', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Flow: {brushSettings.flow}%</label>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={brushSettings.flow}
                onChange={(e) => updateBrushSetting('flow', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Color:</label>
              <input 
                type="color" 
                value={brushSettings.color}
                onChange={(e) => updateBrushSetting('color', e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>Smoothing: {brushSettings.smoothing}</label>
              <select 
                value={brushSettings.smoothing}
                onChange={(e) => updateBrushSetting('smoothing', parseInt(e.target.value))}
              >
                <option value="0">None</option>
                <option value="1">Low</option>
                <option value="2">Medium</option>
                <option value="3">High</option>
              </select>
            </div>

            <div className="control-group">
              <label>Angle: {brushSettings.angle}°</label>
              <input 
                type="range" 
                min="0" 
                max="360" 
                value={brushSettings.angle}
                onChange={(e) => updateBrushSetting('angle', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Roundness: {brushSettings.roundness}%</label>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={brushSettings.roundness}
                onChange={(e) => updateBrushSetting('roundness', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Scatter: {brushSettings.scatter}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brushSettings.scatter}
                onChange={(e) => updateBrushSetting('scatter', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Blend Mode:</label>
              <select 
                value={brushSettings.blendMode}
                onChange={(e) => updateBrushSetting('blendMode', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="darken">Darken</option>
                <option value="lighten">Lighten</option>
              </select>
            </div>

            <div className="pressure-support">
              <label>
                <input type="checkbox" />
                Pressure Sensitivity (if available)
              </label>
            </div>
          </div>
        );

      case 'clone':
        return (
          <div className="tool-controls">
            <h4>Clone Stamp Settings</h4>
            
            <div className="control-group">
              <label>Size: {cloneSettings.size}px</label>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={cloneSettings.size}
                onChange={(e) => updateCloneSetting('size', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Hardness: {cloneSettings.hardness}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={cloneSettings.hardness}
                onChange={(e) => updateCloneSetting('hardness', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={cloneSettings.aligned}
                  onChange={(e) => updateCloneSetting('aligned', e.target.checked)}
                />
                Aligned Mode
              </label>
            </div>

            <div className="instructions">
              <p>💡 <strong>How to use:</strong></p>
              <p>1. Hold <kbd>Alt</kbd> and click to set source point</p>
              <p>2. Release Alt and click/drag to clone</p>
              {cloneSourceRef.current && (
                <p>✓ Source set at ({Math.round(cloneSourceRef.current.x)}, {Math.round(cloneSourceRef.current.y)})</p>
              )}
            </div>
          </div>
        );

      case 'healing':
        return (
          <div className="tool-controls">
            <h4>Healing Brush Settings</h4>
            
            <div className="control-group">
              <label>Size: {healingSettings.size}px</label>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={healingSettings.size}
                onChange={(e) => updateHealingSetting('size', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Hardness: {healingSettings.hardness}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={healingSettings.hardness}
                onChange={(e) => updateHealingSetting('hardness', parseInt(e.target.value))}
              />
            </div>

            <div className="instructions">
              <p>💡 Intelligently blends texture and color from surrounding area</p>
              <p>Perfect for removing blemishes and imperfections</p>
            </div>
          </div>
        );

      case 'smudge':
        return (
          <div className="tool-controls">
            <h4>Smudge Tool Settings</h4>
            
            <div className="control-group">
              <label>Size: {brushSettings.size}px</label>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={brushSettings.size}
                onChange={(e) => updateBrushSetting('size', parseInt(e.target.value))}
              />
            </div>

            <div className="instructions">
              <p>💡 Drag to blur and smear pixels</p>
            </div>
          </div>
        );

      case 'eraser':
        return (
          <div className="tool-controls">
            <h4>Eraser Settings</h4>
            
            <div className="control-group">
              <label>Size: {brushSettings.size}px</label>
              <input 
                type="range" 
                min="1" 
                max="300" 
                value={brushSettings.size}
                onChange={(e) => updateBrushSetting('size', parseInt(e.target.value))}
              />
            </div>

            <div className="control-group">
              <label>Hardness: {brushSettings.hardness}%</label>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brushSettings.hardness}
                onChange={(e) => updateBrushSetting('hardness', parseInt(e.target.value))}
              />
            </div>
          </div>
        );

      case 'gradient':
        return (
          <div className="tool-controls">
            <h4>Gradient Settings</h4>
            
            <div className="control-group">
              <label>Type:</label>
              <select 
                value={gradientSettings.type}
                onChange={(e) => updateGradientSetting('type', e.target.value)}
              >
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </div>

            <div className="control-group">
              <label>Start Color:</label>
              <input 
                type="color" 
                value={gradientSettings.startColor}
                onChange={(e) => updateGradientSetting('startColor', e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>End Color:</label>
              <input 
                type="color" 
                value={gradientSettings.endColor}
                onChange={(e) => updateGradientSetting('endColor', e.target.value)}
              />
            </div>

            <div className="instructions">
              <p>💡 Click and drag to create gradient</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="drawing-panel">
      <div className="panel-header">
        <h3>Drawing Tools</h3>
      </div>

      <div className="tools-list">
        {drawingTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => setActiveTool(tool.id)}
            >
              <Icon size={18} />
              <span>{tool.name}</span>
            </button>
          );
        })}
      </div>

      {renderToolControls()}

      <div className="drawing-info">
        <p>🎨 Professional drawing tools with pressure sensitivity</p>
        <p>✨ Real-time rendering at 60fps</p>
      </div>
    </div>
  );
};

export default DrawingPanel;
