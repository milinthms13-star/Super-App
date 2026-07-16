import React, { useState, useEffect } from 'react';

const PropertiesPanel = ({ canvas, activeLayer, layers, onUpdateProperty }) => {
  const [properties, setProperties] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  });

  useEffect(() => {
    if (!canvas || !activeLayer) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      setProperties({
        x: Math.round(activeObject.left || 0),
        y: Math.round(activeObject.top || 0),
        width: Math.round(activeObject.width * (activeObject.scaleX || 1)),
        height: Math.round(activeObject.height * (activeObject.scaleY || 1)),
        rotation: Math.round(activeObject.angle || 0),
        scaleX: activeObject.scaleX || 1,
        scaleY: activeObject.scaleY || 1
      });
    }

    const handleObjectModified = () => {
      const obj = canvas.getActiveObject();
      if (obj) {
        setProperties({
          x: Math.round(obj.left || 0),
          y: Math.round(obj.top || 0),
          width: Math.round(obj.width * (obj.scaleX || 1)),
          height: Math.round(obj.height * (obj.scaleY || 1)),
          rotation: Math.round(obj.angle || 0),
          scaleX: obj.scaleX || 1,
          scaleY: obj.scaleY || 1
        });
      }
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:moving', handleObjectModified);
    canvas.on('object:scaling', handleObjectModified);
    canvas.on('object:rotating', handleObjectModified);

    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:moving', handleObjectModified);
      canvas.off('object:scaling', handleObjectModified);
      canvas.off('object:rotating', handleObjectModified);
    };
  }, [canvas, activeLayer]);

  const handlePropertyChange = (property, value) => {
    if (!canvas || !activeLayer) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      switch (property) {
        case 'x':
          activeObject.set('left', parseFloat(value));
          break;
        case 'y':
          activeObject.set('top', parseFloat(value));
          break;
        case 'width':
          activeObject.set('scaleX', parseFloat(value) / activeObject.width);
          break;
        case 'height':
          activeObject.set('scaleY', parseFloat(value) / activeObject.height);
          break;
        case 'rotation':
          activeObject.set('angle', parseFloat(value));
          break;
        default:
          break;
      }
      activeObject.setCoords();
      canvas.renderAll();
    }
  };

  const layer = layers.find(l => l.id === activeLayer);

  if (!activeLayer || !layer) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <h3>Properties</h3>
        </div>
        <div className="empty-state">
          <p>Select a layer to view properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h3>Properties</h3>
      </div>

      <div className="properties-content">
        <div className="property-section">
          <h4>Transform</h4>
          
          <div className="property-row">
            <label>X:</label>
            <input
              type="number"
              value={properties.x}
              onChange={(e) => {
                setProperties({ ...properties, x: parseFloat(e.target.value) });
                handlePropertyChange('x', e.target.value);
              }}
            />
            <span>px</span>
          </div>

          <div className="property-row">
            <label>Y:</label>
            <input
              type="number"
              value={properties.y}
              onChange={(e) => {
                setProperties({ ...properties, y: parseFloat(e.target.value) });
                handlePropertyChange('y', e.target.value);
              }}
            />
            <span>px</span>
          </div>

          <div className="property-row">
            <label>Width:</label>
            <input
              type="number"
              value={properties.width}
              onChange={(e) => {
                setProperties({ ...properties, width: parseFloat(e.target.value) });
                handlePropertyChange('width', e.target.value);
              }}
            />
            <span>px</span>
          </div>

          <div className="property-row">
            <label>Height:</label>
            <input
              type="number"
              value={properties.height}
              onChange={(e) => {
                setProperties({ ...properties, height: parseFloat(e.target.value) });
                handlePropertyChange('height', e.target.value);
              }}
            />
            <span>px</span>
          </div>

          <div className="property-row">
            <label>Rotation:</label>
            <input
              type="number"
              value={properties.rotation}
              onChange={(e) => {
                setProperties({ ...properties, rotation: parseFloat(e.target.value) });
                handlePropertyChange('rotation', e.target.value);
              }}
              min="0"
              max="360"
            />
            <span>°</span>
          </div>
        </div>

        <div className="property-section">
          <h4>Layer Info</h4>
          
          <div className="property-row">
            <label>Type:</label>
            <span className="property-value">{layer.type}</span>
          </div>

          <div className="property-row">
            <label>Visible:</label>
            <span className="property-value">{layer.visible ? 'Yes' : 'No'}</span>
          </div>

          <div className="property-row">
            <label>Locked:</label>
            <span className="property-value">{layer.locked ? 'Yes' : 'No'}</span>
          </div>
        </div>

        {layer.type === 'text' && (
          <div className="property-section">
            <h4>Text Properties</h4>
            
            <div className="property-row">
              <label>Font Family:</label>
              <select>
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier</option>
                <option>Georgia</option>
              </select>
            </div>

            <div className="property-row">
              <label>Font Size:</label>
              <input type="number" min="8" max="200" defaultValue="48" />
              <span>px</span>
            </div>

            <div className="property-row">
              <label>Color:</label>
              <input type="color" defaultValue="#000000" />
            </div>

            <div className="property-row">
              <label>Alignment:</label>
              <select>
                <option>Left</option>
                <option>Center</option>
                <option>Right</option>
                <option>Justify</option>
              </select>
            </div>
          </div>
        )}

        <div className="property-section">
          <h4>Quick Actions</h4>
          <button className="action-button">Flip Horizontal</button>
          <button className="action-button">Flip Vertical</button>
          <button className="action-button">Rotate 90° CW</button>
          <button className="action-button">Rotate 90° CCW</button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
