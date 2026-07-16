// Background Editing Tools - AI Removal, Replacement, Blur Effects
// Using free client-side processing with TensorFlow.js and MediaPipe

import * as tf from '@tensorflow/tfjs';

/**
 * AI Background Removal using BodyPix (free, client-side)
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @returns {Promise<ImageData>} - Alpha mask
 */
export async function aiBackgroundRemoval(canvas) {
  // Load BodyPix model (free, runs in browser)
  const net = await loadBodyPixModel();
  
  const segmentation = await net.segmentPerson(canvas, {
    flipHorizontal: false,
    internalResolution: 'medium',
    segmentationThreshold: 0.7,
  });
  
  const { width, height, data } = segmentation;
  const mask = new ImageData(width, height);
  
  // Create alpha mask (white=person, black=background)
  for (let i = 0; i < data.length; i++) {
    const pixelIndex = i * 4;
    const value = data[i] === 1 ? 255 : 0; // 1=person, 0=background
    mask.data[pixelIndex] = value;
    mask.data[pixelIndex + 1] = value;
    mask.data[pixelIndex + 2] = value;
    mask.data[pixelIndex + 3] = 255;
  }
  
  return mask;
}

/**
 * Load BodyPix model (cached)
 */
let bodyPixModel = null;
async function loadBodyPixModel() {
  if (!bodyPixModel) {
    // Use lightweight version for performance
    bodyPixModel = await window.bodyPix?.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2
    });
  }
  return bodyPixModel;
}

/**
 * Smart Background Removal with Edge Refinement
 * @param {ImageData} imageData - Source image
 * @param {ImageData} roughMask - Rough segmentation mask
 * @returns {ImageData} - Refined alpha mask
 */
export function refineBackgroundMask(imageData, roughMask) {
  const { data, width, height } = imageData;
  const mask = new ImageData(width, height);
  mask.data.set(roughMask.data);
  
  // Trimap generation: definite foreground, definite background, unknown
  const trimap = generateTrimap(roughMask, 10);
  
  // Alpha matting on unknown regions
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      
      if (trimap[index] === 128) { // Unknown region
        const alpha = estimateAlpha(data, trimap, x, y, width, height);
        mask.data[pixelIndex] = alpha;
        mask.data[pixelIndex + 1] = alpha;
        mask.data[pixelIndex + 2] = alpha;
      }
    }
  }
  
  return mask;
}

/**
 * Generate trimap: 0=background, 128=unknown, 255=foreground
 */
function generateTrimap(mask, erosionSize) {
  const { data, width, height } = mask;
  const trimap = new Uint8Array(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      const value = data[pixelIndex];
      
      // Check neighborhood
      let minNeighbor = 255;
      let maxNeighbor = 0;
      
      for (let dy = -erosionSize; dy <= erosionSize; dy++) {
        for (let dx = -erosionSize; dx <= erosionSize; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborValue = data[(ny * width + nx) * 4];
            minNeighbor = Math.min(minNeighbor, neighborValue);
            maxNeighbor = Math.max(maxNeighbor, neighborValue);
          }
        }
      }
      
      if (minNeighbor === maxNeighbor) {
        trimap[index] = value; // Definite
      } else {
        trimap[index] = 128; // Unknown
      }
    }
  }
  
  return trimap;
}

/**
 * Estimate alpha value for unknown pixels
 */
function estimateAlpha(imageData, trimap, x, y, width, height) {
  const index = y * width + x;
  const pixelIndex = index * 4;
  
  const r = imageData[pixelIndex];
  const g = imageData[pixelIndex + 1];
  const b = imageData[pixelIndex + 2];
  
  // Sample foreground and background colors from neighbors
  let fgCount = 0, bgCount = 0;
  let fgR = 0, fgG = 0, fgB = 0;
  let bgR = 0, bgG = 0, bgB = 0;
  
  const radius = 5;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIndex = ny * width + nx;
        const nPixelIndex = nIndex * 4;
        
        if (trimap[nIndex] === 255) {
          fgR += imageData[nPixelIndex];
          fgG += imageData[nPixelIndex + 1];
          fgB += imageData[nPixelIndex + 2];
          fgCount++;
        } else if (trimap[nIndex] === 0) {
          bgR += imageData[nPixelIndex];
          bgG += imageData[nPixelIndex + 1];
          bgB += imageData[nPixelIndex + 2];
          bgCount++;
        }
      }
    }
  }
  
  if (fgCount === 0 || bgCount === 0) {
    return 128; // Default to semi-transparent
  }
  
  fgR /= fgCount; fgG /= fgCount; fgB /= fgCount;
  bgR /= bgCount; bgG /= bgCount; bgB /= bgCount;
  
  // Calculate alpha based on color difference
  const distToFg = Math.sqrt(
    (r - fgR) ** 2 + (g - fgG) ** 2 + (b - fgB) ** 2
  );
  const distToBg = Math.sqrt(
    (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2
  );
  
  const alpha = Math.round(255 * (distToBg / (distToFg + distToBg)));
  return Math.max(0, Math.min(255, alpha));
}

