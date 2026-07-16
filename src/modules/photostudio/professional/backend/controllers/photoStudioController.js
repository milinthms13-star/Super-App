/**
 * Photo Studio Backend Controller
 * Handles server-side image processing, AI operations, and project management
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const PhotoStudioProject = require('../models/PhotoStudioProject');
const UserPreferences = require('../models/UserPreferences');
const ProcessingQueue = require('../models/ProcessingQueue');

/**
 * Project Management
 */

// Create new project
exports.createProject = async (req, res) => {
  try {
    const { name, canvasData, layers, canvasSize } = req.body;
    const userId = req.user.id;

    const project = new PhotoStudioProject({
      userId,
      name,
      canvasData,
      layers,
      canvasSize,
      thumbnail: await generateThumbnail(canvasData),
    });

    await project.save();

    res.status(201).json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        thumbnail: project.thumbnail,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message,
    });
  }
};

// Get user's projects
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, sortBy = 'updatedAt', order = 'desc' } = req.query;

    const projects = await PhotoStudioProject.find({ userId })
      .select('name thumbnail tags createdAt updatedAt')
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await PhotoStudioProject.countDocuments({ userId });

    res.json({
      success: true,
      projects,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProjects: count,
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
    });
  }
};

// Get single project
exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await PhotoStudioProject.findOne({
      _id: projectId,
      userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project',
    });
  }
};

// Update project
exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { name, canvasData, layers, tags } = req.body;

    const project = await PhotoStudioProject.findOne({
      _id: projectId,
      userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    if (name) project.name = name;
    if (canvasData) {
      project.canvasData = canvasData;
      project.thumbnail = await generateThumbnail(canvasData);
    }
    if (layers) project.layers = layers;
    if (tags) project.tags = tags;

    await project.save();

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        thumbnail: project.thumbnail,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
    });
  }
};

// Delete project
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const result = await PhotoStudioProject.deleteOne({
      _id: projectId,
      userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
    });
  }
};

/**
 * Server-Side Image Processing
 */

// Advanced background removal (server-side with better quality)
exports.removeBackground = async (req, res) => {
  try {
    const { imageData } = req.body;
    const userId = req.user.id;

    // Add to processing queue
    const job = await ProcessingQueue.create({
      userId,
      type: 'background_removal',
      status: 'pending',
      input: { imageData },
    });

    // Process in background
    processBackgroundRemoval(job._id, imageData);

    res.json({
      success: true,
      jobId: job._id,
      message: 'Background removal started',
    });
  } catch (error) {
    console.error('Background removal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start background removal',
    });
  }
};

// Batch image processing
exports.batchProcess = async (req, res) => {
  try {
    const { images, operations } = req.body;
    const userId = req.user.id;

    const jobs = await Promise.all(
      images.map(async (imageData) => {
        return ProcessingQueue.create({
          userId,
          type: 'batch_process',
          status: 'pending',
          input: { imageData, operations },
        });
      })
    );

    // Process in background
    jobs.forEach((job) => {
      processBatchOperation(job._id, job.input);
    });

    res.json({
      success: true,
      jobs: jobs.map((j) => ({ id: j._id, status: 'pending' })),
      message: 'Batch processing started',
    });
  } catch (error) {
    console.error('Batch process error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start batch processing',
    });
  }
};

// Get processing job status
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = await ProcessingQueue.findOne({
      _id: jobId,
      userId,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      job: {
        id: job._id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job status',
    });
  }
};

// High-quality image export
exports.exportImage = async (req, res) => {
  try {
    const { imageData, format, quality, width, height } = req.body;

    const buffer = Buffer.from(imageData.split(',')[1], 'base64');

    let processed = sharp(buffer);

    if (width && height) {
      processed = processed.resize(width, height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      });
    }

    let outputBuffer;
    switch (format) {
      case 'png':
        outputBuffer = await processed
          .png({ quality: quality * 100, compressionLevel: 9 })
          .toBuffer();
        break;
      case 'jpeg':
      case 'jpg':
        outputBuffer = await processed
          .jpeg({ quality: quality * 100, progressive: true })
          .toBuffer();
        break;
      case 'webp':
        outputBuffer = await processed
          .webp({ quality: quality * 100, lossless: quality === 1 })
          .toBuffer();
        break;
      default:
        outputBuffer = await processed.toBuffer();
    }

    res.set('Content-Type', `image/${format}`);
    res.set('Content-Disposition', `attachment; filename="export.${format}"`);
    res.send(outputBuffer);
  } catch (error) {
    console.error('Export image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export image',
    });
  }
};

