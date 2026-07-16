/**
 * Export and Batch Processing Tools
 * Professional export features with multiple formats and batch processing
 */

import { fabric } from 'fabric';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * ExportManager - Handle various export formats and batch operations
 */
export class ExportManager {
  constructor(canvas) {
    this.canvas = canvas;
  }

  /**
   * Export single image
   */
  async exportImage(options = {}) {
    const {
      format = 'png',
      quality = 1.0,
      multiplier = 1,
      filename = 'export',
    } = options;

    try {
      const dataURL = this.canvas.toDataURL({
        format: format,
        quality: quality,
        multiplier: multiplier,
      });

      // Convert to blob for better handling
      const blob = await this.dataURLToBlob(dataURL);

      // Download
      saveAs(blob, `${filename}.${format}`);

      return { success: true, size: blob.size };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export in multiple formats at once
   */
  async exportMultipleFormats(formats, options = {}) {
    const { filename = 'export', quality = 1.0, multiplier = 1 } = options;

    const zip = new JSZip();
    const results = [];

    for (const format of formats) {
      try {
        const dataURL = this.canvas.toDataURL({
          format: format,
          quality: quality,
          multiplier: multiplier,
        });

        const blob = await this.dataURLToBlob(dataURL);
        zip.file(`${filename}.${format}`, blob);

        results.push({
          format: format,
          success: true,
          size: blob.size,
        });
      } catch (error) {
        results.push({
          format: format,
          success: false,
          error: error.message,
        });
      }
    }

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${filename}_exports.zip`);

    return results;
  }

  /**
   * Export with different sizes
   */
  async exportMultipleSizes(sizes, options = {}) {
    const { format = 'png', quality = 1.0, filename = 'export' } = options;

    const zip = new JSZip();
    const results = [];

    const originalWidth = this.canvas.width;
    const originalHeight = this.canvas.height;

    for (const size of sizes) {
      try {
        const { width, height, name } = size;
        const multiplier = width / originalWidth;

        const dataURL = this.canvas.toDataURL({
          format: format,
          quality: quality,
          multiplier: multiplier,
        });

        const blob = await this.dataURLToBlob(dataURL);
        zip.file(`${filename}_${name}.${format}`, blob);

        results.push({
          size: name,
          width: width,
          height: height,
          success: true,
          fileSize: blob.size,
        });
      } catch (error) {
        results.push({
          size: size.name,
          success: false,
          error: error.message,
        });
      }
    }

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${filename}_sizes.zip`);

    return results;
  }

  /**
   * Export layers separately
   */
  async exportLayers(options = {}) {
    const { format = 'png', quality = 1.0, filename = 'layer' } = options;

    const zip = new JSZip();
    const objects = this.canvas.getObjects();
    const results = [];

    // Save current state
    const originalBackground = this.canvas.backgroundColor;
    this.canvas.backgroundColor = 'transparent';

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];

      try {
        // Hide all other objects
        objects.forEach((o, idx) => {
          o.set({ visible: idx === i });
        });

        this.canvas.renderAll();

        const dataURL = this.canvas.toDataURL({
          format: format,
          quality: quality,
        });

        const blob = await this.dataURLToBlob(dataURL);
        const layerName = obj.layerName || `layer_${i + 1}`;
        zip.file(`${filename}_${layerName}.${format}`, blob);

        results.push({
          layer: layerName,
          success: true,
          size: blob.size,
        });
      } catch (error) {
        results.push({
          layer: `layer_${i + 1}`,
          success: false,
          error: error.message,
        });
      }
    }

