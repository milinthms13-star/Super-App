// AR Features - Face Filters, Virtual Try-On using MediaPipe (Free!)
// MediaPipe Face Detection, Face Mesh, and Selfie Segmentation

import { FaceLandmarker, FaceDetector, ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker = null;
let faceDetector = null;
let imageSegmenter = null;

/**
 * Initialize MediaPipe models (free, client-side)
 */
export async function initializeMediaPipe() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  // Face Landmarker for detailed face mesh
  if (!faceLandmarker) {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU"
      },
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      runningMode: "IMAGE",
      numFaces: 1
    });
  }

  // Face Detector for quick face detection
  if (!faceDetector) {
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        delegate: "GPU"
      },
      runningMode: "IMAGE"
    });
  }

  // Image Segmenter for selfie segmentation
  if (!imageSegmenter) {
    imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite",
        delegate: "GPU"
      },
      runningMode: "IMAGE",
      outputCategoryMask: true
    });
  }

  return { faceLandmarker, faceDetector, imageSegmenter };
}

/**
 * Detect faces in image
 * @param {HTMLCanvasElement|HTMLImageElement} image - Source image
 * @returns {Promise<Array>} - Array of detected faces with landmarks
 */
export async function detectFaces(image) {
  if (!faceDetector) {
    await initializeMediaPipe();
  }

  const detections = faceDetector.detect(image);
  return detections.detections;
}

/**
 * Get detailed face landmarks (468 points)
 * @param {HTMLCanvasElement|HTMLImageElement} image - Source image
 * @returns {Promise<Object>} - Face landmarks and blend shapes
 */
export async function getFaceLandmarks(image) {
  if (!faceLandmarker) {
    await initializeMediaPipe();
  }

  const result = faceLandmarker.detect(image);
  
  if (result.faceLandmarks && result.faceLandmarks.length > 0) {
    return {
      landmarks: result.faceLandmarks[0],
      blendShapes: result.faceBlendshapes?.[0],
      transformationMatrix: result.facialTransformationMatrixes?.[0]
    };
  }
  
  return null;
}

/**
 * Apply virtual makeup
 * @param {HTMLCanvasElement} canvas - Canvas with face image
 * @param {Object} landmarks - Face landmarks
 * @param {Object} makeup - Makeup settings
 * @returns {ImageData} - Image with makeup applied
 */
export function applyVirtualMakeup(canvas, landmarks, makeup) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Lip color
  if (makeup.lipstick) {
    applyLipstick(ctx, landmarks, makeup.lipstick.color, makeup.lipstick.opacity);
  }
  
  // Eye shadow
  if (makeup.eyeShadow) {
    applyEyeShadow(ctx, landmarks, makeup.eyeShadow.color, makeup.eyeShadow.opacity);
  }
  
  // Eyeliner
  if (makeup.eyeliner) {
    applyEyeliner(ctx, landmarks, makeup.eyeliner.color, makeup.eyeliner.thickness);
  }
  
  // Blush
  if (makeup.blush) {
    applyBlush(ctx, landmarks, makeup.blush.color, makeup.blush.opacity);
  }
  
  // Eyebrow enhancement
  if (makeup.eyebrows) {
    enhanceEyebrows(ctx, landmarks, makeup.eyebrows.color, makeup.eyebrows.thickness);
  }
  
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Apply lipstick
 */
