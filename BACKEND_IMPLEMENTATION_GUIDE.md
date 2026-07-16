# 🔧 Professional Photo Studio - Backend Implementation Guide

## Overview

Complete backend infrastructure for professional photo editing application with cloud storage, AI processing, and collaboration features.

---

## 📦 Backend Architecture

### Components Created

1. **Controllers** (Business Logic)
   - `photoStudioController.js` - Main controller with all API handlers

2. **Models** (Database Schemas)
   - `PhotoStudioProject.js` - Project storage with layers
   - `UserPreferences.js` - User settings and preferences
   - `ProcessingQueue.js` - Async job processing

3. **Routes** (API Endpoints)
   - `photoStudioRoutes.js` - RESTful API routes

4. **Services** (Frontend Integration)
   - `photoStudioAPI.js` - Frontend API client

---

## 🚀 Setup Instructions

### 1. Install Backend Dependencies

```bash
npm install sharp mongoose uuid
```

### 2. Add Routes to Your Express App

In your main `server.js` or `app.js`:

```javascript
const photoStudioRoutes = require('./modules/photostudio/professional/backend/routes/photoStudioRoutes');

// Add route
app.use('/api/photo-studio', photoStudioRoutes);
```

### 3. Create Uploads Directory

```bash
mkdir -p uploads
```

### 4. Set Environment Variables

Create or update `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/malabarbazaar

# JWT
JWT_SECRET=your_jwt_secret_key

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# Processing
MAX_QUEUE_SIZE=100
PROCESSING_TIMEOUT=60000  # 60 seconds
```

---

## 📡 API Endpoints

### Project Management

#### Create Project
```
POST /api/photo-studio/projects
Body: {
  name: "My Project",
  canvasData: {...},
  layers: [...],
  canvasSize: { width: 1920, height: 1080 }
}
Response: { success: true, project: {...} }
```

#### Get All Projects
```
GET /api/photo-studio/projects?page=1&limit=20&sortBy=updatedAt&order=desc
Response: {
  success: true,
  projects: [...],
  totalPages: 5,
  currentPage: 1,
  totalProjects: 95
}
```

#### Get Single Project
```
GET /api/photo-studio/projects/:projectId
Response: { success: true, project: {...} }
```

#### Update Project
```
PUT /api/photo-studio/projects/:projectId
Body: { name: "Updated Name", canvasData: {...}, layers: [...] }
Response: { success: true, project: {...} }
```

#### Delete Project
```
DELETE /api/photo-studio/projects/:projectId
Response: { success: true, message: "Project deleted" }
```

### Image Processing

#### Remove Background (AI)
```
POST /api/photo-studio/process/remove-background
Body: { imageData: "data:image/png;base64,..." }
Response: { success: true, jobId: "abc123", message: "Processing started" }
```

#### Batch Process
```
POST /api/photo-studio/process/batch
Body: {
  images: ["data:image/png;base64,...", ...],
  operations: [
    { type: "resize", width: 800, height: 600 },
    { type: "blur", sigma: 5 }
  ]
}
Response: { success: true, jobs: [{id: "...", status: "pending"}] }
```

#### Get Job Status
```
GET /api/photo-studio/process/jobs/:jobId
Response: {
  success: true,
  job: {
    id: "abc123",
    type: "background_removal",
    status: "completed",
    progress: 100,
    result: {...}
  }
}
```

#### Export Image
```
POST /api/photo-studio/export
Body: {
  imageData: "data:image/png;base64,...",
  format: "png",
  quality: 1.0,
  width: 1920,
  height: 1080
}
Response: Binary image data (download)
```

### User Preferences

#### Get Preferences
```
GET /api/photo-studio/preferences
Response: {
  success: true,
  preferences: {
    canvas: {...},
    editor: {...},
    tools: {...}
  }
}
```

#### Update Preferences
```
PUT /api/photo-studio/preferences
Body: {
  preferences: {
    canvas: { defaultWidth: 1920 },
    editor: { theme: "dark" }
  }
}
Response: { success: true, preferences: {...} }
```

### Cloud Storage

