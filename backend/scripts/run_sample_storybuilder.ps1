python backend/scripts/hf_text_to_video.py `
  --prompt "$(Get-Content backend/scripts/sample_storybuilder_prompt.txt -Raw)" `
  --output "backend/uploads/kids-video-hf/sample-storybuilder.mp4" `
  --width 1280 `
  --height 720 `
  --fps 12 `
  --num_frames 24 `
  --lang en
