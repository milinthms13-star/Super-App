import React from 'react';
import { FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';

const CanvasWorkspace = ({
  canvasRef,
  zoom,
  onZoom,
  onFitScreen,
  canvasSize,
  loading
}) => {
  const handleZoomIn = () => {
    onZoom(zoom + 10);
  };

  const handleZoomOut = () => {
    onZoom(zoom - 10);
  };

  const handleZoomChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 10 && value <= 3200) {
      onZoom(value);
    }
  };

  return (
    <div className="canvas-workspace">
      <div className="canvas-controls">
        <div className="zoom-controls">
          <button
            className="zoom-button"
            onClick={handleZoomOut}
            disabled={zoom <= 10}
            title="Zoom Out (Ctrl+-)"
          >
            <FiZoomOut />
          </button>

          <div className="zoom-input-group">
            <input
              type="number"
              className="zoom-input"
              value={zoom}
              onChange={handleZoomChange}
              min="10"
              max="3200"
            />
            <span>%</span>
          </div>

          <button
            className="zoom-button"
            onClick={handleZoomIn}
            disabled={zoom >= 3200}
            title="Zoom In (Ctrl++)"
          >
            <FiZoomIn />
          </button>

          <button
            className="zoom-button"
            onClick={onFitScreen}
            title="Fit to Screen (Ctrl+0)"
          >
            <FiMaximize2 />
          </button>

          <div className="zoom-presets">
            <button onClick={() => onZoom(25)}>25%</button>
            <button onClick={() => onZoom(50)}>50%</button>
            <button onClick={() => onZoom(100)}>100%</button>
            <button onClick={() => onZoom(200)}>200%</button>
          </div>
        </div>
      </div>

      <div className="canvas-container">
        <div className="canvas-background">
          <canvas
            ref={canvasRef}
            className="fabric-canvas"
          />
        </div>

        {loading && (
          <div className="canvas-loading">
            <div className="spinner"></div>
            <p>Loading...</p>
          </div>
        )}
      </div>

      <div className="canvas-info">
        <span>{canvasSize.width} × {canvasSize.height} px</span>
      </div>
    </div>
  );
};

export default CanvasWorkspace;
