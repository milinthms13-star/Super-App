import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import LayerPanel from './components/LayerPanel';
import ToolsPanel from './components/ToolsPanel';
import PropertiesPanel from './components/PropertiesPanel';
import TopMenuBar from './components/TopMenuBar';
import CanvasWorkspace from './components/CanvasWorkspace';
import FiltersPanel from './components/FiltersPanel';
import ARPanel from './components/ARPanel';
import DrawingPanel from './components/DrawingPanel';
import BackgroundPanel from './components/BackgroundPanel';
import TextPanel from './components/TextPanel';
import ExportPanel from './components/ExportPanel';
import { LayerManager } from './utils/layerManager';
import { KeyboardShortcuts } from './utils/shortcuts';
import './ProfessionalPhotoEditor.css';

const ProfessionalPhotoEditor = () => {
  // Core state
  const [canvas, setCanvas] = useState(null);
  const [layers, setLayers] = useState([]);
  const [activeLayer, setActiveLayer] = useState(null);
  const [activeTool, setActiveTool] = useState('select');
  const [zoom, setZoom] = useState(100);
  const [history, setHistory] = useState({ past: [], future: [] });
  
  // UI state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState('layers'); // layers, properties, filters, ar, drawing, background
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  
  // Project state
  const [projectName, setProjectName] = useState('Untitled Project');
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [isDirty, setIsDirty] = useState(false);
  
  // Refs
  const canvasRef = useRef(null);
  const layerManagerRef = useRef(null);
  const shortcutsRef = useRef(null);

  // Initialize Fabric canvas
  useEffect(() => {
    if (canvasRef.current && !canvas) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: canvasSize.width,
        height: canvasSize.height,
        backgroundColor: '#ffffff',
        selection: true,
        preserveObjectStacking: true,
      });

      fabricCanvas.on('selection:created', handleSelection);
      fabricCanvas.on('selection:updated', handleSelection);
      fabricCanvas.on('selection:cleared', handleDeselection);
      fabricCanvas.on('object:modified', handleObjectModified);
      
      setCanvas(fabricCanvas);
      
      // Initialize layer manager
      layerManagerRef.current = new LayerManager(fabricCanvas, setLayers, setActiveLayer);
      
      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [canvasRef, canvas, canvasSize]);

  // Initialize keyboard shortcuts
  useEffect(() => {
    if (canvas && !shortcutsRef.current) {
      shortcutsRef.current = new KeyboardShortcuts({
        onUndo: handleUndo,
        onRedo: handleRedo,
        onSave: handleSave,
        onDelete: handleDelete,
        onSelectAll: handleSelectAll,
        onDeselect: handleDeselect,
        onDuplicate: handleDuplicate,
        onZoomIn: () => handleZoom(zoom + 10),
        onZoomOut: () => handleZoom(zoom - 10),
        onZoomReset: () => handleZoom(100),
        onFitScreen: handleFitToScreen,
      });
      
      shortcutsRef.current.enable();
      
      return () => {
        if (shortcutsRef.current) {
          shortcutsRef.current.disable();
        }
      };
    }
  }, [canvas, zoom]);

  // Event handlers
  const handleSelection = useCallback((e) => {
    const selected = e.selected?.[0];
    if (selected && selected.layerId) {
      setActiveLayer(selected.layerId);
    }
  }, []);

  const handleDeselection = useCallback(() => {
    setActiveLayer(null);
  }, []);

  const handleObjectModified = useCallback((e) => {
    setIsDirty(true);
    saveToHistory();
  }, []);

  // Layer operations
  const handleAddLayer = useCallback((type = 'empty', data = null) => {
    if (!layerManagerRef.current) return;
    
    const layer = layerManagerRef.current.addLayer(type, data);
    setIsDirty(true);
    saveToHistory();
    return layer;
  }, []);

  const handleDeleteLayer = useCallback((layerId) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.deleteLayer(layerId);
    setIsDirty(true);
    saveToHistory();
  }, []);

  const handleDuplicateLayer = useCallback((layerId) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.duplicateLayer(layerId);
    setIsDirty(true);
    saveToHistory();
  }, []);

  const handleToggleLayerVisibility = useCallback((layerId) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.toggleVisibility(layerId);
    setIsDirty(true);
  }, []);

  const handleToggleLayerLock = useCallback((layerId) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.toggleLock(layerId);
  }, []);

  const handleReorderLayers = useCallback((dragIndex, hoverIndex) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.reorderLayers(dragIndex, hoverIndex);
    setIsDirty(true);
  }, []);

  const handleMergeLayers = useCallback((layerIds) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.mergeLayers(layerIds);
    setIsDirty(true);
    saveToHistory();
  }, []);

  const handleUpdateLayerProperty = useCallback((layerId, property, value) => {
    if (!layerManagerRef.current) return;
    
    layerManagerRef.current.updateLayerProperty(layerId, property, value);
    setIsDirty(true);
  }, []);

  // Tool handlers
  const handleToolChange = useCallback((tool) => {
    setActiveTool(tool);
    
    if (canvas) {
      // Configure canvas based on tool
      switch (tool) {
        case 'select':
          canvas.isDrawingMode = false;
          canvas.selection = true;
          break;
        case 'brush':
        case 'pencil':
        case 'eraser':
          canvas.isDrawingMode = true;
          canvas.selection = false;
          break;
        case 'text':
          canvas.isDrawingMode = false;
          canvas.selection = false;
          break;
        default:
          canvas.isDrawingMode = false;
          canvas.selection = true;
      }
    }
  }, [canvas]);

  // History operations
  const saveToHistory = useCallback(() => {
    if (!canvas) return;
    
    const state = JSON.stringify(canvas.toJSON(['layerId', 'layerName']));
    
    setHistory(prev => ({
      past: [...prev.past, state],
      future: []
    }));
  }, [canvas]);

  const handleUndo = useCallback(() => {
    if (!canvas || history.past.length === 0) return;
    
    const newPast = [...history.past];
    const currentState = JSON.stringify(canvas.toJSON(['layerId', 'layerName']));
    const previousState = newPast.pop();
    
    canvas.loadFromJSON(previousState, () => {
      canvas.renderAll();
      layerManagerRef.current?.syncLayers();
    });
    
    setHistory({
      past: newPast,
      future: [currentState, ...history.future]
    });
    setIsDirty(true);
  }, [canvas, history]);

  const handleRedo = useCallback(() => {
    if (!canvas || history.future.length === 0) return;
    
    const newFuture = [...history.future];
    const currentState = JSON.stringify(canvas.toJSON(['layerId', 'layerName']));
    const nextState = newFuture.shift();
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
      layerManagerRef.current?.syncLayers();
    });
    
    setHistory({
      past: [...history.past, currentState],
      future: newFuture
    });
    setIsDirty(true);
  }, [canvas, history]);

  // File operations
  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Do you want to create a new project?');
      if (!confirm) return;
    }
    
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    }
    
    setLayers([]);
    setActiveLayer(null);
    setProjectName('Untitled Project');
    setHistory({ past: [], future: [] });
    setIsDirty(false);
  }, [canvas, isDirty]);

  const handleOpen = useCallback(async (file) => {
    setLoading(true);
    try {
      if (file.type === 'application/json') {
        // Load project file
        const text = await file.text();
        const projectData = JSON.parse(text);
        
        if (canvas && projectData.canvas) {
          canvas.loadFromJSON(projectData.canvas, () => {
            canvas.renderAll();
            layerManagerRef.current?.syncLayers();
          });
        }
        
        setProjectName(projectData.name || 'Untitled Project');
        setIsDirty(false);
        showNotification('Project loaded successfully', 'success');
      } else if (file.type.startsWith('image/')) {
        // Load image as new layer
        const reader = new FileReader();
        reader.onload = (e) => {
          fabric.Image.fromURL(e.target.result, (img) => {
            handleAddLayer('image', img);
            showNotification('Image added as new layer', 'success');
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      showNotification('Failed to open file: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canvas, handleAddLayer]);

  const handleSave = useCallback(async () => {
    if (!canvas) return;
    
    setLoading(true);
    try {
      const projectData = {
        name: projectName,
        canvas: canvas.toJSON(['layerId', 'layerName']),
        layers: layers,
        canvasSize: canvasSize,
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setIsDirty(false);
      showNotification('Project saved successfully', 'success');
    } catch (error) {
      showNotification('Failed to save project: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canvas, projectName, layers, canvasSize]);

  const handleExport = useCallback(async (format = 'png', quality = 1.0) => {
    if (!canvas) return;
    
    setLoading(true);
    try {
      const dataURL = canvas.toDataURL({
        format: format,
        quality: quality,
        multiplier: quality >= 0.9 ? 2 : 1 // HD export
      });
      
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `${projectName}.${format}`;
      a.click();
      
      showNotification(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showNotification('Failed to export: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canvas, projectName]);

  // Zoom operations
  const handleZoom = useCallback((newZoom) => {
    if (!canvas) return;
    
    const zoomValue = Math.max(10, Math.min(3200, newZoom));
    const zoomFactor = zoomValue / 100;
    
    canvas.setZoom(zoomFactor);
    canvas.setWidth(canvasSize.width * zoomFactor);
    canvas.setHeight(canvasSize.height * zoomFactor);
    canvas.renderAll();
    
    setZoom(zoomValue);
  }, [canvas, canvasSize]);

  const handleFitToScreen = useCallback(() => {
    if (!canvas) return;
    
    const container = canvas.wrapperEl;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    const scaleX = containerWidth / canvasSize.width;
    const scaleY = containerHeight / canvasSize.height;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    
    handleZoom(scale * 100);
  }, [canvas, canvasSize, handleZoom]);

  // Utility functions
  const handleDelete = useCallback(() => {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => {
        if (obj.layerId) {
          handleDeleteLayer(obj.layerId);
        } else {
          canvas.remove(obj);
        }
      });
      canvas.discardActiveObject();
      canvas.renderAll();
      saveToHistory();
      setIsDirty(true);
    }
  }, [canvas, handleDeleteLayer, saveToHistory]);

  const handleSelectAll = useCallback(() => {
    if (!canvas) return;
    
    const objects = canvas.getObjects();
    if (objects.length > 0) {
      const selection = new fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(selection);
      canvas.renderAll();
    }
  }, [canvas]);

  const handleDeselect = useCallback(() => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [canvas]);

  const handleDuplicate = useCallback(() => {
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned) => {
        cloned.set({
          left: activeObject.left + 20,
          top: activeObject.top + 20
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
        saveToHistory();
        setIsDirty(true);
      }, ['layerId', 'layerName']);
    }
  }, [canvas, saveToHistory]);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Get active object for panels
  const getActiveObject = useCallback(() => {
    if (!canvas) return null;
    return canvas.getActiveObject();
  }, [canvas]);

  // Handle filter/effect application
  const handleEffectApplied = useCallback(() => {
    saveToHistory();
    setIsDirty(true);
    showNotification('Effect applied successfully', 'success');
  }, [saveToHistory, showNotification]);

  // Render right panel content based on active tab
  const renderRightPanelContent = () => {
    const activeObject = getActiveObject();

    switch (rightPanelTab) {
      case 'layers':
        return (
          <LayerPanel
            layers={layers}
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onToggleVisibility={handleToggleLayerVisibility}
            onToggleLock={handleToggleLayerLock}
            onReorderLayers={handleReorderLayers}
            onMergeLayers={handleMergeLayers}
            onUpdateProperty={handleUpdateLayerProperty}
          />
        );

      case 'properties':
        return (
          <PropertiesPanel
            canvas={canvas}
            activeLayer={activeLayer}
            layers={layers}
            onUpdateProperty={handleUpdateLayerProperty}
          />
        );

      case 'filters':
        return (
          <FiltersPanel
            canvas={canvas}
            activeObject={activeObject}
            onApply={handleEffectApplied}
          />
        );

      case 'ar':
        return (
          <ARPanel
            canvas={canvas}
            activeObject={activeObject}
            onApply={handleEffectApplied}
          />
        );

      case 'drawing':
        return (
          <DrawingPanel
            canvas={canvas}
            activeObject={activeObject}
          />
        );

      case 'background':
        return (
          <BackgroundPanel
            canvas={canvas}
            activeObject={activeObject}
            onApply={handleEffectApplied}
          />
        );

      case 'text':
        return (
          <TextPanel
            canvas={canvas}
            activeObject={activeObject}
          />
        );

      case 'export':
        return (
          <ExportPanel
            canvas={canvas}
            projectName={projectName}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="professional-photo-editor">
      <TopMenuBar
        projectName={projectName}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        isDirty={isDirty}
      />
      
      <div className="editor-workspace">
        <div className={`left-panel ${leftPanelOpen ? 'open' : 'closed'}`}>
          <button 
            className="panel-toggle"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            title={leftPanelOpen ? 'Hide tools' : 'Show tools'}
          >
            {leftPanelOpen ? '◀' : '▶'}
          </button>
          
          {leftPanelOpen && (
            <ToolsPanel
              activeTool={activeTool}
              onToolChange={handleToolChange}
              canvas={canvas}
            />
          )}
        </div>
        
        <div className="center-workspace">
          <CanvasWorkspace
            canvasRef={canvasRef}
            zoom={zoom}
            onZoom={handleZoom}
            onFitScreen={handleFitToScreen}
            canvasSize={canvasSize}
            loading={loading}
          />
          
          <div className="status-bar">
            <span>{projectName}</span>
            <span>|</span>
            <span>{canvasSize.width} x {canvasSize.height}px</span>
            <span>|</span>
            <span>Zoom: {zoom}%</span>
            <span>|</span>
            <span>{layers.length} layers</span>
            {isDirty && <span className="dirty-indicator">● Unsaved</span>}
          </div>
        </div>
        
        <div className={`right-panel ${rightPanelOpen ? 'open' : 'closed'}`}>
          <button 
            className="panel-toggle"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            title={rightPanelOpen ? 'Hide panels' : 'Show panels'}
          >
            {rightPanelOpen ? '▶' : '◀'}
          </button>
          
          {rightPanelOpen && (
            <div className="right-panel-content">
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${rightPanelTab === 'layers' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('layers')}
                  title="Layers"
                >
                  <span>📚</span>
                  <span className="tab-label">Layers</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'properties' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('properties')}
                  title="Properties"
                >
                  <span>⚙️</span>
                  <span className="tab-label">Properties</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'filters' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('filters')}
                  title="Filters & Adjustments"
                >
                  <span>🎨</span>
                  <span className="tab-label">Filters</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'background' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('background')}
                  title="Background Editing"
                >
                  <span>🖼️</span>
                  <span className="tab-label">Background</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'ar' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('ar')}
                  title="AR Features"
                >
                  <span>✨</span>
                  <span className="tab-label">AR</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'drawing' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('drawing')}
                  title="Drawing Tools"
                >
                  <span>🖌️</span>
                  <span className="tab-label">Draw</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'text' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('text')}
                  title="Text Tools"
                >
                  <span>📝</span>
                  <span className="tab-label">Text</span>
                </button>
                <button
                  className={`panel-tab ${rightPanelTab === 'export' ? 'active' : ''}`}
                  onClick={() => setRightPanelTab('export')}
                  title="Export & Batch"
                >
                  <span>💾</span>
                  <span className="tab-label">Export</span>
                </button>
              </div>

              <div className="panel-content-area">
                {renderRightPanelContent()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Processing...</p>
        </div>
      )}
    </div>
  );
};

export default ProfessionalPhotoEditor;
