// Advanced Selection Tools - Magic Wand, Quick Select, AI Object Selection

/**
 * Magic Wand Selection - Select similar colored pixels
 * @param {ImageData} imageData - Canvas image data
 * @param {number} x - Click x coordinate
 * @param {number} y - Click y coordinate
 * @param {number} tolerance - Color tolerance (0-255)
 * @returns {Array} - Array of selected pixel coordinates
 */
export function magicWandSelect(imageData, x, y, tolerance = 32) {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const selected = [];
  
  // Get target color at click point
  const startIndex = (y * width + x) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];
  
  // Flood fill algorithm
  const queue = [[x, y]];
  
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    const index = cy * width + cx;
    
    if (cx < 0 || cx >= width || cy < 0 || cy >= height || visited[index]) {
      continue;
    }
    
    const pixelIndex = index * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const a = data[pixelIndex + 3];
    
    // Check if color is within tolerance
    const colorDiff = Math.sqrt(
      Math.pow(r - targetR, 2) +
      Math.pow(g - targetG, 2) +
      Math.pow(b - targetB, 2) +
      Math.pow(a - targetA, 2)
    );
    
    if (colorDiff <= tolerance) {
      visited[index] = 1;
      selected.push([cx, cy]);
      
      // Add neighbors to queue
      queue.push([cx + 1, cy]);
      queue.push([cx - 1, cy]);
      queue.push([cx, cy + 1]);
      queue.push([cx, cy - 1]);
    }
  }
  
  return selected;
}

/**
 * Color Range Selection - Select all pixels within color range
 * @param {ImageData} imageData - Canvas image data
 * @param {Object} targetColor - Target color {r, g, b}
 * @param {number} tolerance - Color tolerance (0-255)
 * @returns {ImageData} - Selection mask (white=selected, black=not selected)
 */
export function colorRangeSelect(imageData, targetColor, tolerance = 32) {
  const { data, width, height } = imageData;
  const mask = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const colorDiff = Math.sqrt(
      Math.pow(r - targetColor.r, 2) +
      Math.pow(g - targetColor.g, 2) +
      Math.pow(b - targetColor.b, 2)
    );
    
    if (colorDiff <= tolerance) {
      mask.data[i] = 255;
      mask.data[i + 1] = 255;
      mask.data[i + 2] = 255;
      mask.data[i + 3] = 255;
    } else {
      mask.data[i] = 0;
      mask.data[i + 1] = 0;
      mask.data[i + 2] = 0;
      mask.data[i + 3] = 255;
    }
  }
  
  return mask;
}

/**
 * Quick Select - Edge-based selection expansion
 * @param {ImageData} imageData - Canvas image data
 * @param {Array} seedPoints - Initial seed points [[x, y], ...]
 * @param {number} edgeThreshold - Edge detection threshold (0-255)
 * @returns {ImageData} - Selection mask
 */
export function quickSelect(imageData, seedPoints, edgeThreshold = 30) {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  
  // Calculate edge map using Sobel operator
  const edges = detectEdges(imageData, edgeThreshold);
  
  // Expand from seed points using region growing
  const queue = [...seedPoints];
  const visited = new Uint8Array(width * height);
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const index = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || visited[index]) {
      continue;
    }
    
    visited[index] = 1;
    mask[index] = 255;
    
    // If not on an edge, expand to neighbors
    if (edges[index] < edgeThreshold) {
      queue.push([x + 1, y]);
      queue.push([x - 1, y]);
      queue.push([x, cy + 1]);
      queue.push([x, y - 1]);
      // Diagonal neighbors
      queue.push([x + 1, y + 1]);
      queue.push([x + 1, y - 1]);
      queue.push([x - 1, y + 1]);
      queue.push([x - 1, y - 1]);
    }
  }
  
  // Convert to ImageData
  const result = new ImageData(width, height);
  for (let i = 0; i < mask.length; i++) {
    const pixelIndex = i * 4;
    result.data[pixelIndex] = mask[i];
    result.data[pixelIndex + 1] = mask[i];
    result.data[pixelIndex + 2] = mask[i];
    result.data[pixelIndex + 3] = 255;
  }
  
  return result;
}