/**
 * User Preferences
 */

// Get user preferences
exports.getPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      preferences = await UserPreferences.create({
        userId,
        preferences: getDefaultPreferences(),
      });
    }

    res.json({
      success: true,
      preferences: preferences.preferences,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
    });
  }
};

// Update user preferences
exports.updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    let userPrefs = await UserPreferences.findOne({ userId });

    if (!userPrefs) {
      userPrefs = new UserPreferences({ userId, preferences });
    } else {
      userPrefs.preferences = { ...userPrefs.preferences, ...preferences };
    }

    await userPrefs.save();

    res.json({
      success: true,
      preferences: userPrefs.preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
    });
  }
};

/**
 * Cloud Storage
 */

// Upload image to cloud
exports.uploadImage = async (req, res) => {
  try {
    const { imageData, projectId } = req.body;
    const userId = req.user.id;

    const filename = `${uuidv4()}.png`;
    const uploadPath = path.join(
      __dirname,
      '../../uploads',
      userId,
      filename
    );

    // Ensure directory exists
    await fs.mkdir(path.dirname(uploadPath), { recursive: true });

    // Save file
    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    await fs.writeFile(uploadPath, buffer);

    // Update project if provided
    if (projectId) {
      await PhotoStudioProject.findOneAndUpdate(
        { _id: projectId, userId },
        { $push: { assets: { filename, url: `/uploads/${userId}/${filename}` } } }
      );
    }

    res.json({
      success: true,
      url: `/uploads/${userId}/${filename}`,
      filename,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
    });
  }
};

/**
 * Helper Functions
 */

async function generateThumbnail(canvasData) {
  try {
    const buffer = Buffer.from(canvasData.split(',')[1], 'base64');
    const thumbnail = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .png()
      .toBuffer();

    return `data:image/png;base64,${thumbnail.toString('base64')}`;
  } catch (error) {
    console.error('Generate thumbnail error:', error);
    return null;
  }
}

async function processBackgroundRemoval(jobId, imageData) {
  try {
    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'processing',
      progress: 0,
    });

    // Simulate processing (replace with actual AI model)
    // In production, use Python API with better models like U2-Net, MODNet, etc.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      result: { processedImage: imageData }, // Replace with actual result
      completedAt: new Date(),
    });
  } catch (error) {
    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
  }
}

async function processBatchOperation(jobId, input) {
  try {
    const { imageData, operations } = input;

    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'processing',
      progress: 0,
    });

    let buffer = Buffer.from(imageData.split(',')[1], 'base64');
    let processed = sharp(buffer);

    // Apply operations
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      switch (op.type) {
        case 'resize':
          processed = processed.resize(op.width, op.height);
          break;
        case 'blur':
          processed = processed.blur(op.sigma);
          break;
        case 'sharpen':
          processed = processed.sharpen(op.sigma);
          break;
        case 'rotate':
          processed = processed.rotate(op.angle);
          break;
        case 'flip':
          processed = processed.flip();
          break;
        case 'flop':
          processed = processed.flop();
          break;
        case 'grayscale':
          processed = processed.grayscale();
          break;
        case 'negate':
          processed = processed.negate();
          break;
        case 'normalize':
          processed = processed.normalize();
          break;
      }

      const progress = ((i + 1) / operations.length) * 100;
      await ProcessingQueue.findByIdAndUpdate(jobId, { progress });
    }

    const outputBuffer = await processed.png().toBuffer();
    const result = `data:image/png;base64,${outputBuffer.toString('base64')}`;

    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'completed',
      progress: 100,
      result: { processedImage: result },
      completedAt: new Date(),
    });
  } catch (error) {
    await ProcessingQueue.findByIdAndUpdate(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
  }
}

function getDefaultPreferences() {
  return {
    canvas: {
      defaultWidth: 1920,
      defaultHeight: 1080,
      backgroundColor: '#ffffff',
    },
    editor: {
      theme: 'dark',
      showRulers: true,
      showGrid: false,
      snapToGrid: false,
      gridSize: 10,
    },
    tools: {
      defaultBrushSize: 20,
      defaultBrushHardness: 100,
      defaultTextFont: 'Arial',
      defaultTextSize: 48,
    },
    shortcuts: {
      // Custom keyboard shortcuts
    },
    performance: {
      maxHistorySize: 50,
      enableWebGL: true,
      autoSave: true,
      autoSaveInterval: 300000, // 5 minutes
    },
  };
}

module.exports = exports;
