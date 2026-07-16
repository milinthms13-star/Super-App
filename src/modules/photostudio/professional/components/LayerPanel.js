import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiUnlock, FiTrash2, FiCopy, FiPlus } from 'react-icons/fi';

const LayerPanel = ({
  layers,
  activeLayer,
  onSelectLayer,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onToggleVisibility,
  onToggleLock,
  onReorderLayers,
  onMergeLayers,
  onUpdateProperty
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    onReorderLayers(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleNameEdit = (layer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const handleNameSubmit = (layerId) => {
    if (editingName.trim()) {
      onUpdateProperty(layerId, 'name', editingName.trim());
    }
    setEditingLayerId(null);
  };

  const handleAddNewLayer = (type) => {
    onAddLayer(type);
  };

  return (
    <div className="layer-panel">
      <div className="panel-header">
        <h3>Layers</h3>
        <div className="layer-actions">
          <button 
            onClick={() => handleAddNewLayer('empty')}
            title="Add new layer"
            className="icon-button"
          >
            <FiPlus />
          </button>
        </div>
      </div>

      <div className="layer-add-menu">
        <button onClick={() => handleAddNewLayer('empty')}>Empty Layer</button>
        <button onClick={() => handleAddNewLayer('text')}>Text Layer</button>
        <button onClick={() => handleAddNewLayer('shape')}>Shape Layer</button>
      </div>

      <div className="layers-list">
        {layers.length === 0 ? (
          <div className="empty-state">
            <p>No layers yet</p>
            <button onClick={() => handleAddNewLayer('empty')}>
              Create First Layer
            </button>
          </div>
        ) : (
          layers.slice().reverse().map((layer, index) => {
            const actualIndex = layers.length - 1 - index;
            const isActive = layer.id === activeLayer;
            const isEditing = editingLayerId === layer.id;

            return (
              <div
                key={layer.id}
                className={`layer-item ${isActive ? 'active' : ''} ${layer.locked ? 'locked' : ''}`}
                draggable={!layer.locked}
                onDragStart={(e) => handleDragStart(e, actualIndex)}
                onDragOver={(e) => handleDragOver(e, actualIndex)}
                onDragEnd={handleDragEnd}
                onClick={() => !isEditing && onSelectLayer(layer.id)}
              >
                <div className="layer-controls">
                  <button
                    className="icon-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <FiEye /> : <FiEyeOff />}
                  </button>
                  
                  <button
                    className="icon-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock(layer.id);
                    }}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? <FiLock /> : <FiUnlock />}
                  </button>
                </div>

                <div className="layer-preview">
                  <div className="layer-thumbnail" style={{
                    opacity: layer.opacity / 100,
                    backgroundColor: layer.type === 'shape' ? '#ff6b6b' : '#e9ecef'
                  }}>
                    {layer.type === 'text' && 'T'}
                    {layer.type === 'shape' && '▢'}
                    {layer.type === 'image' && '🖼'}
                  </div>
                </div>

                <div className="layer-info">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleNameSubmit(layer.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSubmit(layer.id);
                        if (e.key === 'Escape') setEditingLayerId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className="layer-name-input"
                    />
                  ) : (
                    <span 
                      className="layer-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleNameEdit(layer);
                      }}
                    >
                      {layer.name}
                    </span>
                  )}
                  <span className="layer-type">{layer.type}</span>
                </div>

                <div className="layer-actions">
                  <button
                    className="icon-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateLayer(layer.id);
                    }}
                    title="Duplicate layer"
                  >
                    <FiCopy />
                  </button>
                  
                  <button
                    className="icon-button delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                    }}
                    title="Delete layer"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="layer-panel-footer">
        <div className="blend-mode-selector">
          <label>Blend:</label>
          <select 
            value={layers.find(l => l.id === activeLayer)?.blendMode || 'normal'}
            onChange={(e) => activeLayer && onUpdateProperty(activeLayer, 'blendMode', e.target.value)}
            disabled={!activeLayer}
          >
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </div>

        <div className="opacity-slider">
          <label>Opacity:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={layers.find(l => l.id === activeLayer)?.opacity || 100}
            onChange={(e) => activeLayer && onUpdateProperty(activeLayer, 'opacity', parseInt(e.target.value))}
            disabled={!activeLayer}
          />
          <span>{layers.find(l => l.id === activeLayer)?.opacity || 100}%</span>
        </div>
      </div>
    </div>
  );
};

export default LayerPanel;
