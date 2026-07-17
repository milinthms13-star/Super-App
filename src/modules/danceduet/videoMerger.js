/**
 * Video Merger Utility
 * Uses Canvas API to merge two videos with custom backgrounds
 * 100% client-side, no external APIs
 */

/**
 * Merge two videos into one with custom background
 * @param {Object} options - Merge options
 * @returns {Promise<{blob: Blob, url: string}>}
 */
export async function mergeVideos(options) {
  const {
    video1Element,
    video2Element,
    backgroundType = 'solid',
    backgroundColor = '#1a1a1a',
    backgroundImage = null,
    backgroundVideo = null,
    gradientStart = '#667eea',
    gradientEnd = '#764ba2',
    layoutMode = 'side-by-side',
    dancer1Position = { x: 0, y: 0, scale: 1 },
    dancer2Position = { x: 50, y: 0, scale: 1 },
    outputWidth = 1920,
    outputHeight = 1080,
    fps = 30,
    onProgress = null,
  } = options;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');

  // Calculate dimensions and positions
  const layout = calculateLayout(
    layoutMode,
    dancer1Position,
    dancer2Position,
    outputWidth,
    outputHeight
  );

  // Load background resources
  let bgImage = null;
  let bgVideoElement = null;

  if (backgroundType === 'image' && backgroundImage) {
    bgImage = await loadImage(backgroundImage);
  }

  if (backgroundType === 'video' && backgroundVideo) {
    bgVideoElement = document.createElement('video');
    bgVideoElement.src = backgroundVideo;
    bgVideoElement.loop = true;
    bgVideoElement.muted = true;
    await bgVideoElement.play();
  }

  // Get video durations
  const duration1 = video1Element.duration;
  const duration2 = video2Element.duration;
  const maxDuration = Math.max(duration1, duration2);

  // Reset videos to start
  video1Element.currentTime = 0;
  video2Element.currentTime = 0;

  // Create MediaRecorder
  const stream = canvas.captureStream(fps);
  
  // Add audio from video1 (primary audio)
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  
  // Mix audio from both videos
  if (video1Element.captureStream) {
    const audio1Stream = video1Element.captureStream();
    const audio1Track = audio1Stream.getAudioTracks()[0];
    if (audio1Track) {
      const source1 = audioContext.createMediaStreamSource(new MediaStream([audio1Track]));
      source1.connect(destination);
    }
  }
  
  if (video2Element.captureStream) {
    const audio2Stream = video2Element.captureStream();
    const audio2Track = audio2Stream.getAudioTracks()[0];
    if (audio2Track) {
      const source2 = audioContext.createMediaStreamSource(new MediaStream([audio2Track]));
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.5; // Reduce volume of second audio
      source2.connect(gainNode);
      gainNode.connect(destination);
    }
  }
  
  // Add audio tracks to stream
  destination.stream.getAudioTracks().forEach(track => {
    stream.addTrack(track);
  });

  const chunks = [];
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 5000000, // 5 Mbps
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const recordingPromise = new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    };

    mediaRecorder.onerror = (error) => {
      reject(error);
    };
  });

  // Start recording
  mediaRecorder.start();

  // Play both videos
  await video1Element.play();
  await video2Element.play();

  // Animation loop
  const startTime = Date.now();
  let frameCount = 0;
  const totalFrames = Math.ceil(maxDuration * fps);

  const renderFrame = () => {
    const currentTime = (Date.now() - startTime) / 1000;
    const progress = Math.min((currentTime / maxDuration) * 100, 100);

    if (onProgress) {
      onProgress(Math.round(progress));
    }

    // Draw background
    drawBackground(ctx, {
      type: backgroundType,
      color: backgroundColor,
      gradientStart,
      gradientEnd,
      image: bgImage,
      videoElement: bgVideoElement,
      width: outputWidth,
      height: outputHeight,
    });

    // Draw dancer 1
    if (video1Element.currentTime < duration1) {
      drawVideo(ctx, video1Element, layout.dancer1);
    }

    // Draw dancer 2
    if (video2Element.currentTime < duration2) {
      drawVideo(ctx, video2Element, layout.dancer2);
    }

    frameCount++;

    if (currentTime < maxDuration && frameCount < totalFrames) {
      requestAnimationFrame(renderFrame);
    } else {
      // Stop recording
      video1Element.pause();
      video2Element.pause();
      mediaRecorder.stop();
      
      // Cleanup
      if (bgVideoElement) {
        bgVideoElement.pause();
      }
      if (audioContext) {
        audioContext.close();
      }
    }
  };

  renderFrame();

  return recordingPromise;
}

/**
 * Calculate layout positions for dancers
 */
