/**
 * Professional Text Tools
 * Advanced text editing, typography, and effects for photo editing
 */

import { fabric } from 'fabric';

/**
 * TextEngine - Professional text editing with advanced features
 */
export class TextEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.activeText = null;
  }

  /**
   * Add new text to canvas
   */
  addText(text = 'Double click to edit', options = {}) {
    const defaultOptions = {
      left: 100,
      top: 100,
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontStyle: 'normal',
      fill: '#000000',
      textAlign: 'left',
      lineHeight: 1.2,
      charSpacing: 0,
      stroke: null,
      strokeWidth: 0,
      shadow: null,
      backgroundColor: null,
      underline: false,
      linethrough: false,
      overline: false,
    };

    const textOptions = { ...defaultOptions, ...options };

    const fabricText = new fabric.IText(text, textOptions);

    // Add custom properties for effects
    fabricText.textEffects = {
      outline: false,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      glow: false,
      glowBlur: 10,
      glowColor: '#ffffff',
      gradient: false,
      gradientType: 'linear',
      gradientColors: ['#000000', '#ffffff'],
      warp: 'none',
      warpStrength: 0,
    };

    this.canvas.add(fabricText);
    this.canvas.setActiveObject(fabricText);
    this.canvas.renderAll();

    this.activeText = fabricText;
    return fabricText;
  }

  /**
   * Update text properties
   */
  updateProperty(text, property, value) {
    if (!text) return;

    text.set(property, value);
    this.canvas.renderAll();
  }

  /**
   * Apply text effects
   */
  applyEffect(text, effect, options = {}) {
    if (!text) return;

    switch (effect) {
      case 'outline':
        this.applyOutline(text, options);
        break;
      case 'shadow':
        this.applyShadow(text, options);
        break;
      case 'glow':
        this.applyGlow(text, options);
        break;
      case 'gradient':
        this.applyGradient(text, options);
        break;
      case 'warp':
        this.applyWarp(text, options);
        break;
      case '3d':
        this.apply3D(text, options);
        break;
      default:
        break;
    }

    this.canvas.renderAll();
  }

  /**
   * Apply outline effect
   */
  applyOutline(text, options = {}) {
    const { width = 2, color = '#ffffff' } = options;

    text.set({
      stroke: color,
      strokeWidth: width,
      paintFirst: 'stroke', // Draw stroke first, then fill
    });

    text.textEffects.outline = true;
    text.textEffects.outlineWidth = width;
    text.textEffects.outlineColor = color;
  }

  /**
   * Remove outline effect
   */
  removeOutline(text) {
    text.set({
      stroke: null,
      strokeWidth: 0,
    });

    text.textEffects.outline = false;
  }

  /**
   * Apply shadow effect
   */
  applyShadow(text, options = {}) {
    const {
      color = 'rgba(0,0,0,0.5)',
      blur = 5,
      offsetX = 5,
      offsetY = 5,
    } = options;

    text.set({
      shadow: new fabric.Shadow({
        color: color,
        blur: blur,
        offsetX: offsetX,
        offsetY: offsetY,
      }),
    });
  }

  /**
   * Remove shadow effect
   */
  removeShadow(text) {
    text.set({ shadow: null });
  }

  /**
   * Apply glow effect (using shadow with no offset)
   */
  applyGlow(text, options = {}) {
    const { color = '#ffffff', blur = 10 } = options;

    text.set({
      shadow: new fabric.Shadow({
        color: color,
        blur: blur,
        offsetX: 0,
        offsetY: 0,
      }),
    });

    text.textEffects.glow = true;
    text.textEffects.glowBlur = blur;
    text.textEffects.glowColor = color;
  }

  /**
   * Apply gradient fill
   */
  applyGradient(text, options = {}) {
    const {
      type = 'linear',
      colors = ['#000000', '#ffffff'],
      angle = 0,
    } = options;

    const coords =
      type === 'linear'
        ? {
            x1: 0,
            y1: 0,
            x2: text.width,
            y2: 0,
          }
        : {
            x1: text.width / 2,
            y1: text.height / 2,
            x2: text.width,
            y2: text.height / 2,
          };

    const gradient = new fabric.Gradient({
      type: type,
      coords: coords,
      colorStops: [
        { offset: 0, color: colors[0] },
        { offset: 1, color: colors[1] },
      ],
    });

    text.set({ fill: gradient });

    text.textEffects.gradient = true;
    text.textEffects.gradientType = type;
    text.textEffects.gradientColors = colors;
  }

  /**
   * Remove gradient (return to solid color)
   */
  removeGradient(text, color = '#000000') {
    text.set({ fill: color });
    text.textEffects.gradient = false;
  }

  /**
   * Apply warp effect
   */
  applyWarp(text, options = {}) {
    const { type = 'arc', strength = 0.5 } = options;

    // Convert text to path for warping
    const path = text.toSVG();
    
    // Note: Full warp implementation would require complex path manipulation
    // This is a placeholder for the warp functionality
    text.textEffects.warp = type;
    text.textEffects.warpStrength = strength;

    console.log('Warp effect applied (simplified version)');
  }

  /**
   * Apply 3D effect
   */
  apply3D(text, options = {}) {
    const {
      depth = 5,
      angle = 45,
      color = '#666666',
    } = options;

    // Create 3D effect by adding multiple shadow layers
    const shadows = [];
    const angleRad = (angle * Math.PI) / 180;

    for (let i = 1; i <= depth; i++) {
      shadows.push(
        new fabric.Shadow({
          color: color,
          blur: 0,
          offsetX: Math.cos(angleRad) * i,
          offsetY: Math.sin(angleRad) * i,
        })
      );
    }

    // Fabric.js only supports one shadow, so we use the last one
    // For full 3D, we'd need to create multiple text objects
    text.set({
      shadow: shadows[shadows.length - 1],
    });
  }

  /**
   * Apply text on path
   */
  applyTextOnPath(text, pathData) {
    // This would require converting text to path and following curve
    console.log('Text on path feature (requires fabric.js extension)');
  }

  /**
   * Convert text to path (for advanced manipulation)
   */
  convertToPath(text) {
    const pathData = text.toSVG();
    return pathData;
  }

  /**
   * Duplicate text with transform
   */
  duplicateText(text, offsetX = 20, offsetY = 20) {
    text.clone((cloned) => {
      cloned.set({
        left: text.left + offsetX,
        top: text.top + offsetY,
      });

      this.canvas.add(cloned);
      this.canvas.setActiveObject(cloned);
      this.canvas.renderAll();
    });
  }

  /**
   * Apply text mask (cut out text from image)
   */
  applyTextMask(text, image) {
    // Create clipping path from text
    const textPath = new fabric.Path(text.toSVG());
    
    image.set({
      clipPath: textPath,
    });

    this.canvas.renderAll();
  }

  /**
   * Get available system fonts
   */
  getSystemFonts() {
    return [
      'Arial',
      'Arial Black',
      'Comic Sans MS',
      'Courier New',
      'Georgia',
      'Impact',
      'Lucida Console',
      'Lucida Sans Unicode',
      'Palatino Linotype',
      'Tahoma',
      'Times New Roman',
      'Trebuchet MS',
      'Verdana',
      'MS Sans Serif',
      'MS Serif',
      // Google Fonts (would need to be loaded)
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Oswald',
      'Raleway',
      'PT Sans',
      'Merriweather',
      'Playfair Display',
      'Ubuntu',
    ];
  }

  /**
   * Load custom font
   */
  async loadCustomFont(fontName, fontUrl) {
    const font = new FontFace(fontName, `url(${fontUrl})`);
    
    try {
      await font.load();
      document.fonts.add(font);
      return true;
    } catch (error) {
      console.error('Failed to load font:', error);
      return false;
    }
  }

  /**
   * Apply letter spacing
   */
  applyLetterSpacing(text, spacing) {
    text.set({ charSpacing: spacing * 10 }); // Fabric uses different scale
    this.canvas.renderAll();
  }

  /**
   * Apply line height
   */
  applyLineHeight(text, height) {
    text.set({ lineHeight: height });
    this.canvas.renderAll();
  }

  /**
   * Align text
   */
  alignText(text, alignment) {
    text.set({ textAlign: alignment });
    this.canvas.renderAll();
  }

  /**
   * Make text bold
   */
  toggleBold(text) {
    const currentWeight = text.fontWeight;
    text.set({
      fontWeight: currentWeight === 'bold' ? 'normal' : 'bold',
    });
    this.canvas.renderAll();
  }

  /**
   * Make text italic
   */
  toggleItalic(text) {
    const currentStyle = text.fontStyle;
    text.set({
      fontStyle: currentStyle === 'italic' ? 'normal' : 'italic',
    });
    this.canvas.renderAll();
  }

  /**
   * Toggle underline
   */
  toggleUnderline(text) {
    text.set({ underline: !text.underline });
    this.canvas.renderAll();
  }

  /**
   * Toggle strikethrough
   */
  toggleStrikethrough(text) {
    text.set({ linethrough: !text.linethrough });
    this.canvas.renderAll();
  }

  /**
   * Create text preset styles
   */
  getPresetStyles() {
    return {
      heading1: {
        fontSize: 72,
        fontWeight: 'bold',
        fontFamily: 'Arial Black',
        fill: '#000000',
      },
      heading2: {
        fontSize: 56,
        fontWeight: 'bold',
        fontFamily: 'Arial',
        fill: '#333333',
      },
      heading3: {
        fontSize: 40,
        fontWeight: '600',
        fontFamily: 'Arial',
        fill: '#666666',
      },
      body: {
        fontSize: 24,
        fontWeight: 'normal',
        fontFamily: 'Arial',
        fill: '#000000',
      },
      caption: {
        fontSize: 18,
        fontWeight: 'normal',
        fontFamily: 'Arial',
        fill: '#999999',
        fontStyle: 'italic',
      },
      quote: {
        fontSize: 32,
        fontWeight: '300',
        fontFamily: 'Georgia',
        fill: '#444444',
        fontStyle: 'italic',
      },
      impact: {
        fontSize: 64,
        fontWeight: 'bold',
        fontFamily: 'Impact',
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeWidth: 2,
      },
      elegant: {
        fontSize: 48,
        fontWeight: 'normal',
        fontFamily: 'Playfair Display',
        fill: '#2c3e50',
      },
      modern: {
        fontSize: 36,
        fontWeight: '600',
        fontFamily: 'Montserrat',
        fill: '#3498db',
        letterSpacing: 2,
      },
      retro: {
        fontSize: 44,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
        fill: '#e74c3c',
        shadow: new fabric.Shadow({
          color: '#c0392b',
          blur: 0,
          offsetX: 3,
          offsetY: 3,
        }),
      },
    };
  }

  /**
   * Apply preset style
   */
  applyPreset(text, presetName) {
    const presets = this.getPresetStyles();
    const preset = presets[presetName];

    if (preset) {
      text.set(preset);
      this.canvas.renderAll();
    }
  }

  /**
   * Get text bounds for precise positioning
   */
  getTextBounds(text) {
    return {
      width: text.width,
      height: text.height,
      left: text.left,
      top: text.top,
      angle: text.angle,
    };
  }

  /**
   * Center text on canvas
   */
  centerText(text, axis = 'both') {
    const canvasCenter = this.canvas.getCenter();

    if (axis === 'both' || axis === 'horizontal') {
      text.set({ left: canvasCenter.left });
    }

    if (axis === 'both' || axis === 'vertical') {
      text.set({ top: canvasCenter.top });
    }

    text.setCoords();
    this.canvas.renderAll();
  }

  /**
   * Create text with background box
   */
  createTextBox(text, options = {}) {
    const {
      padding = 20,
      backgroundColor = '#ffffff',
      borderRadius = 10,
      borderColor = '#000000',
      borderWidth = 2,
    } = options;

    const textBounds = this.getTextBounds(text);

    const box = new fabric.Rect({
      left: textBounds.left - padding,
      top: textBounds.top - padding,
      width: textBounds.width + padding * 2,
      height: textBounds.height + padding * 2,
      fill: backgroundColor,
      stroke: borderColor,
      strokeWidth: borderWidth,
      rx: borderRadius,
      ry: borderRadius,
    });

    const group = new fabric.Group([box, text], {
      left: textBounds.left,
      top: textBounds.top,
    });

    this.canvas.remove(text);
    this.canvas.add(group);
    this.canvas.setActiveObject(group);
    this.canvas.renderAll();

    return group;
  }

  /**
   * Create outlined text (stroke only)
   */
  createOutlinedText(text, strokeWidth = 3, strokeColor = '#000000') {
    text.set({
      fill: 'transparent',
      stroke: strokeColor,
      strokeWidth: strokeWidth,
    });

    this.canvas.renderAll();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.activeText = null;
    this.canvas = null;
  }
}

/**
 * Helper function to create text with common effects
 */
export const createStyledText = (canvas, text, style = 'default') => {
  const engine = new TextEngine(canvas);
  const fabricText = engine.addText(text);

  switch (style) {
    case 'outline':
      engine.applyOutline(fabricText, { width: 3, color: '#ffffff' });
      break;
    case 'shadow':
      engine.applyShadow(fabricText);
      break;
    case 'glow':
      engine.applyGlow(fabricText);
      break;
    case '3d':
      engine.apply3D(fabricText);
      break;
    default:
      break;
  }

  return fabricText;
};

/**
 * Load Google Fonts dynamically
 */
export const loadGoogleFont = async (fontName) => {
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(
    / /g,
    '+'
  )}:wght@300;400;600;700&display=swap`;
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  // Wait for font to load
  return new Promise((resolve) => {
    document.fonts.ready.then(() => {
      resolve(true);
    });
  });
};

export default TextEngine;
