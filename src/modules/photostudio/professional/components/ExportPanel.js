import React, { useState, useRef, useEffect } from 'react';
import { 
  FiDownload, 
  FiLayers,
  FiGrid,
  FiMaximize2,
  FiImage,
  FiPackage
} from 'react-icons/fi';
import { ExportManager } from '../utils/exportTools';

const ExportPanel = ({ canvas, projectName = 'export' }) => {
  const [exportType, setExportType] = useState('single');
  const [exportSettings, setExportSettings] = useState({
    format: 'png',
    quality: 1.0,
    multiplier: 1,
    filename: projectName,
  });

  const [batchSettings, setBatchSettings] = useState({
    formats: ['png', 'jpeg', 'webp'],
    selectedFormats: ['png'],
  });

  const [sizeSettings, setSizeSettings] = useState({
    preset: 'custom',
    customWidth: 1920,
    customHeight: 1080,
    maintainAspect: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const exportManagerRef = useRef(null);

  useEffect(() => {
    if (canvas && !exportManagerRef.current) {
      exportManagerRef.current = new ExportManager(canvas);
    }

    return () => {
      if (exportManagerRef.current) {
        exportManagerRef.current.destroy();
      }
    };
  }, [canvas]);

  useEffect(() => {
    setExportSettings(prev => ({ ...prev, filename: projectName }));
  }, [projectName]);

  const exportTypes = [
    { id: 'single', name: 'Single Export', icon: FiImage },
    { id: 'multiple', name: 'Multiple Formats', icon: FiGrid },
    { id: 'sizes', name: 'Multiple Sizes', icon: FiMaximize2 },
    { id: 'layers', name: 'Export Layers', icon: FiLayers },
    { id: 'project', name: 'Save Project', icon: FiPackage },
  ];

  const formatOptions = [
    { value: 'png', label: 'PNG (Lossless)', quality: false },
    { value: 'jpeg', label: 'JPEG (Compressed)', quality: true },
    { value: 'webp', label: 'WebP (Modern)', quality: true },
  ];

  const presets = {
    web: { name: 'Web Optimized', width: 1920, height: 1080, format: 'webp', quality: 0.85 },
    hd: { name: 'Full HD', width: 1920, height: 1080, format: 'png', quality: 1.0 },
    '4k': { name: '4K Ultra HD', width: 3840, height: 2160, format: 'png', quality: 1.0 },
    print: { name: 'Print (300 DPI)', dpi: 300, format: 'png', quality: 1.0 },
    thumbnail: { name: 'Thumbnail', width: 400, height: 400, format: 'jpeg', quality: 0.8 },
    instagram: { name: 'Instagram Post', width: 1080, height: 1080, format: 'jpeg', quality: 0.9 },
    facebook: { name: 'Facebook Post', width: 1200, height: 630, format: 'jpeg', quality: 0.9 },
    twitter: { name: 'Twitter Post', width: 1200, height: 675, format: 'jpeg', quality: 0.9 },
  };

  const socialMediaSizes = [
    { name: 'instagram_post', width: 1080, height: 1080 },
    { name: 'instagram_story', width: 1080, height: 1920 },
    { name: 'facebook_post', width: 1200, height: 630 },
    { name: 'twitter_post', width: 1200, height: 675 },
    { name: 'linkedin_post', width: 1200, height: 627 },
    { name: 'youtube_thumbnail', width: 1280, height: 720 },
  ];

  const handleExport = async () => {
    if (!exportManagerRef.current || !canvas) {
      alert('Canvas not ready for export');
      return;
    }

    setIsExporting(true);
    setExportResult(null);
    setExportProgress({ message: 'Preparing export...', percentage: 0 });

    try {
      let result;

      switch (exportType) {
        case 'single':
          result = await exportManagerRef.current.exportImage(exportSettings);
          break;

        case 'multiple':
          setExportProgress({ message: 'Exporting multiple formats...', percentage: 30 });
          result = await exportManagerRef.current.exportMultipleFormats(
            batchSettings.selectedFormats,
            {
              filename: exportSettings.filename,
              quality: exportSettings.quality,
              multiplier: exportSettings.multiplier,
            }
          );
          break;

        case 'sizes':
          setExportProgress({ message: 'Exporting multiple sizes...', percentage: 30 });
          result = await exportManagerRef.current.exportMultipleSizes(
            socialMediaSizes,
            {
              format: exportSettings.format,
              quality: exportSettings.quality,
              filename: exportSettings.filename,
            }
          );
          break;

        case 'layers':
          setExportProgress({ message: 'Exporting layers...', percentage: 30 });
          result = await exportManagerRef.current.exportLayers({
            format: exportSettings.format,
            quality: exportSettings.quality,
            filename: exportSettings.filename,
          });
          break;

        case 'project':
          result = await exportManagerRef.current.exportProject(exportSettings.filename);
          break;

        default:
          break;
      }

      setExportProgress({ message: 'Export complete!', percentage: 100 });
      setExportResult(result);

      setTimeout(() => {
        setExportProgress(null);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportResult({ success: false, error: error.message });
      setExportProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePresetApply = (presetKey) => {
    const preset = presets[presetKey];
    
    if (preset.dpi) {
      // Print preset with DPI
      exportManagerRef.current.exportForPrint({
        format: preset.format,
        dpi: preset.dpi,
        filename: exportSettings.filename,
      });
    } else if (preset.width && preset.height) {
      // Size preset
      const multiplier = preset.width / canvas.width;
      setExportSettings(prev => ({
        ...prev,
        format: preset.format,
        quality: preset.quality,
        multiplier: multiplier,
      }));
    }
  };

  const estimateSize = () => {
    if (!exportManagerRef.current) return null;

    return exportManagerRef.current.estimateFileSize(
      exportSettings.format,
      exportSettings.quality,
      exportSettings.multiplier
    );
  };

  const sizeEstimate = estimateSize();

  const toggleFormat = (format) => {
    setBatchSettings(prev => {
      const selected = prev.selectedFormats.includes(format)
        ? prev.selectedFormats.filter(f => f !== format)
        : [...prev.selectedFormats, format];
      
      return { ...prev, selectedFormats: selected };
    });
  };

  const renderExportOptions = () => {
    switch (exportType) {
      case 'single':
        return (
          <div className="export-options">
            <h4>Single Export Settings</h4>
            
            <div className="control-group">
              <label>Format:</label>
              <select
                value={exportSettings.format}
                onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value }))}
              >
                {formatOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {['jpeg', 'webp'].includes(exportSettings.format) && (
              <div className="control-group">
                <label>Quality: {Math.round(exportSettings.quality * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={exportSettings.quality}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                />
              </div>
            )}

            <div className="control-group">
              <label>Resolution: {exportSettings.multiplier}x</label>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.5"
                value={exportSettings.multiplier}
                onChange={(e) => setExportSettings(prev => ({ ...prev, multiplier: parseFloat(e.target.value) }))}
              />
              <small>
                Output: {Math.round(canvas?.width * exportSettings.multiplier || 0)} x{' '}
                {Math.round(canvas?.height * exportSettings.multiplier || 0)}px
              </small>
            </div>

            {sizeEstimate && (
              <div className="size-estimate">
                <p>Estimated Size: <strong>{sizeEstimate.mb} MB</strong></p>
              </div>
            )}
          </div>
        );

      case 'multiple':
        return (
          <div className="export-options">
            <h4>Multiple Formats</h4>
            <p className="info-text">Select formats to export (downloads as ZIP)</p>
            
            <div className="format-checkboxes">
              {batchSettings.formats.map(format => (
                <label key={format} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={batchSettings.selectedFormats.includes(format)}
                    onChange={() => toggleFormat(format)}
                  />
                  <span>{format.toUpperCase()}</span>
                </label>
              ))}
            </div>

            <div className="control-group">
              <label>Quality: {Math.round(exportSettings.quality * 100)}%</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={exportSettings.quality}
                onChange={(e) => setExportSettings(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
              />
            </div>
          </div>
        );

      case 'sizes':
        return (
          <div className="export-options">
            <h4>Export Multiple Sizes</h4>
            <p className="info-text">Exports optimized for social media platforms</p>
            
            <div className="sizes-list">
              {socialMediaSizes.map(size => (
                <div key={size.name} className="size-item">
                  <span className="size-name">{size.name.replace(/_/g, ' ')}</span>
                  <span className="size-dimensions">{size.width} × {size.height}</span>
                </div>
              ))}
            </div>

            <div className="control-group">
              <label>Format:</label>
              <select
                value={exportSettings.format}
                onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value }))}
              >
                {formatOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'layers':
        return (
          <div className="export-options">
            <h4>Export Layers Separately</h4>
            <p className="info-text">Each layer exported as individual file (ZIP)</p>
            
            <div className="control-group">
              <label>Format:</label>
              <select
                value={exportSettings.format}
                onChange={(e) => setExportSettings(prev => ({ ...prev, format: e.target.value }))}
              >
                {formatOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="info-box">
              <p>💡 Layers: {canvas?.getObjects().length || 0}</p>
              <p>✨ Background will be transparent (PNG recommended)</p>
            </div>
          </div>
        );

      case 'project':
        return (
          <div className="export-options">
            <h4>Save Project</h4>
            <p className="info-text">Save with all layers and settings (.mbproject)</p>
            
            <div className="info-box">
              <p>📦 Includes:</p>
              <ul>
                <li>All layers and their properties</li>
                <li>Canvas settings</li>
                <li>Blend modes and effects</li>
                <li>Layer order and visibility</li>
              </ul>
              <p>✨ Can be reopened later to continue editing</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="export-panel">
      <div className="panel-header">
        <h3>Export & Batch Processing</h3>
      </div>

      {/* Export Type Selection */}
      <div className="export-types">
        <h4>Export Type</h4>
        <div className="export-type-buttons">
          {exportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                className={`export-type-btn ${exportType === type.id ? 'active' : ''}`}
                onClick={() => setExportType(type.id)}
              >
                <Icon size={18} />
                <span>{type.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="quick-presets">
        <h4>Quick Presets</h4>
        <div className="presets-grid">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              className="preset-btn"
              onClick={() => handlePresetApply(key)}
              disabled={isExporting}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Export Options */}
      {renderExportOptions()}

      {/* Filename */}
      <div className="filename-section">
        <label>Filename:</label>
        <input
          type="text"
          value={exportSettings.filename}
          onChange={(e) => setExportSettings(prev => ({ ...prev, filename: e.target.value }))}
          placeholder="Enter filename"
          disabled={isExporting}
        />
      </div>

      {/* Export Button */}
      <button
        className="btn-export"
        onClick={handleExport}
        disabled={isExporting || !canvas}
      >
        <FiDownload size={18} />
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
      </button>

      {/* Progress */}
      {exportProgress && (
        <div className="export-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${exportProgress.percentage}%` }}
            />
          </div>
          <p>{exportProgress.message}</p>
        </div>
      )}

      {/* Result */}
      {exportResult && (
        <div className={`export-result ${exportResult.success ? 'success' : 'error'}`}>
          {exportResult.success ? (
            <>
              <p>✅ Export successful!</p>
              {exportResult.size && (
                <p>File size: {(exportResult.size / 1024 / 1024).toFixed(2)} MB</p>
              )}
            </>
          ) : (
            <p>❌ Export failed: {exportResult.error}</p>
          )}
        </div>
      )}

      <div className="export-info">
        <p>💾 High-quality export with full resolution</p>
        <p>📦 Batch exports delivered as ZIP files</p>
        <p>🚀 Fast processing with optimized compression</p>
      </div>
    </div>
  );
};

export default ExportPanel;
