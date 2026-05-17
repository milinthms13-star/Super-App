const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const logger = require('../utils/logger');
const {
  createAutopilotProject,
  patchStudioProject,
  renderVideo,
} = require('../services/videoStudioService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 8,
  },
});

const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parseInteger = (value, defaultValue, min, max) => {
  const parsed = Number.parseInt(String(value ?? defaultValue), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
};

const sanitizeText = (value = '') => String(value || '').replace(/\u0000/g, '').trim();

const safeSegment = (value = '') =>
  sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';

const inferExt = (file = {}) => {
  const fromName = path.extname(String(file.originalname || '')).toLowerCase();
  if (fromName) return fromName;
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime.includes('png')) return '.png';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  return '.png';
};

const parseCharacterSeeds = (rawValue) => {
  if (!rawValue) return [];
  if (Array.isArray(rawValue)) return rawValue;
  const text = sanitizeText(rawValue);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const buildRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol || 'https';
  const host = req.get('host');
  return `${protocol}://${host}`;
};

const toAbsoluteUrl = (req, maybeRelativeUrl = '') => {
  const raw = String(maybeRelativeUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = buildRequestOrigin(req);
  return `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const saveUploadedCharacterImages = (projectId, files = []) => {
  const safeProjectId = safeSegment(projectId);
  const baseDir = path.join(__dirname, '..', 'uploads', 'video-studio', safeProjectId, 'character-ui');
  fs.mkdirSync(baseDir, { recursive: true });

  return files.map((file, index) => {
    const ext = inferExt(file);
    const baseName = safeSegment(path.parse(String(file.originalname || `character-${index + 1}`)).name);
    const fileName = `${String(index + 1).padStart(2, '0')}-${baseName}-${Date.now()}${ext}`;
    const absolutePath = path.join(baseDir, fileName);
    fs.writeFileSync(absolutePath, file.buffer);
    return {
      fileName,
      imageUrl: `/uploads/video-studio/${safeProjectId}/character-ui/${fileName}`,
      originalName: sanitizeText(file.originalname || `character-${index + 1}${ext}`),
    };
  });
};

const buildCustomCharacters = ({ characterSeeds, uploadedImages, fallbackVoice }) => {
  const seeds = Array.isArray(characterSeeds) ? characterSeeds : [];
  const uploads = Array.isArray(uploadedImages) ? uploadedImages : [];
  const count = Math.max(seeds.length, uploads.length);
  const characters = [];

  for (let index = 0; index < count; index += 1) {
    const seed = seeds[index] && typeof seeds[index] === 'object' ? seeds[index] : {};
    const upload = uploads[index] || null;
    const name =
      sanitizeText(seed.name)
      || (upload ? `Character ${index + 1}` : '')
      || `Character ${index + 1}`;
    const role = sanitizeText(seed.role) || (index === 0 ? 'Lead Character' : 'Supporting Character');
    const appearanceBase = sanitizeText(seed.appearance) || `${name} with expressive face and cinematic real-feel styling`;
    const appearance = upload
      ? `${appearanceBase}. Use the customer reference image: ${upload.imageUrl}`
      : appearanceBase;

    characters.push({
      id: sanitizeText(seed.id) || `char-${index + 1}`,
      name,
      role,
      appearance,
      voiceProfile: sanitizeText(seed.voiceProfile) || fallbackVoice,
      emotionStyle: sanitizeText(seed.emotionStyle) || (index === 0 ? 'confident and warm' : 'supportive and dynamic'),
      colorPalette: Array.isArray(seed.colorPalette) ? seed.colorPalette : [],
      referenceImageUrl: upload ? upload.imageUrl : sanitizeText(seed.referenceImageUrl),
      locked: true,
    });
  }

  return characters;
};

const buildSceneCharacters = (characters = []) =>
  characters.slice(0, 3).map((character) => ({
    name: sanitizeText(character.name),
    role: sanitizeText(character.role),
  }));

const applyCharacterCustomization = async ({
  project,
  characters,
  uploadedImages,
}) => {
  const sceneCharacters = buildSceneCharacters(characters);
  const sceneSuffix = uploadedImages.length
    ? 'Keep character look aligned with uploaded customer reference UI.'
    : 'Keep a cinematic real-feel look with natural expressions.';
  const patchedScenes = (Array.isArray(project.scenes) ? project.scenes : []).map((scene) => ({
    ...scene,
    characters: sceneCharacters.length ? sceneCharacters : scene.characters,
    description: `${sanitizeText(scene.description)} ${sceneSuffix}`.trim(),
  }));

  return patchStudioProject(project.projectId, {
    characters,
    scenes: patchedScenes,
    characterUploadMode: uploadedImages.length ? 'customer-uploaded' : 'auto-generated',
    characterReferenceImages: uploadedImages.map((item) => ({
      fileName: item.fileName,
      imageUrl: item.imageUrl,
      originalName: item.originalName,
    })),
  });
};

router.post('/generate', upload.array('characterImages', 8), async (req, res) => {
  try {
    const prompt = sanitizeText(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required.' });
    }
    if (prompt.length < 3) {
      return res.status(400).json({ success: false, error: 'Prompt is too short. Use at least 3 characters.' });
    }
    if (prompt.length > 7000) {
      return res.status(400).json({ success: false, error: 'Prompt is too long. Keep it under 7000 characters.' });
    }

    const realFeel = parseBoolean(req.body?.realFeel, true);
    const sceneCount = parseInteger(req.body?.sceneCount, 5, 3, 8);
    const autoRender = parseBoolean(req.body?.autoRender, true);
    const premiumHD = parseBoolean(req.body?.premiumHD, false);

    const project = await createAutopilotProject({
      subject: prompt,
      languageId: sanitizeText(req.body?.languageId) || 'english',
      styleId: sanitizeText(req.body?.styleId) || (realFeel ? 'real-cinematic' : 'cartoon'),
      voiceType: sanitizeText(req.body?.voiceType) || 'kid-female',
      videoSizeId: sanitizeText(req.body?.videoSizeId) || 'youtube',
      storyMode: sanitizeText(req.body?.storyMode) || 'adventure',
      safeMode: parseBoolean(req.body?.safeMode, true),
      ageFilter: sanitizeText(req.body?.ageFilter) || '8-12',
      sceneCount,
    });

    const uploadedImages = saveUploadedCharacterImages(project.projectId, req.files || []);
    const characterSeeds = parseCharacterSeeds(req.body?.characters);
    const useCustomerCharacters =
      parseBoolean(req.body?.useCustomerCharacters, true)
      && (uploadedImages.length > 0 || characterSeeds.length > 0);

    let finalProject = project;
    if (useCustomerCharacters) {
      const customCharacters = buildCustomCharacters({
        characterSeeds,
        uploadedImages,
        fallbackVoice: sanitizeText(req.body?.voiceType) || 'kid-female',
      });
      if (customCharacters.length) {
        finalProject = await applyCharacterCustomization({
          project,
          characters: customCharacters,
          uploadedImages,
        });
      }
    }

    if (!autoRender) {
      return res.json({
        success: true,
        module: 'prompt-video-generator',
        message: 'Project created. Render when ready.',
        project: finalProject,
        characterMode: useCustomerCharacters ? 'customer-uploaded' : 'auto-generated',
        uploadedCharacterImages: uploadedImages.map((item) => ({
          imageUrl: toAbsoluteUrl(req, item.imageUrl),
          originalName: item.originalName,
        })),
      });
    }

    const renderProject = {
      ...finalProject,
      renderMode: realFeel ? 'real-cartoon' : (finalProject.renderMode || 'classic-cartoon'),
      requireCharacters: true,
      requireDialogueVoice: true,
      requireLipSync: true,
      requireSceneImages: realFeel,
    };

    const renderResult = await renderVideo(renderProject, premiumHD);
    const relativeVideoUrl = sanitizeText(renderResult?.videoUrl);
    const renderedAt = new Date().toISOString();
    await patchStudioProject(finalProject.projectId, {
      videoUrl: relativeVideoUrl,
      renderedAt,
      premiumExport: premiumHD,
      renderMode: renderProject.renderMode,
    });

    return res.json({
      success: true,
      module: 'prompt-video-generator',
      projectId: finalProject.projectId,
      characterMode: useCustomerCharacters ? 'customer-uploaded' : 'auto-generated',
      videoUrl: toAbsoluteUrl(req, relativeVideoUrl),
      videoPath: relativeVideoUrl,
      uploadedCharacterImages: uploadedImages.map((item) => ({
        imageUrl: toAbsoluteUrl(req, item.imageUrl),
        originalName: item.originalName,
      })),
      project: finalProject,
    });
  } catch (error) {
    logger.error('Prompt video generator error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate prompt video.',
    });
  }
});

module.exports = router;
