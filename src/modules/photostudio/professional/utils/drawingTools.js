// Advanced Drawing Tools - Brush Engine, Clone Stamp, Healing Brush

/**
 * Brush Engine - Advanced painting system
 */
export class BrushEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.points = [];
    
    // Brush properties
    this.size = 20;
    this.hardness = 100;
    this.opacity = 100;
    this.flow = 100;
    this.color = '#000000';
    this.blendMode = 'source-over';
    this.spacing = 0.25; // Distance between brush stamps as fraction of size
    
    // Advanced properties
    this.pressureSensitivity = true;
    this.smoothing = 3; // Stroke smoothing level
    this.angle = 0;
    this.roundness = 100;
    this.scatter = 0;
    this.texture = null;
  }
  
  /**
   * Start drawing
   */
  startDrawing(x, y, pressure = 1) {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    this.points = [{ x, y, pressure }];
  }
  
  /**
   * Continue drawing
   */
  draw(x, y, pressure = 1) {
    if (!this.isDrawing) return;
    
    this.points.push({ x, y, pressure });
    
    // Apply smoothing
    const smoothed = this.smoothPoints(this.points, this.smoothing);
    const lastPoint = smoothed[smoothed.length - 1];
    
    // Calculate distance
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Draw stamps along the path
    const spacing = this.size * this.spacing;
    const steps = Math.ceil(distance / spacing);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const ix = this.lastX + dx * t;
      const iy = this.lastY + dy * t;
      const iPressure = pressure;
      
      this.drawBrushStamp(ix, iy, iPressure);
    }
    
    this.lastX = x;
    this.lastY = y;
  }
  
  /**
   * Stop drawing
   */
  stopDrawing() {
    this.isDrawing = false;
    this.points = [];
  }
  
  /**
   * Draw single brush stamp
   */
  drawBrushStamp(x, y, pressure = 1) {
    const ctx = this.ctx;
    const size = this.size * (this.pressureSensitivity ? pressure : 1);
    const opacity = (this.opacity / 100) * (this.flow / 100);
    
    // Apply scatter
    if (this.scatter > 0) {
      x += (Math.random() - 0.5) * this.scatter * 2;
      y += (Math.random() - 0.5) * this.scatter * 2;
    }
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = this.blendMode;
    
    // Create brush gradient for hardness
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
    const softEdge = 1 - this.hardness / 100;
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(Math.max(0, 1 - softEdge), this.color);
    gradient.addColorStop(1, this.color + '00');
    
    ctx.fillStyle = gradient;
    
    // Apply angle and roundness
    if (this.angle !== 0 || this.roundness !== 100) {
      ctx.translate(x, y);
      ctx.rotate((this.angle * Math.PI) / 180);
      ctx.scale(1, this.roundness / 100);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Apply texture if present
    if (this.texture) {
      ctx.globalAlpha = opacity * 0.5;
      ctx.drawImage(
        this.texture,
        x - size / 2,
        y - size / 2,
        size,
        size
      );
    }
    
    ctx.restore();
  }
  
  /**
   * Smooth points using moving average
   */
  smoothPoints(points, level) {
    if (level === 0 || points.length < 3) return points;
    
    const smoothed = [...points];
    for (let iteration = 0; iteration < level; iteration++) {
      for (let i = 1; i < smoothed.length - 1; i++) {
        smoothed[i].x = (smoothed[i - 1].x + smoothed[i].x + smoothed[i + 1].x) / 3;
        smoothed[i].y = (smoothed[i - 1].y + smoothed[i].y + smoothed[i + 1].y) / 3;
      }
    }
    return smoothed;
  }
  
  /**
   * Set brush properties
   */
  setProperty(property, value) {
    if (this.hasOwnProperty(property)) {
      this[property] = value;
    }
  }
}

/**
 * Clone Stamp Tool - Copy pixels from one area to another
 */
