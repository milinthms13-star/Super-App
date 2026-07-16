import React, { useState, useRef } from 'react';
import { FiFile, FiFolderPlus, FiSave, FiDownload, FiRotateCcw, FiRotateCw } from 'react-icons/fi';

const TopMenuBar = ({
  projectName,
  onNew,
  onOpen,
  onSave,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isDirty
}) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const fileInputRef = useRef(null);

  const menus = {
    file: [
      { label: 'New', action: onNew, shortcut: 'Ctrl+N' },
      { label: 'Open', action: () => fileInputRef.current?.click(), shortcut: 'Ctrl+O' },
      { label: 'Save', action: onSave, shortcut: 'Ctrl+S' },
      { label: 'divider' },
      { label: 'Export', action: () => setShowExportDialog(true), shortcut: 'Ctrl+E' },
    ],
    edit: [
      { label: 'Undo', action: onUndo, shortcut: 'Ctrl+Z', disabled: !canUndo },
      { label: 'Redo', action: onRedo, shortcut: 'Ctrl+Y', disabled: !canRedo },
      { label: 'divider' },
      { label: 'Cut', shortcut: 'Ctrl+X' },
      { label: 'Copy', shortcut: 'Ctrl+C' },
      { label: 'Paste', shortcut: 'Ctrl+V' },
      { label: 'divider' },
      { label: 'Select All', shortcut: 'Ctrl+A' },
      { label: 'Deselect', shortcut: 'Ctrl+D' },
    ],
    image: [
      { label: 'Image Size...' },
      { label: 'Canvas Size...' },
      { label: 'divider' },
      { label: 'Rotate 90° Clockwise' },
      { label: 'Rotate 90° Counter-Clockwise' },
      { label: 'Flip Horizontal' },
      { label: 'Flip Vertical' },
    ],
    layer: [
      { label: 'New Layer', shortcut: 'Ctrl+Shift+N' },
      { label: 'Duplicate Layer', shortcut: 'Ctrl+J' },
      { label: 'Delete Layer' },
      { label: 'divider' },
      { label: 'Merge Down', shortcut: 'Ctrl+E' },
      { label: 'Flatten Image', shortcut: 'Ctrl+Shift+E' },
    ],
    select: [
      { label: 'All', shortcut: 'Ctrl+A' },
      { label: 'Deselect', shortcut: 'Ctrl+D' },
      { label: 'Inverse', shortcut: 'Ctrl+Shift+I' },
      { label: 'divider' },
      { label: 'Feather...' },
      { label: 'Expand...' },
      { label: 'Contract...' },
    ],
    filter: [
      { label: 'Blur' },
      { label: 'Sharpen' },
      { label: 'divider' },
      { label: 'Brightness/Contrast' },
      { label: 'Hue/Saturation', shortcut: 'Ctrl+U' },
      { label: 'Levels', shortcut: 'Ctrl+L' },
      { label: 'Curves', shortcut: 'Ctrl+M' },
    ],
    view: [
      { label: 'Zoom In', shortcut: 'Ctrl++' },
      { label: 'Zoom Out', shortcut: 'Ctrl+-' },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0' },
      { label: '100%', shortcut: 'Ctrl+1' },
      { label: 'divider' },
      { label: 'Show Rulers', shortcut: 'Ctrl+R' },
      { label: 'Show Grid' },
      { label: 'Show Guides' },
    ],
  };

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuItemClick = (item) => {
    if (item.action) {
      item.action();
    }
    setActiveMenu(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpen(file);
    }
  };

  const handleExport = (format, quality) => {
    onExport(format, quality);
    setShowExportDialog(false);
  };

  return (
    <div className="top-menu-bar">
      <div className="menu-section">
        <div className="app-title">
          <span className="app-icon">📸</span>
          <span>Professional Photo Studio</span>
        </div>

        <div className="menu-items">
          {Object.keys(menus).map((menuName) => (
            <div key={menuName} className="menu-item">
              <button
                className={`menu-button ${activeMenu === menuName ? 'active' : ''}`}
                onClick={() => handleMenuClick(menuName)}
              >
                {menuName.charAt(0).toUpperCase() + menuName.slice(1)}
              </button>

              {activeMenu === menuName && (
                <div className="dropdown-menu">
                  {menus[menuName].map((item, index) => (
                    item.label === 'divider' ? (
                      <div key={index} className="menu-divider" />
                    ) : (
                      <button
                        key={index}
                        className={`dropdown-item ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => !item.disabled && handleMenuItemClick(item)}
                        disabled={item.disabled}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="shortcut">{item.shortcut}</span>
                        )}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="project-info">
        <span className="project-name">{projectName}</span>
        {isDirty && <span className="dirty-indicator">●</span>}
      </div>

      <div className="quick-actions">
        <button
          className="icon-button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <FiRotateCcw />
        </button>
        <button
          className="icon-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <FiRotateCw />
        </button>
        <div className="divider" />
        <button
          className="icon-button"
          onClick={onSave}
          title="Save (Ctrl+S)"
        >
          <FiSave />
        </button>
        <button
          className="icon-button"
          onClick={() => setShowExportDialog(true)}
          title="Export"
        >
          <FiDownload />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {showExportDialog && (
        <div className="modal-overlay" onClick={() => setShowExportDialog(false)}>
          <div className="export-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Export Image</h3>
            
            <div className="export-options">
              <div className="export-format">
                <h4>Format</h4>
                <div className="format-buttons">
                  <button onClick={() => handleExport('png', 1.0)} className="format-btn">
                    PNG
                    <span className="format-desc">High quality, transparency</span>
                  </button>
                  <button onClick={() => handleExport('jpeg', 0.92)} className="format-btn">
                    JPEG
                    <span className="format-desc">Smaller file size</span>
                  </button>
                  <button onClick={() => handleExport('webp', 0.9)} className="format-btn">
                    WebP
                    <span className="format-desc">Modern format</span>
                  </button>
                </div>
              </div>

              <div className="export-quality">
                <h4>Quality</h4>
                <div className="quality-buttons">
                  <button onClick={() => handleExport('png', 0.7)} className="quality-btn">
                    Standard
                    <span className="quality-desc">1x resolution</span>
                  </button>
                  <button onClick={() => handleExport('png', 1.0)} className="quality-btn primary">
                    HD
                    <span className="quality-desc">2x resolution</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="dialog-actions">
              <button onClick={() => setShowExportDialog(false)} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {activeMenu && (
        <div
          className="menu-overlay"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
};

export default TopMenuBar;