/**
 * Apply background replacement
 * @param {ImageData} foreground - Foreground with alpha
 * @param {ImageData} background - New background image
 * @returns {ImageData} - Composite image
 */
export function replaceBackground(foreground, background) {
  const { data: fgData, width, height } = foreground;
  const { data: bgData } = background;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < fgData.length; i += 4) {
    const alpha = fgData[i + 3] / 255;
    
    result.data[i] = Math.round(fgData[i] * alpha + bgData[i] * (1 - alpha));
    result.data[i + 1] = Math.round(fgData[i + 1] * alpha + bgData[i + 1] * (1 - alpha));
    result.data[i + 2] = Math.round(fgData[i + 2] * alpha + bgData[i + 2] * (1 - alpha));
    result.data[i + 3] = 255;
  }
  
  return result;
}

/**
 * Background Blur Effect (Bokeh)
 * @param {ImageData} imageData - Source image
 * @param {ImageData} mask - Foreground mask (white=keep sharp, black=blur)
 * @param {number} blurAmount - Blur strength (0-100)
 * @returns {ImageData} - Blurred background image
 */
export function backgroundBlur(imageData, mask, blurAmount = 50) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  const radius = Math.round(blurAmount / 5);
  const blurred = gaussianBlur(imageData, radius);
  
  // Blend based on mask
  for (let i = 0; i < data.length; i += 4) {
    const maskValue = mask.data[i] / 255; // 1=foreground, 0=background
    
    result.data[i] = Math.round(data[i] * maskValue + blurred.data[i] * (1 - maskValue));
    result.data[i + 1] = Math.round(data[i + 1] * maskValue + blurred.data[i + 1] * (1 - maskValue));
    result.data[i + 2] = Math.round(data[i + 2] * maskValue + blurred.data[i + 2] * (1 - maskValue));
    result.data[i + 3] = 255;
  }
  
  return result;
}

/**
 * Gaussian Blur
 * @param {ImageData} imageData - Source image
 * @param {number} radius - Blur radius
 * @returns {ImageData} - Blurred image
 */
export function gaussianBlur(imageData, radius) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Create Gaussian kernel
  const kernel = createGaussianKernel2D(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      let weightSum = 0;
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const nx = x + kx - halfKernel;
          const ny = y + ky - halfKernel;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const pixelIndex = (ny * width + nx) * 4;
            const weight = kernel[ky][kx];
            
            r += data[pixelIndex] * weight;
            g += data[pixelIndex + 1] * weight;
            b += data[pixelIndex + 2] * weight;
            weightSum += weight;
          }
        }
      }
      
      const index = (y * width + x) * 4;
      result.data[index] = Math.round(r / weightSum);
      result.data[index + 1] = Math.round(g / weightSum);
      result.data[index + 2] = Math.round(b / weightSum);
      result.data[index + 3] = data[index + 3];
    }
  }
  
  return result;
}

/**
 * Create 2D Gaussian kernel
 */
function createGaussianKernel2D(radius) {
  const size = radius * 2 + 1;
  const kernel = [];
  const sigma = radius / 3;
  let sum = 0;
  
  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - radius;
      const dy = y - radius;
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[y][x] = value;
      sum += value;
    }
  }
  
  // Normalize
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }
  
  return kernel;
}

/**
 * Depth Map Blur (simulate depth of field)
 * @param {ImageData} imageData - Source image
 * @param {number} focusY - Focus point Y coordinate (0-1)
 * @param {number} focusRange - Focus range (0-1)
 * @returns {ImageData} - Depth blurred image
 */
