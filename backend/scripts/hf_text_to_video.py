import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from moviepy.editor import AudioFileClip, ImageClip, concatenate_videoclips
except Exception:
    # MoviePy v2 exports directly from `moviepy`.
    from moviepy import AudioFileClip, ImageClip, concatenate_videoclips
from PIL import Image, ImageDraw, ImageFont


KNOWN_CHARACTERS = {
    "rabbit": ("Rabbit", "#f97316", "#fde68a"),
    "tortoise": ("Tortoise", "#059669", "#a7f3d0"),
    "turtle": ("Turtle", "#059669", "#a7f3d0"),
    "lion": ("Lion", "#b45309", "#fde68a"),
    "fox": ("Fox", "#ea580c", "#fed7aa"),
    "bear": ("Bear", "#7c2d12", "#d6d3d1"),
    "dog": ("Dog", "#2563eb", "#bfdbfe"),
    "cat": ("Cat", "#7c3aed", "#ddd6fe"),
    "rama": ("Rama", "#1d4ed8", "#bfdbfe"),
    "sita": ("Sita", "#be185d", "#fbcfe8"),
}


@dataclass
class Character:
    name: str
    body_color: str
    accent_color: str


@dataclass
class Scene:
    title: str
    description: str
    dialogue: str


def _resolve_output_path(output: str) -> Path:
    path = Path(output).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() != ".mp4":
        path = path.with_suffix(".mp4")
    return path


def _clean_text(value: str) -> str:
    return str(value or "").replace("\x00", "").strip()


def _extract_characters(prompt: str) -> list[Character]:
    lowered = _clean_text(prompt).lower()
    found: list[Character] = []
    for key, payload in KNOWN_CHARACTERS.items():
        if re.search(rf"\\b{re.escape(key)}\\b", lowered):
            found.append(Character(*payload))
        if len(found) >= 2:
            break

    if len(found) < 2:
        defaults = [Character("Asha", "#2563eb", "#bfdbfe"), Character("Ravi", "#7c3aed", "#ddd6fe")]
        for character in defaults:
            if len(found) >= 2:
                break
            if all(character.name != current.name for current in found):
                found.append(character)

    return found[:2]


def _split_prompt_to_scenes(prompt: str, scene_count: int, lead: str, support: str) -> list[Scene]:
    chunks = [
        item.strip()
        for item in re.split(r"(?<=[.!?])\\s+|\\n+", _clean_text(prompt))
        if item.strip()
    ]
    if not chunks:
        chunks = ["A child starts a magical adventure and learns kindness."]

    count = max(3, min(8, int(scene_count or 5)))
    titles = ["Opening", "Challenge", "Journey", "Climax", "Ending", "Twist", "Hope", "Finale"]
    scenes: list[Scene] = []
    for index in range(count):
        base = chunks[index % len(chunks)]
        dialogue = f"{lead}: {base}\\n{support}: We stay together and solve this step by step."
        scenes.append(
            Scene(
                title=titles[index] if index < len(titles) else f"Scene {index + 1}",
                description=base,
                dialogue=dialogue,
            )
        )
    return scenes


def _wrap_text(value: str, max_chars: int, max_lines: int) -> list[str]:
    words = _clean_text(value).split()
    if not words:
        return [""]

    lines: list[str] = []
    current = ""
    for word in words:
        tentative = f"{current} {word}".strip()
        if len(tentative) <= max_chars:
            current = tentative
            continue
        if current:
            lines.append(current)
        current = word
        if len(lines) >= max_lines - 1:
            break
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines or [""]


def _draw_character(draw: ImageDraw.ImageDraw, x: int, y: int, body: str, accent: str, name: str, font: ImageFont.ImageFont) -> None:
    # Shadow
    draw.ellipse((x - 80, y + 165, x + 80, y + 205), fill="#00000033")
    # Head
    draw.ellipse((x - 48, y, x + 48, y + 96), fill="#fde7c6", outline="#111827", width=3)
    draw.ellipse((x - 20, y + 32, x - 10, y + 42), fill="#111827")
    draw.ellipse((x + 10, y + 32, x + 20, y + 42), fill="#111827")
    draw.arc((x - 22, y + 48, x + 22, y + 74), start=15, end=165, fill="#7c2d12", width=3)
    # Body
    draw.rounded_rectangle((x - 36, y + 94, x + 36, y + 198), radius=26, fill=body, outline="#0f172a", width=3)
    draw.ellipse((x - 47, y + 126, x - 29, y + 144), fill=accent)
    draw.ellipse((x + 29, y + 126, x + 47, y + 144), fill=accent)
    draw.rounded_rectangle((x - 22, y + 196, x - 6, y + 244), radius=8, fill="#334155")
    draw.rounded_rectangle((x + 6, y + 196, x + 22, y + 244), radius=8, fill="#334155")
    draw.text((x - 45, y + 250), name, fill="#0f172a", font=font)