export class CloneStampTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sourceX = null;
    this.sourceY = null;
    this.sourceSet = false;
    this.size = 50;
    this.hardness = 100;
    this.opacity = 100;
    this.aligned = true; // Maintain offset when cloning
    this.offsetX = 0;
    this.offsetY = 0;
  }
  
  /**
   * Set source point
   */
  setSource(x, y) {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceSet = true;
  }
  
  /**
   * Clone from source to destination
   */
  clone(destX, destY) {
    if (!this.sourceSet) return;
    
    const ctx = this.ctx;
    
    // Calculate source position
    let srcX, srcY;
    if (this.aligned) {
      if (this.offsetX === 0 && this.offsetY === 0) {
        this.offsetX = destX - this.sourceX;
        this.offsetY = destY - this.sourceY;
      }
      srcX = destX - this.offsetX;
      srcY = destY - this.offsetY;
    } else {
      srcX = this.sourceX;
      srcY = this.sourceY;
    }
    
    // Get source pixels
    const size = this.size;
    const imageData = ctx.getImageData(
      srcX - size / 2,
      srcY - size / 2,
      size,
      size
    );
    
    // Create circular mask for soft edge
    const mask = this.createCircularMask(size, this.hardness);
    
    // Apply mask
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = mask[i / 4] * (this.opacity / 100);
      imageData.data[i + 3] = Math.round(imageData.data[i + 3] * alpha);
    }
    
    // Draw cloned pixels
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.drawImage(
      tempCanvas,
      destX - size / 2,
      destY - size / 2
    );
  }
  
  /**
   * Create circular mask for brush
   */
  createCircularMask(size, hardness) {
    const mask = new Float32Array(size * size);
    const center = size / 2;
    const radius = size / 2;
    const softEdge = 1 - hardness / 100;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalized = distance / radius;
        
        if (normalized >= 1) {
          mask[y * size + x] = 0;
        } else if (normalized > 1 - softEdge) {
          const t = (1 - normalized) / softEdge;
          mask[y * size + x] = t;
        } else {
          mask[y * size + x] = 1;
        }
      }
    }
    
    return mask;
  }
  
  /**
   * Reset offset (for non-aligned mode)
   */
  resetOffset() {
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

/**
 * Healing Brush Tool - Blend textures intelligently
 */
export class HealingBrushTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 50;
    this.hardness = 80;
    this.sourceX = null;
    this.sourceY = null;
    this.sourceSet = false;
  }
  
  /**
   * Set source point for healing
   */
  setSource(x, y) {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceSet = true;
  }
  
  /**
   * Heal area by blending source texture with destination lighting
   */
  heal(destX, destY) {
    if (!this.sourceSet) return;
    
    const ctx = this.ctx;
    const size = this.size;
    
    // Get source and destination image data
    const sourceData = ctx.getImageData(
      this.sourceX - size / 2,
      this.sourceY - size / 2,
      size,
      size
    );
    
    const destData = ctx.getImageData(
      destX - size / 2,
      destY - size / 2,
      size,
      size
    );
    
    // Calculate destination luminance map
    const destLuminance = this.calculateLuminance(destData);
    const sourceLuminance = this.calculateLuminance(sourceData);
    
    // Blend textures
    const result = this.blendTextures(sourceData, destData, sourceLuminance, destLuminance);
    
    // Apply circular mask
    const mask = this.createCircularMask(size, this.hardness);
    this.applyMask(result, destData, mask);
    
    // Put result back
    ctx.putImageData(result, destX - size / 2, destY - size / 2);
  }
  
  /**
   * Calculate luminance map
   */
  calculateLuminance(imageData) {
    const { data, width, height } = imageData;
    const luminance = new Float32Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      luminance[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    return luminance;
  }
  
  /**
   * Blend textures by matching destination luminance
   */
  blendTextures(sourceData, destData, sourceLum, destLum) {
    const result = new ImageData(sourceData.width, sourceData.height);
    
    for (let i = 0; i < sourceData.data.length; i += 4) {
      const pixelIndex = i / 4;
      
      // Get source color
      const sr = sourceData.data[i];
      const sg = sourceData.data[i + 1];
      const sb = sourceData.data[i + 2];
      
      // Calculate adjustment factor
      const sourceLuminance = sourceLum[pixelIndex];
      const destLuminance = destLum[pixelIndex];
      const factor = sourceLuminance > 0 ? destLuminance / sourceLuminance : 1;
      
      // Apply adjustment
      result.data[i] = Math.min(255, sr * factor);
      result.data[i + 1] = Math.min(255, sg * factor);
      result.data[i + 2] = Math.min(255, sb * factor);
      result.data[i + 3] = 255;
    }
    
    return result;
  }
  
  /**
   * Apply circular mask to blend result with original
   */
  applyMask(result, original, mask) {
    for (let i = 0; i < result.data.length; i += 4) {
      const pixelIndex = i / 4;
      const alpha = mask[pixelIndex];
      
      result.data[i] = Math.round(original.data[i] * (1 - alpha) + result.data[i] * alpha);
      result.data[i + 1] = Math.round(original.data[i + 1] * (1 - alpha) + result.data[i + 1] * alpha);
      result.data[i + 2] = Math.round(original.data[i + 2] * (1 - alpha) + result.data[i + 2] * alpha);
    }
  }
  
  /**
   * Create circular mask
   */
  createCircularMask(size, hardness) {
    const mask = new Float32Array(size * size);
    const center = size / 2;
    const radius = size / 2;
    const softEdge = 1 - hardness / 100;
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const normalized = distance / radius;
        
        if (normalized >= 1) {
          mask[y * size + x] = 0;
        } else if (normalized > 1 - softEdge) {
          const t = (1 - normalized) / softEdge;
          mask[y * size + x] = t;
        } else {
          mask[y * size + x] = 1;
        }
      }
    }
    
    return mask;
  }
}

