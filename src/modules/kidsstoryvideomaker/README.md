# Kids Story Video Maker

## Overview

Kid-focused story-to-video module with end-to-end flow:

1. Create or autopilot project
2. Edit script/characters/scenes/voice/music
3. Render MP4
4. Download or save locally

## Frontend API contract

Base path: `/api/video-studio`

- `POST /create`
  - Request: `{ storyTitle, storyPrompt, languageId, styleId, voiceType, videoSizeId, storyMode, safeMode, ageFilter, storySource }`
  - Response: `{ success, project }`
- `POST /autopilot/create`
  - Request: `{ subject, languageId, styleId, voiceType, videoSizeId, storyMode, safeMode, ageFilter, sceneCount }`
  - Response: `{ success, project }`
- `PATCH /projects/:projectId`
  - Request: partial project payload (`script`, `characters`, `scenes`, `voicePlan`, `musicPlan`, `animationPlan`, etc.)
  - Response: `{ success, project }`
- `POST /projects/:projectId/regenerate/:stage`
  - `stage`: `script | characters | scenes | voice | music | animation`
  - Response: `{ success, project }`
- `POST /render`
  - Request: `{ project, premiumHD }`
  - Response: `{ success, videoUrl, videoPath, projectId }`
- `GET /projects/:projectId/download`
  - Response: `{ success, projectId, videoUrl, downloadUrl }`

## Safety failures

Structured safety response shape:

```json
{
  "success": false,
  "code": "SAFETY_FAILED",
  "error": "Safe mode blocked this story_prompt due to unsafe themes.",
  "safety": {
    "context": "story_prompt",
    "reasons": [
      { "code": "graphic_violence", "reason": "graphic violence" }
    ]
  }
}
```

## Local storage schema

- Project library key: `kids-story-video-project-library-v1`
- Character presets key: `kids-story-character-presets-v1`
- Envelope format:

```json
{
  "version": 3,
  "items": [],
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

## Notes

- "Save stage edits" persists to backend (`PATCH /projects/:projectId`).
- "Save Project" stores a local snapshot for My Projects on this device.
- Render uses subtitles generated from scene durations.
