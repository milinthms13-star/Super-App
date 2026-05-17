import argparse
import json
import os
import random
import re
import sys
from pathlib import Path
from typing import Any

import requests
from gtts import gTTS
from moviepy.editor import (
    AudioFileClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
    concatenate_videoclips,
)


def _resolve_output_path(output: str) -> Path:
    output_path = Path(output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() != ".mp4":
        output_path = output_path.with_suffix(".mp4")
    return output_path


COMMON_STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "has",
    "he",
    "in",
    "is",
    "it",
    "its",
    "of",
    "on",
    "that",
    "the",
    "to",
    "was",
    "were",
    "will",
    "with",
    "you",
    "your",
}


def _clean_text(value: str) -> str:
    return str(value or "").replace("\x00", "").strip()


def _split_prompt_to_scenes(prompt: str, max_scenes: int = 6) -> list[dict[str, str]]:
    cleaned = _clean_text(prompt)
    chunks = [
        chunk.strip()
        for chunk in re.split(r"(?<=[.!?])\s+|\n+", cleaned)
        if chunk.strip()
    ]
    if not chunks:
        chunks = [cleaned]

    chunks = chunks[: max(1, min(12, max_scenes))]
    scenes: list[dict[str, str]] = []
    for sentence in chunks:
        words = re.findall(r"[a-zA-Z][a-zA-Z'-]+", sentence.lower())
        keyword = next(
            (word for word in words if word not in COMMON_STOPWORDS and len(word) > 3),
            "story",
        )
        scenes.append({"text": sentence, "keyword": keyword})
    return scenes


def _fetch_free_image(keyword: str, image_path: Path) -> bool:
    query = _clean_text(keyword).replace(" ", ",")
    dynamic_url = f"https://source.unsplash.com/featured/1920x1080/?{query or 'story'}"
    try:
        response = requests.get(dynamic_url, timeout=30, allow_redirects=True)
        if response.status_code != 200 or not response.content:
            return False
        image_path.write_bytes(response.content)
        return True
    except Exception:
        return False


def _build_scene_clip(
    scene: dict[str, str],
    index: int,
    output_path: Path,
    width: int,
    height: int,
) -> CompositeVideoClip:
    scene_text = _clean_text(scene.get("text", ""))
    keyword = _clean_text(scene.get("keyword", "story"))

    audio_filename = output_path.parent / f"audio_{index}.mp3"
    gTTS(text=scene_text, lang="en", slow=False).save(str(audio_filename))
    audio_clip = AudioFileClip(str(audio_filename))
    duration = max(2.5, float(audio_clip.duration))

    image_filename = output_path.parent / f"scene_{index}.jpg"
    if not _fetch_free_image(keyword, image_filename):
        # Fallback to a random placeholder image if stock fetch fails.
        seed = random.randint(1000, 999999)
        placeholder = f"https://picsum.photos/seed/{seed}/{max(640, width)}/{max(360, height)}"
        response = requests.get(placeholder, timeout=20)
        response.raise_for_status()
        image_filename.write_bytes(response.content)

    image_clip = ImageClip(str(image_filename)).resize((width, height)).set_duration(duration)
    image_clip = image_clip.set_audio(audio_clip)

    try:
        text_clip = TextClip(
            scene_text,
            fontsize=40,
            color="white",
            bg_color="black",
            size=(int(width * 0.85), int(height * 0.24)),
            method="caption",
        ).set_position(("center", "bottom")).set_duration(duration)
        return CompositeVideoClip([image_clip, text_clip], size=(width, height))
    except Exception:
        # Text rendering can fail if ImageMagick/fonts are unavailable.
        return CompositeVideoClip([image_clip], size=(width, height))


def generate_text_to_video(
    prompt: str,
    output: str,
    model: str = "damo-vilab/text-to-video-ms-1.7b",
    negative_prompt: str | None = None,
    num_inference_steps: int = 25,
    num_frames: int = 24,
    width: int = 576,
    height: int = 320,
    fps: int = 8,
    guidance_scale: float = 9.0,
    seed: int = 42,
) -> dict[str, Any]:
    clean_prompt = _clean_text(prompt)
    if not clean_prompt:
        raise RuntimeError("Prompt is required.")

    output_path = _resolve_output_path(output)
    scenes = _split_prompt_to_scenes(clean_prompt, max_scenes=max(1, num_frames // 16))

    width = max(320, int(width))
    height = max(240, int(height))
    fps = max(1, int(fps))

    clips: list[Any] = []
    created_assets: list[Path] = []
    try:
        for index, scene in enumerate(scenes):
            clip = _build_scene_clip(scene, index, output_path, width, height)
            clips.append(clip)
            created_assets.append(output_path.parent / f"audio_{index}.mp3")
            created_assets.append(output_path.parent / f"scene_{index}.jpg")

        if not clips:
            raise RuntimeError("No scenes could be generated from prompt.")

        final_video = concatenate_videoclips(clips, method="compose")
        final_video.write_videofile(
            str(output_path),
            fps=fps,
            codec="libx264",
            audio_codec="aac",
            logger=None,
        )
        final_video.close()
    finally:
        for clip in clips:
            try:
                clip.close()
            except Exception:
                pass
        for asset in created_assets:
            try:
                if asset.exists():
                    asset.unlink()
            except Exception:
                pass

    return {
        "success": True,
        "output": str(output_path),
        "model": model or "steve-ai-style-scene-pipeline",
        "seed": int(seed),
        "num_frames": len(scenes),
        "fps": fps,
        "provider": "scene_pipeline_moviepy_gtts",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Steve.ai-style text-to-video scene pipeline")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="damo-vilab/text-to-video-ms-1.7b")
    parser.add_argument("--negative_prompt")
    parser.add_argument("--num_inference_steps", type=int, default=25)
    parser.add_argument("--num_frames", type=int, default=24)
    parser.add_argument("--width", type=int, default=576)
    parser.add_argument("--height", type=int, default=320)
    parser.add_argument("--fps", type=int, default=8)
    parser.add_argument("--guidance_scale", type=float, default=9.0)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    result = generate_text_to_video(
        prompt=args.prompt,
        output=args.output,
        model=args.model,
        negative_prompt=args.negative_prompt,
        num_inference_steps=args.num_inference_steps,
        num_frames=args.num_frames,
        width=args.width,
        height=args.height,
        fps=args.fps,
        guidance_scale=args.guidance_scale,
        seed=args.seed,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