    // Restore visibility
    objects.forEach((o) => o.set({ visible: true }));
    this.canvas.backgroundColor = originalBackground;
    this.canvas.renderAll();

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${filename}_layers.zip`);

    return results;
  }

  /**
   * Export as PSD-like format (simplified JSON)
   */
  async exportProject(projectName = 'project') {
    try {
      const projectData = {
        name: projectName,
        version: '1.0',
        canvas: {
          width: this.canvas.width,
          height: this.canvas.height,
          backgroundColor: this.canvas.backgroundColor,
        },
        layers: this.canvas.getObjects().map((obj, index) => ({
          id: obj.id || index,
          name: obj.layerName || `Layer ${index + 1}`,
          type: obj.type,
          visible: obj.visible,
          opacity: obj.opacity,
          blendMode: obj.blendMode || 'normal',
          locked: obj.selectable === false,
          data: obj.toJSON(['layerId', 'layerName']),
        })),
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      };

      const json = JSON.stringify(projectData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      saveAs(blob, `${projectName}.mbproject`);

      return { success: true, size: blob.size };
    } catch (error) {
      console.error('Project export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export for web (optimized)
   */
  async exportForWeb(options = {}) {
    const {
      format = 'webp',
      quality = 0.9,
      maxWidth = 1920,
      maxHeight = 1080,
      filename = 'web_export',
    } = options;

    const originalWidth = this.canvas.width;
    const originalHeight = this.canvas.height;

    // Calculate multiplier to fit within max dimensions
    let multiplier = 1;
    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      multiplier = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    }

    try {
      const dataURL = this.canvas.toDataURL({
        format: format,
        quality: quality,
        multiplier: multiplier,
      });

      const blob = await this.dataURLToBlob(dataURL);
      saveAs(blob, `${filename}.${format}`);

      return {
        success: true,
        size: blob.size,
        dimensions: {
          width: Math.round(originalWidth * multiplier),
          height: Math.round(originalHeight * multiplier),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Export for print (high resolution)
   */
  async exportForPrint(options = {}) {
    const {
      format = 'png',
      dpi = 300,
      filename = 'print_export',
    } = options;

    // Calculate multiplier for DPI (assuming 72 DPI base)
    const multiplier = dpi / 72;

    try {
      const dataURL = this.canvas.toDataURL({
        format: format,
        quality: 1.0,
        multiplier: multiplier,
      });

      const blob = await this.dataURLToBlob(dataURL);
      saveAs(blob, `${filename}_${dpi}dpi.${format}`);

      return {
        success: true,
        size: blob.size,
        dpi: dpi,
        dimensions: {
          width: Math.round(this.canvas.width * multiplier),
          height: Math.round(this.canvas.height * multiplier),
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Convert data URL to Blob
   */
  async dataURLToBlob(dataURL) {
    return fetch(dataURL).then((res) => res.blob());
  }

  /**
   * Get export presets
   */
  getExportPresets() {
    return {
      web: {
        name: 'Web Optimized',
        format: 'webp',
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
      },
      social: {
        name: 'Social Media',
        sizes: [
          { name: 'instagram_post', width: 1080, height: 1080 },
          { name: 'instagram_story', width: 1080, height: 1920 },
          { name: 'facebook_post', width: 1200, height: 630 },
          { name: 'twitter_post', width: 1200, height: 675 },
          { name: 'linkedin_post', width: 1200, height: 627 },
        ],
      },
      print: {
        name: 'Print Quality',
        format: 'png',
        dpi: 300,
      },
      hd: {
        name: 'HD Quality',
        format: 'png',
        quality: 1.0,
        multiplier: 2,
      },
      thumbnail: {
        name: 'Thumbnail',
        format: 'jpeg',
        quality: 0.8,
        maxWidth: 400,
        maxHeight: 400,
      },
    };
  }

  /**
   * Batch process multiple canvases
   */
  async batchExport(canvases, options = {}) {
    const { format = 'png', quality = 1.0, prefix = 'export' } = options;

    const zip = new JSZip();
    const results = [];

    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];

      try {
        const dataURL = canvas.toDataURL({
          format: format,
          quality: quality,
        });

        const blob = await this.dataURLToBlob(dataURL);
        zip.file(`${prefix}_${i + 1}.${format}`, blob);

        results.push({
          index: i,
          success: true,
          size: blob.size,
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
        });
      }
    }

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${prefix}_batch.zip`);

    return results;
  }

  /**
   * Calculate estimated file size
   */
  estimateFileSize(format, quality, multiplier = 1) {
    const pixels = this.canvas.width * this.canvas.height * multiplier * multiplier;

    // Rough estimates (bytes per pixel)
    const bytesPerPixel = {
      png: 4, // Full RGBA
      jpeg: quality, // Quality-dependent
      webp: quality * 0.8, // Better compression than JPEG
    };

    const estimatedBytes = pixels * (bytesPerPixel[format] || 3);

    return {
      bytes: estimatedBytes,
      kb: (estimatedBytes / 1024).toFixed(2),
      mb: (estimatedBytes / 1024 / 1024).toFixed(2),
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.canvas = null;
  }
}

/**
 * Batch processing utilities
 */
export class BatchProcessor {
  constructor() {
    this.queue = [];
  }

  /**
   * Add task to queue
   */
  addTask(task) {
    this.queue.push(task);
  }

  /**
   * Process all tasks
   */
  async processAll(onProgress) {
    const results = [];
    const total = this.queue.length;

    for (let i = 0; i < total; i++) {
      const task = this.queue[i];

      try {
        const result = await task();
        results.push({ index: i, success: true, result });
      } catch (error) {
        results.push({ index: i, success: false, error: error.message });
      }

      if (onProgress) {
        onProgress({
          current: i + 1,
          total: total,
          percentage: ((i + 1) / total) * 100,
        });
      }
    }

    this.queue = [];
    return results;
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
  }
}

export default ExportManager;
