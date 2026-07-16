// Professional Image Filters - Curves, Levels, Color Correction
// All processing done client-side, no API calls

/**
 * Apply Curves Adjustment
 * @param {ImageData} imageData - Source image
 * @param {Array} redCurve - Red channel curve points [[x, y], ...]
 * @param {Array} greenCurve - Green channel curve points
 * @param {Array} blueCurve - Blue channel curve points
 * @param {Array} rgbCurve - Master RGB curve points
 * @returns {ImageData} - Adjusted image
 */
export function applyCurves(imageData, redCurve = null, greenCurve = null, blueCurve = null, rgbCurve = null) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Generate lookup tables
  const redLUT = generateCurveLUT(redCurve || [[0, 0], [255, 255]]);
  const greenLUT = generateCurveLUT(greenCurve || [[0, 0], [255, 255]]);
  const blueLUT = generateCurveLUT(blueCurve || [[0, 0], [255, 255]]);
  const rgbLUT = generateCurveLUT(rgbCurve || [[0, 0], [255, 255]]);
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply master curve first
    let r = rgbLUT[data[i]];
    let g = rgbLUT[data[i + 1]];
    let b = rgbLUT[data[i + 2]];
    
    // Apply individual channel curves
    result.data[i] = redLUT[r];
    result.data[i + 1] = greenLUT[g];
    result.data[i + 2] = blueLUT[b];
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Generate curve lookup table from control points
 */
function generateCurveLUT(points) {
  const lut = new Uint8Array(256);
  
  // Sort points by x
  points.sort((a, b) => a[0] - b[0]);
  
  // Interpolate between points
  for (let i = 0; i < 256; i++) {
    // Find surrounding points
    let p1 = points[0];
    let p2 = points[points.length - 1];
    
    for (let j = 0; j < points.length - 1; j++) {
      if (i >= points[j][0] && i <= points[j + 1][0]) {
        p1 = points[j];
        p2 = points[j + 1];
        break;
      }
    }
    
    // Linear interpolation
    const t = (i - p1[0]) / (p2[0] - p1[0]);
    lut[i] = Math.round(p1[1] + (p2[1] - p1[1]) * t);
  }
  
  return lut;
}

/**
 * Apply Levels Adjustment
 * @param {ImageData} imageData - Source image
 * @param {Object} params - { blackPoint, whitePoint, midtone, outputBlack, outputWhite }
 * @returns {ImageData} - Adjusted image
 */
export function applyLevels(imageData, params = {}) {
  const {
    blackPoint = 0,
    whitePoint = 255,
    midtone = 1.0,
    outputBlack = 0,
    outputWhite = 255
  } = params;
  
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Generate lookup table
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    // Input levels
    let value = (i - blackPoint) / (whitePoint - blackPoint);
    value = Math.max(0, Math.min(1, value));
    
    // Apply gamma (midtone)
    value = Math.pow(value, 1 / midtone);
    
    // Output levels
    value = outputBlack + value * (outputWhite - outputBlack);
    lut[i] = Math.round(Math.max(0, Math.min(255, value)));
  }
  
  // Apply lookup table
  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = lut[data[i]];
    result.data[i + 1] = lut[data[i + 1]];
    result.data[i + 2] = lut[data[i + 2]];
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Brightness/Contrast Adjustment
 * @param {ImageData} imageData - Source image
 * @param {number} brightness - Brightness (-100 to 100)
 * @param {number} contrast - Contrast (-100 to 100)
 * @returns {ImageData} - Adjusted image
 */
export function applyBrightnessContrast(imageData, brightness = 0, contrast = 0) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Convert to usable values
  const brightnessValue = brightness * 2.55; // -255 to 255
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast
    let r = contrastFactor * (data[i] - 128) + 128;
    let g = contrastFactor * (data[i + 1] - 128) + 128;
    let b = contrastFactor * (data[i + 2] - 128) + 128;
    
    // Apply brightness
    r += brightnessValue;
    g += brightnessValue;
    b += brightnessValue;
    
    result.data[i] = Math.max(0, Math.min(255, r));
    result.data[i + 1] = Math.max(0, Math.min(255, g));
    result.data[i + 2] = Math.max(0, Math.min(255, b));
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Hue/Saturation/Lightness Adjustment
 * @param {ImageData} imageData - Source image
 * @param {number} hue - Hue shift (-180 to 180)
 * @param {number} saturation - Saturation (-100 to 100)
 * @param {number} lightness - Lightness (-100 to 100)
 * @returns {ImageData} - Adjusted image
 */
