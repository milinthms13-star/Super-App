# Kids Story Video Maker

## Overview

Kid-focused story-to-video module with end-to-end flow:

1. Create or autopilot project
2. Edit script/characters/scenes/voice/music
3. Render MP4
4. Download or save locally

## Module structure

- `KidsStoryVideoMaker.js`: container orchestration and stage actions
- `components/CharacterCards.js`: character edit UI
- `components/SceneCards.js`: scene edit UI
- `components/TimelineCards.js`: export timeline UI
- `videoStudioApi.js`: API transport (abort/retry/timeout + response parsing)
- `videoStudioContracts.js`: strict runtime contracts/normalization
- `storyStudioUtils.js`: local schema, validation, shared helpers

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
- `GET /projects/:projectId/status`
  - Response: `{ success, projectId, status, progress, videoUrl, downloadUrl }`

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

Backend safety now combines:

- keyword guardrails
- OpenAI moderation check (`omni-moderation-latest` by default)
- structured per-reason error payloads across create/autopilot/regenerate/patch/render

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
- Frontend render timeout defaults to 15 minutes and can be overridden with `REACT_APP_VIDEO_RENDER_TIMEOUT_MS`.
- Poll tuning is configurable with `REACT_APP_VIDEO_RENDER_POLL_ATTEMPTS` and `REACT_APP_VIDEO_RENDER_POLL_INTERVAL_MS`.
- Backend can allow AI rendering while global free mode is on using `VIDEO_STUDIO_ALLOW_AI_IN_FREE=true`.

## Tests

- Unit:
  - `storyStudioUtils.test.js`
  - `videoStudioApi.test.js`
  - `videoStudioContracts.test.js`
- Smoke component:
  - `KidsStoryVideoMaker.smoke.test.js`
- E2E:
  - `cypress/e2e/kidsstoryvideomaker.cy.js`