/**
 * Edge Detection using Sobel operator
 * @param {ImageData} imageData - Canvas image data
 * @param {number} threshold - Edge threshold
 * @returns {Uint8Array} - Edge map
 */
function detectEdges(imageData, threshold = 30) {
  const { data, width, height } = imageData;
  const edges = new Uint8Array(width * height);
  
  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      // Apply Sobel operators
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
          const gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
          
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > threshold ? 255 : 0;
    }
  }
  
  return edges;
}

/**
 * Feather Selection - Smooth selection edges
 * @param {ImageData} selectionMask - Selection mask
 * @param {number} featherRadius - Feather radius in pixels
 * @returns {ImageData} - Feathered selection mask
 */
export function featherSelection(selectionMask, featherRadius = 5) {
  const { data, width, height } = selectionMask;
  const result = new ImageData(width, height);
  
  // Gaussian blur for feathering
  const kernel = createGaussianKernel(featherRadius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const nx = x + kx - halfKernel;
          const ny = y + ky - halfKernel;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const pixelIndex = (ny * width + nx) * 4;
            const weight = kernel[ky][kx];
            sum += data[pixelIndex] * weight;
            weightSum += weight;
          }
        }
      }
      
      const value = Math.round(sum / weightSum);
      const index = (y * width + x) * 4;
      result.data[index] = value;
      result.data[index + 1] = value;
      result.data[index + 2] = value;
      result.data[index + 3] = 255;
    }
  }
  
  return result;
}

/**
 * Create Gaussian Kernel for blur
 * @param {number} radius - Kernel radius
 * @returns {Array} - 2D kernel
 */
function createGaussianKernel(radius) {
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
 * Expand Selection
 * @param {ImageData} selectionMask - Selection mask
 * @param {number} pixels - Number of pixels to expand
 * @returns {ImageData} - Expanded selection
 */
export function expandSelection(selectionMask, pixels = 5) {
  const { data, width, height } = selectionMask;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  for (let iteration = 0; iteration < pixels; iteration++) {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(result.data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4;
        
        if (result.data[index] === 0) {
          // Check if any neighbor is selected
          const neighbors = [
            result.data[((y - 1) * width + x) * 4],
            result.data[((y + 1) * width + x) * 4],
            result.data[(y * width + (x - 1)) * 4],
            result.data[(y * width + (x + 1)) * 4],
          ];
          
          if (neighbors.some(n => n === 255)) {
            temp[index] = 255;
            temp[index + 1] = 255;
            temp[index + 2] = 255;
          }
        }
      }
    }
    
    result.data.set(temp);
  }
  
  return result;
}

/**
 * Contract Selection
 * @param {ImageData} selectionMask - Selection mask
 * @param {number} pixels - Number of pixels to contract
 * @returns {ImageData} - Contracted selection
 */
export function contractSelection(selectionMask, pixels = 5) {
  const { data, width, height } = selectionMask;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  for (let iteration = 0; iteration < pixels; iteration++) {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(result.data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = (y * width + x) * 4;
        
        if (result.data[index] === 255) {
          // Check if any neighbor is not selected
          const neighbors = [
            result.data[((y - 1) * width + x) * 4],
            result.data[((y + 1) * width + x) * 4],
            result.data[(y * width + (x - 1)) * 4],
            result.data[(y * width + (x + 1)) * 4],
          ];
          
          if (neighbors.some(n => n === 0)) {
            temp[index] = 0;
            temp[index + 1] = 0;
            temp[index + 2] = 0;
          }
        }
      }
    }
    
    result.data.set(temp);
  }
  
  return result;
}

/**
 * Invert Selection
 * @param {ImageData} selectionMask - Selection mask
 * @returns {ImageData} - Inverted selection
 */