export function applyHueSaturationLightness(imageData, hue = 0, saturation = 0, lightness = 0) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  const saturationMultiplier = 1 + saturation / 100;
  const lightnessValue = lightness * 2.55;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Convert RGB to HSL
    let hsl = rgbToHsl(r, g, b);
    
    // Apply adjustments
    hsl.h = (hsl.h + hue / 360) % 1;
    if (hsl.h < 0) hsl.h += 1;
    
    hsl.s = Math.max(0, Math.min(1, hsl.s * saturationMultiplier));
    hsl.l = Math.max(0, Math.min(1, hsl.l + lightness / 100));
    
    // Convert back to RGB
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    
    result.data[i] = rgb.r;
    result.data[i + 1] = rgb.g;
    result.data[i + 2] = rgb.b;
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h, s, l };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Color Balance Adjustment
 * @param {ImageData} imageData - Source image
 * @param {Object} shadows - { cyan-red, magenta-green, yellow-blue } (-100 to 100)
 * @param {Object} midtones - Same as shadows
 * @param {Object} highlights - Same as shadows
 * @returns {ImageData} - Adjusted image
 */
export function applyColorBalance(imageData, shadows = {}, midtones = {}, highlights = {}) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  const defaultBalance = { cyanRed: 0, magentaGreen: 0, yellowBlue: 0 };
  const s = { ...defaultBalance, ...shadows };
  const m = { ...defaultBalance, ...midtones };
  const h = { ...defaultBalance, ...highlights };
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Determine tone (shadows, midtones, highlights)
    const luminance = (r + g + b) / 3;
    const shadowWeight = luminance < 85 ? (85 - luminance) / 85 : 0;
    const highlightWeight = luminance > 170 ? (luminance - 170) / 85 : 0;
    const midtoneWeight = 1 - shadowWeight - highlightWeight;
    
    // Apply color balance
    const cr = s.cyanRed * shadowWeight + m.cyanRed * midtoneWeight + h.cyanRed * highlightWeight;
    const mg = s.magentaGreen * shadowWeight + m.magentaGreen * midtoneWeight + h.magentaGreen * highlightWeight;
    const yb = s.yellowBlue * shadowWeight + m.yellowBlue * midtoneWeight + h.yellowBlue * highlightWeight;
    
    result.data[i] = Math.max(0, Math.min(255, r + cr));
    result.data[i + 1] = Math.max(0, Math.min(255, g + mg));
    result.data[i + 2] = Math.max(0, Math.min(255, b + yb));
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Vibrance Adjustment (smart saturation)
 * @param {ImageData} imageData - Source image
 * @param {number} vibrance - Vibrance amount (-100 to 100)
 * @returns {ImageData} - Adjusted image
 */
export function applyVibrance(imageData, vibrance = 0) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  const vibranceMultiplier = 1 + vibrance / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const max = Math.max(r, g, b);
    const avg = (r + g + b) / 3;
    const amt = Math.abs(max - avg) * 2 / 255;
    
    const hsl = rgbToHsl(r, g, b);
    hsl.s = Math.max(0, Math.min(1, hsl.s + (vibranceMultiplier - 1) * amt));
    
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    
    result.data[i] = rgb.r;
    result.data[i + 1] = rgb.g;
    result.data[i + 2] = rgb.b;
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Sharpen Filter
 * @param {ImageData} imageData - Source image
 * @param {number} amount - Sharpen amount (0-100)
 * @returns {ImageData} - Sharpened image
 */
