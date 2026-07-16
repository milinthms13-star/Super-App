import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';

export class LayerManager {
  constructor(canvas, setLayers, setActiveLayer) {
    this.canvas = canvas;
    this.setLayers = setLayers;
    this.setActiveLayer = setActiveLayer;
    this.layers = [];
  }

  addLayer(type = 'empty', data = null) {
    const layerId = uuidv4();
    const layerName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.layers.length + 1}`;
    
    const layer = {
      id: layerId,
      name: layerName,
      type: type,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      filters: [],
      metadata: {}
    };

    let canvasObject = null;

    switch (type) {
      case 'image':
        if (data) {
          canvasObject = data;
          canvasObject.set({
            layerId: layerId,
            layerName: layerName,
            selectable: true
          });
          this.canvas.add(canvasObject);
          this.canvas.centerObject(canvasObject);
        }
        break;
        
      case 'text':
        canvasObject = new fabric.IText('Double click to edit', {
          layerId: layerId,
          layerName: layerName,
          left: this.canvas.width / 2,
          top: this.canvas.height / 2,
          fontSize: 48,
          fill: '#000000',
          fontFamily: 'Arial'
        });
        this.canvas.add(canvasObject);
        break;
        
      case 'shape':
        canvasObject = new fabric.Rect({
          layerId: layerId,
          layerName: layerName,
          left: this.canvas.width / 2 - 100,
          top: this.canvas.height / 2 - 100,
          width: 200,
          height: 200,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2
        });
        this.canvas.add(canvasObject);
        break;
        
      case 'empty':
      default:
        // Empty layer, no canvas object
        break;
    }

    this.layers.push(layer);
    this.setLayers([...this.layers]);
    this.setActiveLayer(layerId);
    this.canvas.renderAll();
    
    return layer;
  }

  deleteLayer(layerId) {
    const layerIndex = this.layers.findIndex(l => l.id === layerId);
    if (layerIndex === -1) return;

    // Remove canvas object
    const objects = this.canvas.getObjects();
    const objectToRemove = objects.find(obj => obj.layerId === layerId);
    if (objectToRemove) {
      this.canvas.remove(objectToRemove);
    }

    // Remove layer
    this.layers.splice(layerIndex, 1);
    this.setLayers([...this.layers]);
    
    // Clear active layer if it was deleted
    this.setActiveLayer(null);
    this.canvas.renderAll();
  }

  duplicateLayer(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    const objects = this.canvas.getObjects();
    const originalObject = objects.find(obj => obj.layerId === layerId);
    
    if (originalObject) {
      originalObject.clone((cloned) => {
        const newLayerId = uuidv4();
        cloned.set({
          layerId: newLayerId,
          layerName: `${layer.name} Copy`,
          left: cloned.left + 20,
          top: cloned.top + 20
        });
        
        const newLayer = {
          ...layer,
          id: newLayerId,
          name: `${layer.name} Copy`
        };
        
        this.layers.push(newLayer);
        this.canvas.add(cloned);
        this.setLayers([...this.layers]);
        this.setActiveLayer(newLayerId);
        this.canvas.renderAll();
      }, ['layerId', 'layerName']);
    }
  }

  toggleVisibility(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    layer.visible = !layer.visible;

    const objects = this.canvas.getObjects();
    const object = objects.find(obj => obj.layerId === layerId);
    if (object) {
      object.visible = layer.visible;
      object.selectable = layer.visible && !layer.locked;
      this.canvas.renderAll();
    }

    this.setLayers([...this.layers]);
  }

  toggleLock(layerId) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    layer.locked = !layer.locked;

    const objects = this.canvas.getObjects();
    const object = objects.find(obj => obj.layerId === layerId);
    if (object) {
      object.selectable = !layer.locked && layer.visible;
      object.evented = !layer.locked;
      this.canvas.renderAll();
    }

    this.setLayers([...this.layers]);
  }

  reorderLayers(dragIndex, hoverIndex) {
    const dragLayer = this.layers[dragIndex];
    this.layers.splice(dragIndex, 1);
    this.layers.splice(hoverIndex, 0, dragLayer);
    
    // Update z-index on canvas
    const objects = this.canvas.getObjects();
    this.layers.forEach((layer, index) => {
      const object = objects.find(obj => obj.layerId === layer.id);
      if (object) {
        this.canvas.moveTo(object, index);
      }
    });
    
    this.setLayers([...this.layers]);
    this.canvas.renderAll();
  }

  mergeLayers(layerIds) {
    if (layerIds.length < 2) return;

    const firstLayerId = layerIds[0];
    const firstLayer = this.layers.find(l => l.id === firstLayerId);
    if (!firstLayer) return;

    // Create a group of objects
    const objects = this.canvas.getObjects();
    const objectsToMerge = objects.filter(obj => layerIds.includes(obj.layerId));
    
    if (objectsToMerge.length > 0) {
      const group = new fabric.Group(objectsToMerge, {
        layerId: firstLayerId,
        layerName: `${firstLayer.name} (merged)`
      });
      
      // Remove individual objects
      objectsToMerge.forEach(obj => this.canvas.remove(obj));
      
      // Add merged group
      this.canvas.add(group);
      
      // Remove merged layers (except first)
      this.layers = this.layers.filter(l => !layerIds.slice(1).includes(l.id));
      firstLayer.name = `${firstLayer.name} (merged)`;
      
      this.setLayers([...this.layers]);
      this.canvas.renderAll();
    }
  }

  updateLayerProperty(layerId, property, value) {
    const layer = this.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Update layer data
    if (property === 'name') {
      layer.name = value;
    } else if (property === 'opacity') {
      layer.opacity = value;
    } else if (property === 'blendMode') {
      layer.blendMode = value;
    }

    // Update canvas object
    const objects = this.canvas.getObjects();
    const object = objects.find(obj => obj.layerId === layerId);
    
    if (object) {
      if (property === 'name') {
        object.layerName = value;
      } else if (property === 'opacity') {
        object.opacity = value / 100;
      } else if (property === 'blendMode') {
        object.globalCompositeOperation = this.getCompositeOperation(value);
      }
      this.canvas.renderAll();
    }

    this.setLayers([...this.layers]);
  }

  getCompositeOperation(blendMode) {
    const blendModeMap = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light',
      'difference': 'difference',
      'exclusion': 'exclusion'
    };
    return blendModeMap[blendMode] || 'source-over';
  }

  syncLayers() {
    // Sync layers array with canvas objects
    const objects = this.canvas.getObjects();
    this.layers = this.layers.filter(layer => 
      objects.some(obj => obj.layerId === layer.id)
    );
    this.setLayers([...this.layers]);
  }

  exportLayers() {
    return this.layers.map(layer => ({
      ...layer,
      canvasData: this.canvas.getObjects()
        .find(obj => obj.layerId === layer.id)?.toJSON()
    }));
  }
}