function calculateLayout(mode, pos1, pos2, width, height) {
  let dancer1, dancer2;

  switch (mode) {
    case 'side-by-side':
      dancer1 = {
        x: 0,
        y: 0,
        width: width / 2,
        height: height,
      };
      dancer2 = {
        x: width / 2,
        y: 0,
        width: width / 2,
        height: height,
      };
      break;

    case 'overlay':
      dancer1 = {
        x: 0,
        y: 0,
        width: width,
        height: height,
      };
      dancer2 = {
        x: (pos2.x / 100) * width,
        y: (pos2.y / 100) * height,
        width: width * pos2.scale,
        height: height * pos2.scale,
      };
      break;

    case 'picture-in-picture':
      dancer1 = {
        x: 0,
        y: 0,
        width: width,
        height: height,
      };
      dancer2 = {
        x: (pos2.x / 100) * width,
        y: (pos2.y / 100) * height,
        width: width * pos2.scale,
        height: height * pos2.scale,
      };
      break;

    default:
      dancer1 = {
        x: (pos1.x / 100) * width,
        y: (pos1.y / 100) * height,
        width: width * pos1.scale,
        height: height * pos1.scale,
      };
      dancer2 = {
        x: (pos2.x / 100) * width,
        y: (pos2.y / 100) * height,
        width: width * pos2.scale,
        height: height * pos2.scale,
      };
  }

  return { dancer1, dancer2 };
}

/**
 * Draw background on canvas
 */
function drawBackground(ctx, options) {
  const { type, color, gradientStart, gradientEnd, image, videoElement, width, height } = options;

  switch (type) {
    case 'solid':
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      break;

    case 'gradient':
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, gradientStart);
      gradient.addColorStop(1, gradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;

    case 'image':
      if (image) {
        ctx.drawImage(image, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      }
      break;

    case 'video':
      if (videoElement && videoElement.readyState >= 2) {
        ctx.drawImage(videoElement, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
      }
      break;

    default:
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draw video on canvas with proper aspect ratio
 */
function drawVideo(ctx, videoElement, layout) {
  if (videoElement.readyState < 2) return;

  const { x, y, width, height } = layout;
  const videoWidth = videoElement.videoWidth;
  const videoHeight = videoElement.videoHeight;
  const videoRatio = videoWidth / videoHeight;
  const targetRatio = width / height;

  let drawWidth, drawHeight, drawX, drawY;

  if (videoRatio > targetRatio) {
    // Video is wider
    drawHeight = height;
    drawWidth = height * videoRatio;
    drawX = x - (drawWidth - width) / 2;
    drawY = y;
  } else {
    // Video is taller
    drawWidth = width;
    drawHeight = width / videoRatio;
    drawX = x;
    drawY = y - (drawHeight - height) / 2;
  }

  // Draw with clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.drawImage(videoElement, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

/**
 * Load image from URL
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Generate preview frame
 */
export function generatePreviewFrame(options) {
  const {
    video1Element,
    video2Element,
    canvas,
    backgroundType,
    backgroundColor,
    backgroundImage,
    backgroundVideo,
    gradientStart,
    gradientEnd,
    layoutMode,
    dancer1Position,
    dancer2Position,
  } = options;

  if (!canvas || !video1Element || !video2Element) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Calculate layout
  const layout = calculateLayout(
    layoutMode,
    dancer1Position,
    dancer2Position,
    width,
    height
  );

  // Draw background
  drawBackground(ctx, {
    type: backgroundType,
    color: backgroundColor,
    gradientStart,
    gradientEnd,
    image: backgroundImage ? new Image() : null,
    videoElement: backgroundVideo ? document.createElement('video') : null,
    width,
    height,
  });

  // Draw dancers
  drawVideo(ctx, video1Element, layout.dancer1);
  drawVideo(ctx, video2Element, layout.dancer2);
}

/**
 * Convert webm to mp4 using browser APIs
 * Note: This is a placeholder - true conversion requires a library
 * For now, we'll just return the webm blob
 */
export async function convertToMP4(webmBlob) {
  // In a real implementation, you would use a library like ffmpeg.wasm
  // For now, we'll just return the webm as-is
  // Most modern browsers support webm playback
  return {
    blob: webmBlob,
    url: URL.createObjectURL(webmBlob),
  };
}

/**
 * Estimate file size based on duration and quality
 */
export function estimateFileSize(duration, quality = 'medium') {
  const bitsPerSecond = {
    low: 2000000,    // 2 Mbps
    medium: 5000000, // 5 Mbps
    high: 8000000,   // 8 Mbps
  };

  const bits = bitsPerSecond[quality] * duration;
  const bytes = bits / 8;
  const megabytes = bytes / (1024 * 1024);

  return {
    bytes,
    megabytes: megabytes.toFixed(2),
    formatted: formatFileSize(bytes),
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check browser compatibility
 */
export function checkBrowserCompatibility() {
  const features = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: !!window.MediaRecorder,
    canvas: !!document.createElement('canvas').getContext('2d'),
    webm: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus'),
    audioContext: !!(window.AudioContext || window.webkitAudioContext),
  };

  const allSupported = Object.values(features).every(Boolean);

  return {
    supported: allSupported,
    features,
    message: allSupported
      ? 'Your browser supports all required features!'
      : 'Some features are not supported. Please use Chrome, Edge, or Firefox.',
  };
}

/**
 * Get optimal recording settings based on device
 */
export function getOptimalSettings() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;

  if (isMobile || isLowEnd) {
    return {
      width: 1280,
      height: 720,
      fps: 24,
      videoBitsPerSecond: 2000000,
    };
  }

  return {
    width: 1920,
    height: 1080,
    fps: 30,
    videoBitsPerSecond: 5000000,
  };
}