def _build_scene_image(scene: Scene, characters: list[Character], width: int, height: int, output: Path) -> None:
    image = Image.new("RGB", (width, height), color="#dbeafe")
    draw = ImageDraw.Draw(image)

    # Background
    draw.rectangle((0, 0, width, int(height * 0.62)), fill="#bae6fd")
    draw.rectangle((0, int(height * 0.62), width, height), fill="#bbf7d0")
    draw.ellipse((int(width * 0.83), int(height * 0.06), int(width * 0.93), int(height * 0.20)), fill="#fde047")

    title_font = ImageFont.load_default()
    body_font = ImageFont.load_default()

    draw.text((32, 26), scene.title, fill="#0f172a", font=title_font)

    left_x = int(width * 0.32)
    right_x = int(width * 0.68)
    base_y = int(height * 0.30)
    _draw_character(draw, left_x, base_y, characters[0].body_color, characters[0].accent_color, characters[0].name, body_font)
    _draw_character(draw, right_x, base_y, characters[1].body_color, characters[1].accent_color, characters[1].name, body_font)

    # Dialogue subtitle box
    box_top = int(height * 0.74)
    box_bottom = height - 18
    draw.rounded_rectangle((26, box_top, width - 26, box_bottom), radius=18, fill="#000000B0")

    subtitle_lines = _wrap_text(scene.dialogue.replace("\n", " "), max_chars=max(28, width // 30), max_lines=3)
    y = box_top + 14
    for line in subtitle_lines:
        draw.text((42, y), line, fill="#ffffff", font=body_font)
        y += 24

    image.save(output, format="PNG")


def _create_scene_audio(text: str, output_mp3: Path, language: str) -> None:
    tts_script = Path(__file__).resolve().parent / "scene_tts.py"
    cmd = [
        sys.executable,
        str(tts_script),
        "--text",
        _clean_text(text),
        "--output",
        str(output_mp3),
        "--lang",
        _clean_text(language or "en") or "en",
    ]
    subprocess.run(cmd, check=True)


def _attach_audio_and_duration(image_path: Path, audio: AudioFileClip, duration: float) -> Any:
    clip = ImageClip(str(image_path))
    if hasattr(clip, "set_duration"):
        clip = clip.set_duration(duration)
    else:
        clip = clip.with_duration(duration)

    if hasattr(clip, "set_audio"):
        clip = clip.set_audio(audio)
    else:
        clip = clip.with_audio(audio)
    return clip


def generate_text_to_video(
    prompt: str,
    output: str,
    model: str = "storybuilder-v1",
    negative_prompt: str | None = None,
    num_inference_steps: int = 25,
    num_frames: int = 24,
    width: int = 576,
    height: int = 320,
    fps: int = 12,
    guidance_scale: float = 9.0,
    seed: int = 42,
    language: str = "en",
) -> dict[str, Any]:
    clean_prompt = _clean_text(prompt)
    if not clean_prompt:
        raise RuntimeError("Prompt is required.")

    output_path = _resolve_output_path(output)
    width = max(640, int(width))
    height = max(360, int(height))
    fps = max(8, int(fps))

    characters = _extract_characters(clean_prompt)
    lead = characters[0].name
    support = characters[1].name
    scenes = _split_prompt_to_scenes(clean_prompt, max(3, num_frames // 16), lead=lead, support=support)

    clips: list[Any] = []
    created_files: list[Path] = []

    tmp_dir = Path(tempfile.mkdtemp(prefix="storybuilder_"))
    audio_clips: list[Any] = []
    final = None
    try:
        for index, scene in enumerate(scenes):
            image_path = tmp_dir / f"scene_{index:02d}.png"
            audio_path = tmp_dir / f"scene_{index:02d}.mp3"
            _build_scene_image(scene, characters, width, height, image_path)
            _create_scene_audio(scene.dialogue, audio_path, language)

            audio = AudioFileClip(str(audio_path))
            audio_clips.append(audio)
            duration = max(3.0, float(audio.duration))
            clip = _attach_audio_and_duration(image_path, audio, duration)
            clips.append(clip)

            created_files.extend([image_path, audio_path])

        if not clips:
            raise RuntimeError("No scenes generated.")

        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            str(output_path),
            fps=fps,
            codec="libx264",
            audio_codec="aac",
            logger=None,
        )
    finally:
        if final is not None:
            try:
                final.close()
            except Exception:
                pass
        for clip in clips:
            try:
                clip.close()
            except Exception:
                pass
        for audio in audio_clips:
            try:
                audio.close()
            except Exception:
                pass
        shutil.rmtree(tmp_dir, ignore_errors=True)

    return {
        "success": True,
        "output": str(output_path),
        "model": model,
        "seed": int(seed),
        "num_frames": len(scenes),
        "fps": fps,
        "provider": "storybuilder_free",
        "characters": [character.name for character in characters],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Free Storybuilder character text-to-video")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="storybuilder-v1")
    parser.add_argument("--negative_prompt")
    parser.add_argument("--num_inference_steps", type=int, default=25)
    parser.add_argument("--num_frames", type=int, default=24)
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--guidance_scale", type=float, default=9.0)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--lang", default="en")
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
        language=args.lang,
    )
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
