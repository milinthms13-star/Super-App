import React from 'react';
import { 
  FiMousePointer, 
  FiSquare, 
  FiCircle, 
  FiCrop,
  FiEdit3,
  FiType,
  FiDroplet,
  FiMove,
  FiZoomIn,
  FiHand
} from 'react-icons/fi';

const tools = [
  { id: 'select', name: 'Move Tool', icon: FiMousePointer, shortcut: 'V' },
  { id: 'marquee', name: 'Marquee Select', icon: FiSquare, shortcut: 'M' },
  { id: 'lasso', name: 'Lasso Tool', icon: FiCircle, shortcut: 'L' },
  { id: 'wand', name: 'Magic Wand', icon: FiDroplet, shortcut: 'W' },
  { id: 'crop', name: 'Crop Tool', icon: FiCrop, shortcut: 'C' },
  { id: 'brush', name: 'Brush Tool', icon: FiEdit3, shortcut: 'B' },
  { id: 'eraser', name: 'Eraser Tool', icon: FiEdit3, shortcut: 'E' },
  { id: 'text', name: 'Text Tool', icon: FiType, shortcut: 'T' },
  { id: 'hand', name: 'Hand Tool', icon: FiHand, shortcut: 'H' },
  { id: 'zoom', name: 'Zoom Tool', icon: FiZoomIn, shortcut: 'Z' },
];

const ToolsPanel = ({ activeTool, onToolChange }) => {
  return (
    <div className="tools-panel">
      <div className="panel-header">
        <h3>Tools</h3>
      </div>
      
      <div className="tools-grid">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`tool-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => onToolChange(tool.id)}
              title={`${tool.name} (${tool.shortcut})`}
            >
              <Icon size={20} />
              <span className="tool-name">{tool.name}</span>
              <span className="tool-shortcut">{tool.shortcut}</span>
            </button>
          );
        })}
      </div>

      <div className="tool-options">
        {activeTool === 'brush' && (
          <div className="brush-options">
            <h4>Brush Options</h4>
            <div className="option-group">
              <label>Size:</label>
              <input type="range" min="1" max="100" defaultValue="10" />
            </div>
            <div className="option-group">
              <label>Hardness:</label>
              <input type="range" min="0" max="100" defaultValue="100" />
            </div>
            <div className="option-group">
              <label>Opacity:</label>
              <input type="range" min="0" max="100" defaultValue="100" />
            </div>
          </div>
        )}

        {activeTool === 'text' && (
          <div className="text-options">
            <h4>Text Options</h4>
            <div className="option-group">
              <label>Font:</label>
              <select>
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier</option>
                <option>Georgia</option>
              </select>
            </div>
            <div className="option-group">
              <label>Size:</label>
              <input type="number" min="8" max="200" defaultValue="48" />
            </div>
          </div>
        )}

        {activeTool === 'marquee' && (
          <div className="marquee-options">
            <h4>Selection Options</h4>
            <div className="option-group">
              <label>Shape:</label>
              <select>
                <option>Rectangle</option>
                <option>Ellipse</option>
              </select>
            </div>
            <div className="option-group">
              <label>Feather:</label>
              <input type="number" min="0" max="250" defaultValue="0" />
            </div>
          </div>
        )}
      </div>

      <div className="color-picker-section">
        <h4>Colors</h4>
        <div className="color-swatches">
          <div className="color-swatch-container">
            <label>Foreground:</label>
            <input type="color" defaultValue="#000000" className="color-input" />
          </div>
          <div className="color-swatch-container">
            <label>Background:</label>
            <input type="color" defaultValue="#ffffff" className="color-input" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsPanel;