export function applySharpen(imageData, amount = 50) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Unsharp mask kernel
  const strength = amount / 50;
  const kernel = [
    [0, -strength, 0],
    [-strength, 1 + 4 * strength, -strength],
    [0, -strength, 0]
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[ky + 1][kx + 1];
          
          r += data[pixelIndex] * weight;
          g += data[pixelIndex + 1] * weight;
          b += data[pixelIndex + 2] * weight;
        }
      }
      
      const index = (y * width + x) * 4;
      result.data[index] = Math.max(0, Math.min(255, r));
      result.data[index + 1] = Math.max(0, Math.min(255, g));
      result.data[index + 2] = Math.max(0, Math.min(255, b));
      result.data[index + 3] = data[index + 3];
    }
  }
  
  // Copy edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        const index = (y * width + x) * 4;
        result.data[index] = data[index];
        result.data[index + 1] = data[index + 1];
        result.data[index + 2] = data[index + 2];
        result.data[index + 3] = data[index + 3];
      }
    }
  }
  
  return result;
}

/**
 * Noise Reduction
 * @param {ImageData} imageData - Source image
 * @param {number} strength - Strength (0-100)
 * @returns {ImageData} - Denoised image
 */
export function applyNoiseReduction(imageData, strength = 50) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  const radius = Math.round(strength / 20) + 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixels = [];
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const pixelIndex = (ny * width + nx) * 4;
            pixels.push([data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2]]);
          }
        }
      }
      
      // Median filter
      pixels.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
      const median = pixels[Math.floor(pixels.length / 2)];
      
      const index = (y * width + x) * 4;
      result.data[index] = median[0];
      result.data[index + 1] = median[1];
      result.data[index + 2] = median[2];
      result.data[index + 3] = data[index + 3];
    }
  }
  
  return result;
}

/**
 * Vignette Effect
 * @param {ImageData} imageData - Source image
 * @param {number} amount - Amount (0-100)
 * @param {number} falloff - Falloff (0-100)
 * @returns {ImageData} - Image with vignette
 */
export function applyVignette(imageData, amount = 50, falloff = 50) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
  
  const strength = amount / 100;
  const power = 2 + falloff / 25;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const factor = 1 - Math.pow(distance / maxDistance, power) * strength;
      
      const index = (y * width + x) * 4;
      result.data[index] = Math.round(data[index] * factor);
      result.data[index + 1] = Math.round(data[index + 1] * factor);
      result.data[index + 2] = Math.round(data[index + 2] * factor);
    }
  }
  
  return result;
}

/**
 * Exposure Adjustment
 * @param {ImageData} imageData - Source image
 * @param {number} exposure - Exposure (-2 to 2)
 * @returns {ImageData} - Adjusted image
 */
export function applyExposure(imageData, exposure = 0) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  const multiplier = Math.pow(2, exposure);
  
  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = Math.max(0, Math.min(255, data[i] * multiplier));
    result.data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * multiplier));
    result.data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * multiplier));
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}

/**
 * Temperature and Tint Adjustment
 * @param {ImageData} imageData - Source image
 * @param {number} temperature - Temperature (-100 to 100, negative=cooler, positive=warmer)
 * @param {number} tint - Tint (-100 to 100, negative=green, positive=magenta)
 * @returns {ImageData} - Adjusted image
 */
export function applyTemperatureTint(imageData, temperature = 0, tint = 0) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply temperature
    if (temperature > 0) {
      r += temperature * 0.5;
      b -= temperature * 0.3;
    } else {
      r += temperature * 0.3;
      b -= temperature * 0.5;
    }
    
    // Apply tint
    if (tint > 0) {
      r += tint * 0.3;
      g -= tint * 0.2;
    } else {
      g -= tint * 0.3;
      r += tint * 0.2;
    }
    
    result.data[i] = Math.max(0, Math.min(255, r));
    result.data[i + 1] = Math.max(0, Math.min(255, g));
    result.data[i + 2] = Math.max(0, Math.min(255, b));
    result.data[i + 3] = data[i + 3];
  }
  
  return result;
}