export function invertSelection(selectionMask) {
  const { data, width, height } = selectionMask;
  const result = new ImageData(width, height);
  
  for (let i = 0; i < data.length; i += 4) {
    result.data[i] = 255 - data[i];
    result.data[i + 1] = 255 - data[i + 1];
    result.data[i + 2] = 255 - data[i + 2];
    result.data[i + 3] = 255;
  }
  
  return result;
}

/**
 * Convert selection mask to SVG path for Fabric.js
 * @param {ImageData} selectionMask - Selection mask
 * @param {number} simplifyTolerance - Path simplification tolerance
 * @returns {string} - SVG path string
 */
export function selectionToPath(selectionMask, simplifyTolerance = 2) {
  const { data, width, height } = selectionMask;
  const contours = findContours(selectionMask);
  
  if (contours.length === 0) return '';
  
  // Use the largest contour
  const largestContour = contours.reduce((max, contour) => 
    contour.length > max.length ? contour : max
  );
  
  // Simplify path
  const simplified = simplifyPath(largestContour, simplifyTolerance);
  
  // Convert to SVG path
  if (simplified.length < 2) return '';
  
  let path = `M ${simplified[0][0]} ${simplified[0][1]}`;
  for (let i = 1; i < simplified.length; i++) {
    path += ` L ${simplified[i][0]} ${simplified[i][1]}`;
  }
  path += ' Z';
  
  return path;
}

/**
 * Find contours in selection mask
 * @param {ImageData} selectionMask - Selection mask
 * @returns {Array} - Array of contours
 */
function findContours(selectionMask) {
  const { data, width, height } = selectionMask;
  const visited = new Uint8Array(width * height);
  const contours = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const pixelIndex = index * 4;
      
      if (data[pixelIndex] === 255 && !visited[index]) {
        const contour = traceContour(data, width, height, x, y, visited);
        if (contour.length > 10) {
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
}

/**
 * Trace contour from starting point
 * @param {Uint8ClampedArray} data - Image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} startX - Start X coordinate
 * @param {number} startY - Start Y coordinate
 * @param {Uint8Array} visited - Visited pixels array
 * @returns {Array} - Contour points
 */
function traceContour(data, width, height, startX, startY, visited) {
  const contour = [];
  const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  
  let x = startX, y = startY;
  let dir = 0;
  
  do {
    contour.push([x, y]);
    visited[y * width + x] = 1;
    
    // Find next point
    let found = false;
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = x + directions[checkDir][0];
      const ny = y + directions[checkDir][1];
      
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const pixelIndex = (ny * width + nx) * 4;
        if (data[pixelIndex] === 255 && !visited[ny * width + nx]) {
          x = nx;
          y = ny;
          dir = checkDir;
          found = true;
          break;
        }
      }
    }
    
    if (!found || contour.length > width * height) break;
    
  } while (x !== startX || y !== startY);
  
  return contour;
}

/**
 * Simplify path using Ramer-Douglas-Peucker algorithm
 * @param {Array} points - Array of points [[x, y], ...]
 * @param {number} tolerance - Simplification tolerance
 * @returns {Array} - Simplified points
 */
function simplifyPath(points, tolerance) {
  if (points.length < 3) return points;
  
  const sqTolerance = tolerance * tolerance;
  let maxDistance = 0;
  let maxIndex = 0;
  
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  
  if (maxDistance > sqTolerance) {
    const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPath(points.slice(maxIndex), tolerance);
    return left.slice(0, -1).concat(right);
  }
  
  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line
 * @param {Array} point - Point [x, y]
 * @param {Array} lineStart - Line start [x, y]
 * @param {Array} lineEnd - Line end [x, y]
 * @returns {number} - Distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  }
  
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  
  if (t < 0) {
    return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
  } else if (t > 1) {
    return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
  }
  
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  
  return Math.sqrt((x - projX) * (x - projX) + (y - projY) * (y - projY));
}
