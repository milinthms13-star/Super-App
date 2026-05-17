# Steve-like Free Text-to-Video (Python)

This script creates a Steve.ai-style automatic video pipeline using free tools:
- Script -> scene splitting
- Free stock image retrieval (Wikimedia Commons, no API key)
- Free text-to-speech (`gTTS`)
- Subtitle overlay
- Final MP4 stitching

## Install

```bash
pip install -r backend/scripts/requirements-free-text-to-video.txt
```

## Run

```bash
python backend/scripts/steve_like_text_to_video.py \
  --script "Artificial intelligence helps creators turn text into videos. You can automate visuals, voice, and captions quickly." \
  --output backend/scripts/steve_like_output.mp4 \
  --max_scenes 4 \
  --width 1280 \
  --height 720 \
  --fps 24 \
  --lang en
```

## Notes
- If image lookup fails for a keyword, the script auto-generates a fallback visual.
- `gTTS` requires internet access.
- For faster previews, use `--width 854 --height 480 --fps 20`.