#### Upload Image
```
POST /api/photo-studio/upload
Body: {
  imageData: "data:image/png;base64,...",
  projectId: "optional-project-id"
}
Response: {
  success: true,
  url: "/uploads/userId/filename.png",
  filename: "filename.png"
}
```

---

## 💾 Database Models

### PhotoStudioProject

```javascript
{
  userId: ObjectId,
  name: String,
  description: String,
  canvasData: Mixed,
  layers: [{
    id: String,
    name: String,
    type: String,
    visible: Boolean,
    locked: Boolean,
    opacity: Number,
    blendMode: String,
    data: Mixed
  }],
  canvasSize: {
    width: Number,
    height: Number
  },
  thumbnail: String,
  tags: [String],
  assets: [{
    filename: String,
    url: String,
    type: String,
    size: Number
  }],
  collaborators: [{
    userId: ObjectId,
    role: String,
    addedAt: Date
  }],
  isPublic: Boolean,
  isTemplate: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### UserPreferences

```javascript
{
  userId: ObjectId,
  preferences: {
    canvas: {
      defaultWidth: Number,
      defaultHeight: Number,
      backgroundColor: String
    },
    editor: {
      theme: String,
      showRulers: Boolean,
      showGrid: Boolean
    },
    tools: {
      defaultBrushSize: Number,
      defaultTextFont: String,
      recentColors: [String]
    },
    performance: {
      maxHistorySize: Number,
      autoSave: Boolean,
      autoSaveInterval: Number
    }
  },
  recentProjects: [{
    projectId: ObjectId,
    lastOpened: Date
  }],
  favoriteProjects: [ObjectId],
  statistics: {
    totalProjects: Number,
    totalEditingTime: Number,
    featuresUsed: Map
  }
}
```

### ProcessingQueue

```javascript
{
  userId: ObjectId,
  type: String,
  status: String,
  priority: Number,
  input: Mixed,
  result: Mixed,
  progress: Number,
  error: {
    message: String,
    stack: String
  },
  metadata: {
    estimatedDuration: Number,
    actualDuration: Number,
    retryCount: Number
  },
  startedAt: Date,
  completedAt: Date,
  expiresAt: Date
}
```

---

## 🔌 Frontend Integration

### Using the API Service

```javascript
import photoStudioAPI from './services/photoStudioAPI';

// In your component
const MyComponent = () => {
  const handleSave = async () => {
    try {
      const result = await photoStudioAPI.projects.create({
        name: 'My Project',
        canvasData: canvas.toJSON(),
        layers: layers,
        canvasSize: { width: 1920, height: 1080 }
      });
      
      console.log('Project saved:', result.project);
    } catch (error) {
      console.error('Save failed:', error.message);
    }
  };

  return (
    <button onClick={handleSave}>Save Project</button>
  );
};
```

### Auto-Save Implementation

```javascript
import { createAutoSave } from './services/photoStudioAPI';
import { useEffect, useRef } from 'react';

const ProfessionalPhotoEditor = () => {
  const [projectId, setProjectId] = useState(null);
  const autoSaveRef = useRef(null);

  useEffect(() => {
    if (projectId) {
      // Create auto-save function (saves every 5 seconds after changes)
      autoSaveRef.current = createAutoSave(projectId, 5000);
    }
  }, [projectId]);

  const handleCanvasChange = () => {
    if (autoSaveRef.current) {
      autoSaveRef.current({
        canvasData: canvas.toJSON(),
        layers: layers
      });
    }
  };

  return (
    <div>
      {/* Your editor */}
    </div>
  );
};
```

### Using React Hooks

```javascript
import { useProjects, usePreferences } from './services/photoStudioAPI';

