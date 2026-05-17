import argparse
import json
import os
import random
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any

import requests
from gtts import gTTS
try:
    from moviepy.editor import (
        AudioFileClip,
        CompositeVideoClip,
        ImageClip,
        TextClip,
        concatenate_videoclips,
    )
except Exception:
    # MoviePy v2 exports directly from `moviepy`.
    from moviepy import (
        AudioFileClip,
        CompositeVideoClip,
        ImageClip,
        TextClip,
        concatenate_videoclips,
    )
from PIL import Image, ImageDraw, ImageFont


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


def split_script_to_scenes(script: str, max_scenes: int) -> list[dict[str, str]]:
    chunks = [
        s.strip()
        for s in re.split(r"(?<=[.!?])\s+|\n+", script.strip())
        if s.strip()
    ]
    chunks = chunks[:max_scenes]
    scenes: list[dict[str, str]] = []
    for sentence in chunks:
        words = re.findall(r"[a-zA-Z][a-zA-Z'-]+", sentence.lower())
        keyword = next((w for w in words if w not in COMMON_STOPWORDS and len(w) > 3), "story")
        scenes.append({"text": sentence, "keyword": keyword})
    return scenes


def fetch_wikimedia_image(keyword: str, destination_path: Path) -> bool:
    # Free + no API key.
    search_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": keyword,
        "gsrnamespace": 6,
        "gsrlimit": 10,
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": 1920,
        "format": "json",
    }
    try:
        response = requests.get(search_url, params=params, timeout=20)
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", {})
        urls = []
        for page in pages.values():
            imageinfo = page.get("imageinfo", [])
            if imageinfo and imageinfo[0].get("thumburl"):
                urls.append(imageinfo[0]["thumburl"])
            elif imageinfo and imageinfo[0].get("url"):
                urls.append(imageinfo[0]["url"])
        if not urls:
            return False
        selected = random.choice(urls)
        image_bytes = requests.get(selected, timeout=20).content
        destination_path.write_bytes(image_bytes)
        return True
    except Exception:
        return False


def create_fallback_image(keyword: str, text: str, destination_path: Path, width: int, height: int) -> None:
    image = Image.new("RGB", (width, height), color=(22, 34, 60))
    draw = ImageDraw.Draw(image)
    for i in range(height):
        c = int(22 + (i / max(1, height - 1)) * 100)
        draw.line([(0, i), (width, i)], fill=(c, min(160, c + 20), 190))

    title = keyword.upper()
    caption = text[:120] + ("..." if len(text) > 120 else "")
    font = ImageFont.load_default()
    draw.rectangle([(60, height - 260), (width - 60, height - 60)], fill=(0, 0, 0, 120))
    draw.text((90, height - 230), title, fill=(255, 220, 120), font=font)
    draw.text((90, height - 190), caption, fill=(245, 245, 245), font=font)
    image.save(destination_path)


def make_scene_clip(
    scene: dict[str, str],
    index: int,
    temp_dir: Path,
    width: int,
    height: int,
    lang: str,
) -> CompositeVideoClip:
    scene_text = scene["text"]
    keyword = scene["keyword"]

    audio_file = temp_dir / f"audio_{index}.mp3"
    gTTS(text=scene_text, lang=lang, slow=False).save(str(audio_file))
    audio = AudioFileClip(str(audio_file))
    duration = max(2.5, float(audio.duration))

    image_file = temp_dir / f"scene_{index}.jpg"
    if not fetch_wikimedia_image(keyword, image_file):
        create_fallback_image(keyword, scene_text, image_file, width, height)

    image_clip = ImageClip(str(image_file)).resize((width, height)).set_duration(duration)
    image_clip = image_clip.set_audio(audio)

    text_clip = TextClip(
        scene_text,
        fontsize=44,
        color="white",
        method="caption",
        size=(int(width * 0.85), int(height * 0.26)),
        bg_color="rgba(0,0,0,0.6)",
    ).set_position(("center", "bottom")).set_duration(duration)

    return CompositeVideoClip([image_clip, text_clip], size=(width, height))


def generate_video(
    script: str,
    output_path: str,
    max_scenes: int,
    width: int,
    height: int,
    fps: int,
    language: str,
) -> dict[str, Any]:
    scenes = split_script_to_scenes(script, max_scenes=max_scenes)
    if not scenes:
        raise ValueError("Script is empty or could not be parsed into scenes.")

    output = Path(output_path).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.suffix.lower() != ".mp4":
        output = output.with_suffix(".mp4")

    temp_dir = Path(tempfile.mkdtemp(prefix="steve_like_t2v_"))
    clips = []
    try:
        for idx, scene in enumerate(scenes):
            clips.append(make_scene_clip(scene, idx, temp_dir, width, height, language))
        final_clip = concatenate_videoclips(clips, method="compose")
        final_clip.write_videofile(
            str(output),
            fps=max(1, fps),
            codec="libx264",
            audio_codec="aac",
            threads=2,
            logger=None,
        )
    finally:
        for clip in clips:
            try:
                clip.close()
            except Exception:
                pass
        shutil.rmtree(temp_dir, ignore_errors=True)

    return {
        "success": True,
        "output": str(output),
        "scene_count": len(scenes),
        "resolution": f"{width}x{height}",
        "fps": fps,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Free Steve.ai-like text-to-video pipeline")
    parser.add_argument("--script", required=True, help="Input script text")
    parser.add_argument("--output", default="steve_like_output.mp4", help="Output MP4 path")
    parser.add_argument("--max_scenes", type=int, default=6, help="Maximum number of scenes")
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=24)
    parser.add_argument("--lang", default="en", help="TTS language code for gTTS")
    args = parser.parse_args()

    result = generate_video(
        script=args.script,
        output_path=args.output,
        max_scenes=max(1, min(20, args.max_scenes)),
        width=max(320, args.width),
        height=max(240, args.height),
        fps=max(1, args.fps),
        language=args.lang,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        raise