/**
 * Smudge Tool - Blur and smear pixels
 */
export class SmudgeTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 50;
    this.strength = 50;
    this.lastData = null;
  }
  
  /**
   * Smudge pixels
   */
  smudge(x, y) {
    const ctx = this.ctx;
    const size = this.size;
    const strength = this.strength / 100;
    
    // Get current pixels
    const currentData = ctx.getImageData(
      x - size / 2,
      y - size / 2,
      size,
      size
    );
    
    if (!this.lastData) {
      this.lastData = currentData;
      return;
    }
    
    // Blend current with last
    const result = new ImageData(size, size);
    
    for (let i = 0; i < currentData.data.length; i += 4) {
      result.data[i] = Math.round(
        currentData.data[i] * (1 - strength) + this.lastData.data[i] * strength
      );
      result.data[i + 1] = Math.round(
        currentData.data[i + 1] * (1 - strength) + this.lastData.data[i + 1] * strength
      );
      result.data[i + 2] = Math.round(
        currentData.data[i + 2] * (1 - strength) + this.lastData.data[i + 2] * strength
      );
      result.data[i + 3] = currentData.data[i + 3];
    }
    
    ctx.putImageData(result, x - size / 2, y - size / 2);
    this.lastData = result;
  }
  
  /**
   * Reset smudge
   */
  reset() {
    this.lastData = null;
  }
}

/**
 * Eraser Tool - Erase to transparency
 */
export class EraserTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 50;
    this.hardness = 100;
    this.opacity = 100;
  }
  
  /**
   * Erase pixels
   */
  erase(x, y) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = this.opacity / 100;
    
    // Create soft brush gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, this.size / 2);
    const softEdge = 1 - this.hardness / 100;
    gradient.addColorStop(0, 'rgba(0,0,0,1)');
    gradient.addColorStop(Math.max(0, 1 - softEdge), 'rgba(0,0,0,1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * Gradient Tool - Create linear and radial gradients
 */
export class GradientTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = 'linear'; // 'linear' or 'radial'
    this.startColor = '#000000';
    this.endColor = '#ffffff';
    this.opacity = 100;
  }
  
  /**
   * Apply gradient
   */
  applyGradient(startX, startY, endX, endY) {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = this.opacity / 100;
    
    let gradient;
    if (this.type === 'linear') {
      gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    } else {
      const radius = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
      );
      gradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, radius);
    }
    
    gradient.addColorStop(0, this.startColor);
    gradient.addColorStop(1, this.endColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    ctx.restore();
  }
}

/**
 * Pattern Stamp Tool - Paint with patterns
 */
export class PatternStampTool {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pattern = null;
    this.size = 100;
    this.opacity = 100;
  }
  
  /**
   * Set pattern from image
   */
  setPattern(image) {
    this.pattern = this.ctx.createPattern(image, 'repeat');
  }
  
  /**
   * Stamp pattern
   */
  stamp(x, y) {
    if (!this.pattern) return;
    
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalAlpha = this.opacity / 100;
    ctx.fillStyle = this.pattern;
    ctx.beginPath();
    ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