const ProjectsList = () => {
  const { projects, loading, error, loadProjects } = useProjects();

  useEffect(() => {
    loadProjects({ page: 1, limit: 20 });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {projects.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
};
```

### Background Processing with Polling

```javascript
import { processingAPI } from './services/photoStudioAPI';

const processImage = async (imageData) => {
  try {
    // Start processing
    const { jobId } = await processingAPI.removeBackground(imageData);
    
    // Poll for result
    const result = await processingAPI.pollJobStatus(
      jobId,
      (job) => {
        console.log('Progress:', job.progress + '%');
        setProgress(job.progress);
      },
      2000, // Poll every 2 seconds
      60000 // Timeout after 60 seconds
    );
    
    console.log('Processing complete:', result);
    return result.result.processedImage;
    
  } catch (error) {
    console.error('Processing failed:', error);
  }
};
```

---

## 🔐 Security Considerations

### Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### File Upload Validation

```javascript
// Validate file size
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

if (buffer.length > MAX_FILE_SIZE) {
  return res.status(413).json({ error: 'File too large' });
}

// Validate file type
const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
if (!allowedTypes.includes(mimeType)) {
  return res.status(400).json({ error: 'Invalid file type' });
}
```

---

## ⚡ Performance Optimization

### 1. Add Indexes

Already added in models:
- User ID + Update date
- Project status
- Processing queue priority

### 2. Implement Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Cache project data
const cachedProject = cache.get(`project_${projectId}`);
if (cachedProject) {
  return res.json({ success: true, project: cachedProject });
}

// ... fetch from database ...

cache.set(`project_${projectId}`, project);
```

### 3. Use Background Workers

```javascript
// worker.js
const ProcessingQueue = require('./models/ProcessingQueue');

async function processJobs() {
  while (true) {
    const job = await ProcessingQueue.getNextJob();
    
    if (job) {
      try {
        await processJob(job);
        await job.complete(result);
      } catch (error) {
        await job.fail(error);
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

processJobs();
```

---

## 🧪 Testing

### API Testing with Postman/curl

```bash
# Create project
curl -X POST http://localhost:5000/api/photo-studio/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","canvasData":{},"layers":[],"canvasSize":{"width":1920,"height":1080}}'

# Get projects
curl http://localhost:5000/api/photo-studio/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Monitoring & Maintenance

### Cleanup Old Jobs

```javascript
// Run daily cleanup
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  const deletedCount = await ProcessingQueue.cleanupOldJobs(7);
  console.log(`Cleaned up ${deletedCount} old jobs`);
});
```

### Queue Statistics

```javascript
const stats = await ProcessingQueue.getQueueStats();
console.log('Queue stats:', stats);
// { pending: 5, processing: 2, completed: 150, failed: 3, cancelled: 1 }
```

---

## 🚀 Deployment Checklist

- [ ] Set up MongoDB database
- [ ] Configure environment variables
- [ ] Create uploads directory with proper permissions
- [ ] Set up authentication middleware
- [ ] Configure CORS for frontend
- [ ] Set up SSL/HTTPS
- [ ] Configure rate limiting
- [ ] Set up error logging (Sentry, etc.)
- [ ] Configure CDN for static assets
- [ ] Set up database backups
- [ ] Configure monitoring (New Relic, DataDog, etc.)
- [ ] Set up worker processes for background jobs

---

## ✅ Features Implemented

✅ Project CRUD operations  
✅ Cloud storage integration  
✅ Server-side AI processing  
✅ Batch processing queue  
✅ User preferences storage  
✅ Auto-save functionality  
✅ Collaboration support (schema ready)  
✅ Project templates  
✅ Asset management  
✅ Processing job tracking  
✅ Export optimization  

---

## 🎯 Optional Enhancements

### Advanced AI Processing

Integrate Python AI services:
- U2-Net for better background removal
- Real-ESRGAN for super resolution
- StyleGAN for style transfer

### Real-time Collaboration

Use Socket.IO for live editing:
```javascript
io.on('connection', (socket) => {
  socket.on('project:update', (data) => {
    socket.broadcast.to(data.projectId).emit('project:updated', data);
  });
});
```

### Version Control

Add version history to projects:
```javascript
versions: [{
  number: Number,
  canvasData: Mixed,
  createdAt: Date,
  createdBy: ObjectId
}]
```

---

## 📚 Additional Resources

- Sharp Documentation: https://sharp.pixelplumbing.com/
- Mongoose Documentation: https://mongoosejs.com/
- Express.js Best Practices: https://expressjs.com/en/advanced/best-practice-performance.html

---

**Status**: ✅ Backend Complete  
**Version**: 1.0.0  
**Last Updated**: 2026-07-16
