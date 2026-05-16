
# Real cartoon render fix

Your old MP4 output was a text storyboard slide with background sound. The frontend now sends:

- `renderMode: "real-cartoon"`
- `characters`
- `spokenLines`
- `visualPrompt`
- `animationPlan`
- `audioPlan`
- `requireCharacters: true`
- `requireDialogueVoice: true`

Backend files added:

- `backend/videoStudioRealCartoonRenderer.js`
- `backend/videoStudioRenderRoute.example.js`

Install backend dependencies:

```bash
npm i fluent-ffmpeg ffmpeg-static sharp
```

Then connect the example route to your existing Express app.

Important: this local renderer creates cartoon character visuals and animated mouth frames. For true natural voice talking, connect a TTS provider such as ElevenLabs, Google TTS, or Azure TTS inside `createSceneVideo()` and replace the silent audio file with the generated speech file.