export function depthBlur(imageData, focusY = 0.5, focusRange = 0.2) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  for (let y = 0; y < height; y++) {
    const normalizedY = y / height;
    const distance = Math.abs(normalizedY - focusY);
    
    // Calculate blur amount based on distance from focus
    let blurRadius = 0;
    if (distance > focusRange) {
      blurRadius = Math.round(((distance - focusRange) / (1 - focusRange)) * 20);
    }
    
    if (blurRadius === 0) {
      // No blur, copy directly
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        result.data[index] = data[index];
        result.data[index + 1] = data[index + 1];
        result.data[index + 2] = data[index + 2];
        result.data[index + 3] = data[index + 3];
      }
    } else {
      // Apply blur to this row
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dx = -blurRadius; dx <= blurRadius; dx++) {
          const nx = x + dx;
          if (nx >= 0 && nx < width) {
            const pixelIndex = (y * width + nx) * 4;
            r += data[pixelIndex];
            g += data[pixelIndex + 1];
            b += data[pixelIndex + 2];
            count++;
          }
        }
        
        const index = (y * width + x) * 4;
        result.data[index] = Math.round(r / count);
        result.data[index + 1] = Math.round(g / count);
        result.data[index + 2] = Math.round(b / count);
        result.data[index + 3] = data[index + 3];
      }
    }
  }
  
  return result;
}

/**
 * Generate solid color background
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {string} color - Color in hex format
 * @returns {ImageData} - Solid color background
 */
export function createSolidBackground(width, height, color) {
  const result = new ImageData(width, height);
  const rgb = hexToRgb(color);
  
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i] = rgb.r;
    result.data[i + 1] = rgb.g;
    result.data[i + 2] = rgb.b;
    result.data[i + 3] = 255;
  }
  
  return result;
}

/**
 * Generate gradient background
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {string} color1 - Start color
 * @param {string} color2 - End color
 * @param {string} direction - 'horizontal', 'vertical', 'diagonal', 'radial'
 * @returns {ImageData} - Gradient background
 */
export function createGradientBackground(width, height, color1, color2, direction = 'vertical') {
  const result = new ImageData(width, height);
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let t = 0;
      
      switch (direction) {
        case 'horizontal':
          t = x / width;
          break;
        case 'vertical':
          t = y / height;
          break;
        case 'diagonal':
          t = (x + y) / (width + height);
          break;
        case 'radial':
          const cx = width / 2;
          const cy = height / 2;
          const maxDist = Math.sqrt(cx * cx + cy * cy);
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
          t = dist / maxDist;
          break;
        default:
          t = y / height;
      }
      
      const index = (y * width + x) * 4;
      result.data[index] = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
      result.data[index + 1] = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
      result.data[index + 2] = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
      result.data[index + 3] = 255;
    }
  }
  
  return result;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Smart Shadow Generation for foreground
 * @param {ImageData} mask - Foreground mask
 * @param {number} angle - Shadow angle in degrees
 * @param {number} distance - Shadow distance
 * @param {number} blur - Shadow blur
 * @param {number} opacity - Shadow opacity (0-1)
 * @returns {ImageData} - Shadow layer
 */
export function generateShadow(mask, angle = 135, distance = 10, blur = 15, opacity = 0.5) {
  const { data, width, height } = mask;
  const shadow = new ImageData(width, height);
  
  // Calculate offset based on angle
  const radians = (angle * Math.PI) / 180;
  const offsetX = Math.round(Math.cos(radians) * distance);
  const offsetY = Math.round(Math.sin(radians) * distance);
  
  // Create shadow from mask
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - offsetX;
      const sy = y - offsetY;
      
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        const sourceIndex = (sy * width + sx) * 4;
        const targetIndex = (y * width + x) * 4;
        const maskValue = data[sourceIndex];
        
        if (maskValue > 0) {
          shadow.data[targetIndex] = 0;
          shadow.data[targetIndex + 1] = 0;
          shadow.data[targetIndex + 2] = 0;
          shadow.data[targetIndex + 3] = Math.round(maskValue * opacity);
        }
      }
    }
  }
  
  // Apply blur to shadow
  return gaussianBlur(shadow, blur);
}