function applyLipstick(ctx, landmarks, color, opacity = 0.6) {
  // Lip landmarks: 61-68 (outer), 78-88 (inner)
  const upperLip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
  const lowerLip = [146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
  
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  
  // Draw upper lip
  ctx.beginPath();
  upperLip.forEach((index, i) => {
    const point = landmarks[index];
    const x = point.x * ctx.canvas.width;
    const y = point.y * ctx.canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  
  // Draw lower lip
  ctx.beginPath();
  lowerLip.forEach((index, i) => {
    const point = landmarks[index];
    const x = point.x * ctx.canvas.width;
    const y = point.y * ctx.canvas.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

/**
 * Apply eye shadow
 */
function applyEyeShadow(ctx, landmarks, color, opacity = 0.4) {
  // Eye landmarks for shadow
  const leftEye = [33, 7, 163, 144, 145, 153, 154, 155, 133];
  const rightEye = [362, 382, 381, 380, 374, 373, 390, 249, 263];
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  
  // Left eye
  [leftEye, rightEye].forEach(eye => {
    const centerX = eye.reduce((sum, i) => sum + landmarks[i].x, 0) / eye.length * ctx.canvas.width;
    const centerY = eye.reduce((sum, i) => sum + landmarks[i].y, 0) / eye.length * ctx.canvas.height;
    
    ctx.fillStyle = gradient;
    ctx.translate(centerX, centerY);
    ctx.scale(2, 1.5);
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  });
  
  ctx.restore();
}

/**
 * Apply eyeliner
 */
function applyEyeliner(ctx, landmarks, color, thickness = 2) {
  const leftEyeUpper = [33, 7, 163, 144, 145, 153, 154, 155, 133];
  const rightEyeUpper = [362, 382, 381, 380, 374, 373, 390, 249, 263];
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  [leftEyeUpper, rightEyeUpper].forEach(eye => {
    ctx.beginPath();
    eye.forEach((index, i) => {
      const point = landmarks[index];
      const x = point.x * ctx.canvas.width;
      const y = point.y * ctx.canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  
  ctx.restore();
}

/**
 * Apply blush
 */
function applyBlush(ctx, landmarks, color, opacity = 0.3) {
  // Cheek landmarks
  const leftCheek = landmarks[205];
  const rightCheek = landmarks[425];
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  
  // Left cheek
  ctx.translate(leftCheek.x * ctx.canvas.width, leftCheek.y * ctx.canvas.height);
  ctx.scale(1.5, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();
  
  // Right cheek
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(rightCheek.x * ctx.canvas.width, rightCheek.y * ctx.canvas.height);
  ctx.scale(1.5, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

/**
 * Enhance eyebrows
 */
function enhanceEyebrows(ctx, landmarks, color, thickness = 2) {
  const leftBrow = [70, 63, 105, 66, 107, 55, 65];
  const rightBrow = [336, 296, 334, 293, 300, 285, 295];
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  [leftBrow, rightBrow].forEach(brow => {
    ctx.beginPath();
    brow.forEach((index, i) => {
      const point = landmarks[index];
      const x = point.x * ctx.canvas.width;
      const y = point.y * ctx.canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  
  ctx.restore();
}

/**
 * Virtual eyewear try-on
 * @param {HTMLCanvasElement} canvas - Canvas with face
 * @param {Object} landmarks - Face landmarks
 * @param {HTMLImageElement} glassesImage - Glasses image
 * @returns {ImageData} - Image with glasses
 */
export function applyVirtualGlasses(canvas, landmarks, glassesImage) {
  const ctx = canvas.getContext('2d');
  
  // Get eye positions
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  
  const eyeDistance = Math.sqrt(
    Math.pow((rightEye.x - leftEye.x) * canvas.width, 2) +
    Math.pow((rightEye.y - leftEye.y) * canvas.height, 2)
  );
  
  // Calculate glasses size and position
  const glassesWidth = eyeDistance * 2.5;
  const glassesHeight = glassesWidth * (glassesImage.height / glassesImage.width);
  
  const centerX = ((leftEye.x + rightEye.x) / 2) * canvas.width;
  const centerY = ((leftEye.y + rightEye.y) / 2) * canvas.height;
  
  // Calculate rotation angle
  const angle = Math.atan2(
    (rightEye.y - leftEye.y) * canvas.height,
    (rightEye.x - leftEye.x) * canvas.width
  );
  
  // Draw glasses
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle);
  ctx.drawImage(
    glassesImage,
    -glassesWidth / 2,
    -glassesHeight / 2,
    glassesWidth,
    glassesHeight
  );
  ctx.restore();
  
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Virtual jewelry try-on (earrings, necklace)
 * @param {HTMLCanvasElement} canvas - Canvas with face
 * @param {Object} landmarks - Face landmarks
 * @param {HTMLImageElement} jewelryImage - Jewelry image
 * @param {string} type - 'earrings' or 'necklace'
 * @returns {ImageData} - Image with jewelry
 */
export function applyVirtualJewelry(canvas, landmarks, jewelryImage, type = 'earrings') {
  const ctx = canvas.getContext('2d');
  
  if (type === 'earrings') {
    // Ear positions
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    
    const earringSize = 40;
    
    // Left earring
    ctx.drawImage(
      jewelryImage,
      leftEar.x * canvas.width - earringSize / 2,
      leftEar.y * canvas.height,
      earringSize,
      earringSize * (jewelryImage.height / jewelryImage.width)
    );
    
    // Right earring
    ctx.drawImage(
      jewelryImage,
      rightEar.x * canvas.width - earringSize / 2,
      rightEar.y * canvas.height,
      earringSize,
      earringSize * (jewelryImage.height / jewelryImage.width)
    );
  } else if (type === 'necklace') {
    // Neck/chin position
    const chin = landmarks[152];
    const necklaceWidth = canvas.width * 0.4;
    
    ctx.drawImage(
      jewelryImage,
      chin.x * canvas.width - necklaceWidth / 2,
      chin.y * canvas.height + 20,
      necklaceWidth,
      necklaceWidth * (jewelryImage.height / jewelryImage.width)
    );
  }
  
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Face filters (beauty, smooth, glow)
 * @param {ImageData} imageData - Source image
 * @param {Object} landmarks - Face landmarks
 * @param {string} filterType - Filter type
 * @param {number} intensity - Filter intensity (0-1)
 * @returns {ImageData} - Filtered image
 */
export function applyFaceFilter(imageData, landmarks, filterType, intensity = 0.5) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  // Create face mask
  const faceMask = createFaceMask(landmarks, width, height);
  
  switch (filterType) {
    case 'beauty':
      // Skin smoothing
      return applySkinSmoothing(result, faceMask, intensity);
    
    case 'glow':
      // Soft glow effect
      return applyGlowEffect(result, faceMask, intensity);
    
    case 'sharpen':
      // Face sharpening
      return applyFaceSharpening(result, faceMask, intensity);
    
    default:
      return result;
  }
}

/**
 * Create face mask from landmarks
 */
function createFaceMask(landmarks, width, height) {
  const mask = new Uint8Array(width * height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Face contour
  const faceOutline = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];
  
  ctx.fillStyle = 'white';
  ctx.beginPath();
  faceOutline.forEach((index, i) => {
    const point = landmarks[index];
    const x = point.x * width;
    const y = point.y * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  
  const imageData = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    mask[i / 4] = imageData.data[i];
  }
  
  return mask;
}

/**
 * Apply skin smoothing
 */
function applySkinSmoothing(imageData, mask, intensity) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  
  // Simple bilateral filter for skin smoothing
  const radius = 5;
  
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const index = (y * width + x) * 4;
      
      if (mask[y * width + x] > 128) {
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const nIndex = (ny * width + nx) * 4;
            
            r += data[nIndex];
            g += data[nIndex + 1];
            b += data[nIndex + 2];
            count++;
          }
        }
        
        const smoothR = r / count;
        const smoothG = g / count;
        const smoothB = b / count;
        
        result.data[index] = data[index] + (smoothR - data[index]) * intensity;
        result.data[index + 1] = data[index + 1] + (smoothG - data[index + 1]) * intensity;
        result.data[index + 2] = data[index + 2] + (smoothB - data[index + 2]) * intensity;
        result.data[index + 3] = data[index + 3];
      } else {
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
 * Apply glow effect
 */
function applyGlowEffect(imageData, mask, intensity) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    
    if (mask[pixelIndex] > 128) {
      const glow = intensity * 20;
      result.data[i] = Math.min(255, data[i] + glow);
      result.data[i + 1] = Math.min(255, data[i + 1] + glow);
      result.data[i + 2] = Math.min(255, data[i + 2] + glow);
    }
  }
  
  return result;
}

/**
 * Apply face sharpening
 */
function applyFaceSharpening(imageData, mask, intensity) {
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  const kernel = [
    [0, -intensity, 0],
    [-intensity, 1 + 4 * intensity, -intensity],
    [0, -intensity, 0]
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;
      
      if (mask[y * width + x] > 128) {
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
        
        result.data[index] = Math.max(0, Math.min(255, r));
        result.data[index + 1] = Math.max(0, Math.min(255, g));
        result.data[index + 2] = Math.max(0, Math.min(255, b));
      }
    }
  }
  
  return result;
}

/**
 * Hair color change
 * @param {ImageData} imageData - Source image
 * @param {Object} landmarks - Face landmarks
 * @param {string} color - Target hair color
 * @returns {ImageData} - Image with new hair color
 */
export function changeHairColor(imageData, landmarks, color) {
  // Simple implementation - detect hair region above forehead
  const { data, width, height } = imageData;
  const result = new ImageData(width, height);
  result.data.set(data);
  
  // Get forehead top
  const foreheadTop = Math.min(...[10, 338, 297, 332, 284].map(i => landmarks[i].y)) * height;
  
  // Simple hair detection - dark pixels above forehead
  const targetRGB = hexToRgb(color);
  
  for (let y = 0; y < foreheadTop; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      
      // Check if pixel is dark (likely hair)
      const brightness = (r + g + b) / 3;
      if (brightness < 100) {
        // Tint with target color
        result.data[index] = Math.round(r * 0.3 + targetRGB.r * 0.7);
        result.data[index + 1] = Math.round(g * 0.3 + targetRGB.g * 0.7);
        result.data[index + 2] = Math.round(b * 0.3 + targetRGB.b * 0.7);
      }
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
  } : { r: 0, g: 0, b: 0 };
}
