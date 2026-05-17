import argparse
import json
import math
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any

import requests
try:
    from moviepy.editor import AudioFileClip, ImageSequenceClip, concatenate_videoclips
except Exception:
    # MoviePy v2 exports directly from `moviepy`.
    from moviepy import AudioFileClip, ImageSequenceClip, concatenate_videoclips
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


@dataclass
class DialogueTurn:
    speaker: str
    text: str


def _resolve_output_path(output: str) -> Path:
    path = Path(output).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() != ".mp4":
        path = path.with_suffix(".mp4")
    return path


def _clean_text(value: str) -> str:
    return str(value or "").replace("\x00", "").strip()


def _resolve_ffmpeg_bin() -> str:
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        return ffmpeg_bin
    try:
        from imageio_ffmpeg import get_ffmpeg_exe

        return get_ffmpeg_exe()
    except Exception:
        return ""


def _run_command(command: list[str]) -> None:
    subprocess.run(command, check=True, capture_output=True, text=False)


def _download_image(url: str, timeout: int = 20) -> Image.Image | None:
    try:
        response = requests.get(url, timeout=timeout, allow_redirects=True)
        if response.status_code != 200 or not response.content:
            return None
        image = Image.open(BytesIO(response.content)).convert("RGB")
        return image
    except Exception:
        return None


def _extract_characters(prompt: str) -> list[Character]:
    lowered = _clean_text(prompt).lower()
    found: list[Character] = []
    for key, payload in KNOWN_CHARACTERS.items():
        if key in lowered:
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
        for item in _clean_text(prompt).replace("!", ".").replace("?", ".").split(".")
        if item.strip()
    ]
    if not chunks:
        chunks = ["A child starts a magical adventure and learns kindness."]

    count = max(3, min(8, int(scene_count or 5)))
    titles = ["Opening", "Challenge", "Journey", "Climax", "Ending", "Twist", "Hope", "Finale"]
    scenes: list[Scene] = []
    for index in range(count):
        base = chunks[index % len(chunks)]
        dialogue = f"{lead}: {base}.\n{support}: We stay together and solve this step by step."
        scenes.append(
            Scene(
                title=titles[index] if index < len(titles) else f"Scene {index + 1}",
                description=base,
                dialogue=dialogue,
            )
        )
    return scenes


def _parse_dialogue_turns(dialogue: str, fallback_speaker: str) -> list[DialogueTurn]:
    lines = [line.strip() for line in _clean_text(dialogue).splitlines() if line.strip()]
    turns: list[DialogueTurn] = []
    for line in lines:
        if ":" in line:
            speaker, text = line.split(":", 1)
            turns.append(DialogueTurn(_clean_text(speaker), _clean_text(text)))
        else:
            turns.append(DialogueTurn(fallback_speaker, line))
    return turns or [DialogueTurn(fallback_speaker, _clean_text(dialogue))]


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


def _draw_vertical_gradient(draw: ImageDraw.ImageDraw, width: int, height: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    for row in range(height):
        ratio = row / max(1, height - 1)
        r = int(top[0] + (bottom[0] - top[0]) * ratio)
        g = int(top[1] + (bottom[1] - top[1]) * ratio)
        b = int(top[2] + (bottom[2] - top[2]) * ratio)
        draw.line((0, row, width, row), fill=(r, g, b))


def _scene_palette(scene: Scene, index_hint: int) -> tuple[tuple[int, int, int], tuple[int, int, int], tuple[int, int, int], bool]:
    lowered = f"{scene.title} {scene.description}".lower()
    if "night" in lowered or "moon" in lowered or "star" in lowered:
        return (20, 34, 82), (72, 98, 181), (18, 38, 68), True
    if "forest" in lowered or "jungle" in lowered:
        return (92, 160, 95), (166, 214, 168), (64, 122, 66), False
    if "sea" in lowered or "river" in lowered or "ocean" in lowered:
        return (56, 150, 193), (153, 227, 253), (45, 130, 170), False
    if index_hint % 3 == 0:
        return (252, 222, 190), (255, 243, 214), (149, 186, 95), False
    if index_hint % 3 == 1:
        return (203, 237, 255), (236, 250, 255), (158, 220, 171), False
    return (233, 215, 255), (251, 241, 255), (172, 209, 160), False


def _draw_character(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    body: str,
    accent: str,
    name: str,
    mouth_open: bool,
    highlight: bool,
    font: ImageFont.ImageFont,
) -> None:
    if highlight:
        draw.ellipse((x - 84, y - 12, x + 84, y + 238), fill="#ffffff22")

    draw.ellipse((x - 95, y + 185, x + 95, y + 220), fill="#00000030")
    draw.ellipse((x - 52, y - 6, x + 52, y + 88), fill="#2f241a")
    draw.ellipse((x - 48, y, x + 48, y + 96), fill="#f6d5b5", outline="#111827", width=3)
    draw.ellipse((x - 20, y + 34, x - 10, y + 44), fill="#111827")
    draw.ellipse((x + 10, y + 34, x + 20, y + 44), fill="#111827")
    draw.line((x - 23, y + 29, x - 8, y + 30), fill="#111827", width=2)
    draw.line((x + 8, y + 30, x + 23, y + 29), fill="#111827", width=2)
    draw.line((x, y + 44, x, y + 57), fill="#b08968", width=2)
    if mouth_open:
        draw.ellipse((x - 14, y + 61, x + 14, y + 80), fill="#7c2d12")
        draw.ellipse((x - 9, y + 64, x + 9, y + 72), fill="#fca5a5")
    else:
        draw.arc((x - 24, y + 55, x + 24, y + 80), start=15, end=165, fill="#7c2d12", width=3)

    draw.rounded_rectangle((x - 10, y + 88, x + 10, y + 105), radius=5, fill="#f2c7a1")
    draw.rounded_rectangle((x - 42, y + 100, x + 42, y + 205), radius=28, fill=body, outline="#0f172a", width=3)
    draw.polygon([(x - 42, y + 110), (x + 42, y + 110), (x, y + 146)], fill=accent)
    draw.rounded_rectangle((x - 51, y + 130, x - 35, y + 156), radius=8, fill=accent)
    draw.rounded_rectangle((x + 35, y + 130, x + 51, y + 156), radius=8, fill=accent)
    draw.rounded_rectangle((x - 24, y + 202, x - 8, y + 252), radius=7, fill="#334155")
    draw.rounded_rectangle((x + 8, y + 202, x + 24, y + 252), radius=7, fill="#334155")
    draw.ellipse((x - 30, y + 248, x - 2, y + 262), fill="#1f2937")
    draw.ellipse((x + 2, y + 248, x + 30, y + 262), fill="#1f2937")
    draw.text((x - 48, y + 266), name, fill="#0f172a", font=font)


def _fit_cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    resized = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def _paste_round_portrait(canvas: Image.Image, portrait: Image.Image, center_x: int, top_y: int, size: int) -> None:
    portrait_fit = _fit_cover(portrait, size, size)
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    canvas.paste(portrait_fit, (center_x - size // 2, top_y), mask)


def _fetch_real_background(scene: Scene, width: int, height: int) -> Image.Image | None:
    query = _clean_text(scene.description or scene.title).replace(" ", "+")
    wiki_api = (
        "https://commons.wikimedia.org/w/api.php"
        f"?action=query&generator=search&gsrsearch={query}&gsrnamespace=6&gsrlimit=8"
        "&prop=imageinfo&iiprop=url&iiurlwidth=1920&format=json"
    )
    try:
        data = requests.get(wiki_api, timeout=20).json()
        pages = data.get("query", {}).get("pages", {})
        urls: list[str] = []
        for page in pages.values():
            imageinfo = page.get("imageinfo", [])
            if imageinfo:
                urls.append(str(imageinfo[0].get("thumburl") or imageinfo[0].get("url") or "").strip())
        for url in urls:
            if not url:
                continue
            image = _download_image(url, timeout=25)
            if image is not None:
                return _fit_cover(image, width, height)
    except Exception:
        pass

    fallback_urls = [
        f"https://picsum.photos/seed/{abs(hash(query)) % 100000}/{width}/{height}",
        f"https://source.unsplash.com/featured/{width}x{height}/?{query}",
    ]
    for url in fallback_urls:
        image = _download_image(url, timeout=20)
        if image is not None:
            return _fit_cover(image, width, height)
    return None


def _fetch_real_portrait(seed_name: str) -> Image.Image | None:
    seed = _clean_text(seed_name).lower().replace(" ", "-") or "story"
    try:
        data = requests.get(f"https://randomuser.me/api/?seed={seed}&inc=picture", timeout=20).json()
        results = data.get("results", [])
        if results:
            picture_url = str(results[0].get("picture", {}).get("large", "")).strip()
            if picture_url:
                image = _download_image(picture_url, timeout=20)
                if image is not None:
                    return image
    except Exception:
        pass

    avatar_urls = [
        f"https://i.pravatar.cc/512?u={seed}",
        f"https://picsum.photos/seed/{seed}-portrait/512/512",
    ]
    for url in avatar_urls:
        image = _download_image(url, timeout=20)
        if image is not None:
            return image
    return None


def _camera_crop(image: Image.Image, out_w: int, out_h: int, progress: float, scene_index: int) -> Image.Image:
    src_w, src_h = image.size
    motion = scene_index % 3

    if motion == 0:
        zoom = 1.0 + (0.12 * progress)
        cx = src_w * 0.5
        cy = src_h * (0.48 + 0.02 * math.sin(progress * math.pi))
    elif motion == 1:
        zoom = 1.08
        cx = src_w * (0.45 + 0.10 * progress)
        cy = src_h * 0.5
    else:
        zoom = 1.06 + 0.04 * (1.0 - abs(0.5 - progress) * 2.0)
        cx = src_w * 0.55
        cy = src_h * (0.47 + 0.03 * progress)

    crop_w = int(out_w / zoom)
    crop_h = int(out_h / zoom)
    left = int(max(0, min(src_w - crop_w, cx - crop_w / 2)))
    top = int(max(0, min(src_h - crop_h, cy - crop_h / 2)))
    right = left + crop_w
    bottom = top + crop_h
    return image.crop((left, top, right, bottom)).resize((out_w, out_h), Image.Resampling.LANCZOS)


def _build_scene_frame(
    scene: Scene,
    characters: list[Character],
    width: int,
    height: int,
    scene_index: int,
    progress: float,
    active_speaker: str,
    mouth_open: bool,
    background_image: Image.Image | None,
    portrait_images: list[Image.Image | None],
) -> Image.Image:
    base_scale = 1.18
    canvas_w = int(width * base_scale)
    canvas_h = int(height * base_scale)

    image = Image.new("RGB", (canvas_w, canvas_h), color="#dbeafe")
    draw = ImageDraw.Draw(image)
    title_num = sum(ord(char) for char in _clean_text(scene.title))
    sky_top, sky_bottom, ground_color, is_night = _scene_palette(scene, title_num)

    if background_image is not None:
        bg_canvas = _fit_cover(background_image, canvas_w, canvas_h)
        image.paste(bg_canvas, (0, 0))
        draw.rectangle((0, 0, canvas_w, canvas_h), fill="#06111f33")
        draw = ImageDraw.Draw(image)
    else:
        _draw_vertical_gradient(draw, canvas_w, int(canvas_h * 0.66), sky_top, sky_bottom)
        draw.rectangle((0, int(canvas_h * 0.66), canvas_w, canvas_h), fill=ground_color)
        draw.ellipse((int(canvas_w * -0.15), int(canvas_h * 0.52), int(canvas_w * 0.45), int(canvas_h * 0.95)), fill="#77b57c")
        draw.ellipse((int(canvas_w * 0.25), int(canvas_h * 0.50), int(canvas_w * 0.78), int(canvas_h * 0.95)), fill="#6ea973")
        draw.ellipse((int(canvas_w * 0.58), int(canvas_h * 0.54), int(canvas_w * 1.12), int(canvas_h * 0.98)), fill="#5e9b62")

    orb_fill = "#f8fafc" if is_night else "#fde047"
    orb_glow = "#ffffff66" if is_night else "#fde68a99"
    orb_x1 = int(canvas_w * 0.82)
    orb_y1 = int(canvas_h * 0.08)
    orb_x2 = int(canvas_w * 0.92)
    orb_y2 = int(canvas_h * 0.20)
    draw.ellipse((orb_x1 - 18, orb_y1 - 18, orb_x2 + 18, orb_y2 + 18), fill=orb_glow)
    draw.ellipse((orb_x1, orb_y1, orb_x2, orb_y2), fill=orb_fill)

    title_font = ImageFont.load_default()
    body_font = ImageFont.load_default()

    draw.rounded_rectangle((24, 22, min(canvas_w - 24, 320), 68), radius=14, fill="#ffffffcc")
    draw.text((38, 36), scene.title, fill="#0f172a", font=title_font)

    bob = math.sin(progress * 2.0 * math.pi) * 5.0
    left_x = int(canvas_w * 0.33)
    right_x = int(canvas_w * 0.67)
    base_y = int(canvas_h * 0.32)

    left_active = active_speaker.lower() == characters[0].name.lower()
    right_active = active_speaker.lower() == characters[1].name.lower()

    left_portrait = portrait_images[0] if len(portrait_images) > 0 else None
    right_portrait = portrait_images[1] if len(portrait_images) > 1 else None

    if left_portrait is not None and right_portrait is not None:
        portrait_size = int(canvas_w * 0.18)
        top_y = int(base_y - 8 + (bob if left_active else 0))
        top_y2 = int(base_y - 8 + (bob if right_active else 0))
        _paste_round_portrait(image, left_portrait, left_x, top_y, portrait_size)
        _paste_round_portrait(image, right_portrait, right_x, top_y2, portrait_size)
        draw = ImageDraw.Draw(image)
        ring_w = 8 if mouth_open else 5
        draw.ellipse((left_x - portrait_size // 2 - 6, top_y - 6, left_x + portrait_size // 2 + 6, top_y + portrait_size + 6), outline=("#38bdf8" if left_active else "#ffffff88"), width=ring_w if left_active else 3)
        draw.ellipse((right_x - portrait_size // 2 - 6, top_y2 - 6, right_x + portrait_size // 2 + 6, top_y2 + portrait_size + 6), outline=("#38bdf8" if right_active else "#ffffff88"), width=ring_w if right_active else 3)
        # Lip-sync cue bars
        bar_h = 24 + (8 if mouth_open else 0)
        draw.rounded_rectangle((left_x - 18, top_y + portrait_size + 10, left_x + 18, top_y + portrait_size + 10 + bar_h), radius=7, fill=("#0ea5e9" if left_active else "#94a3b8"))
        draw.rounded_rectangle((right_x - 18, top_y2 + portrait_size + 10, right_x + 18, top_y2 + portrait_size + 10 + bar_h), radius=7, fill=("#0ea5e9" if right_active else "#94a3b8"))
        draw.text((left_x - 42, top_y + portrait_size + 40), characters[0].name, fill="#f8fafc", font=body_font)
        draw.text((right_x - 42, top_y2 + portrait_size + 40), characters[1].name, fill="#f8fafc", font=body_font)
    else:
        _draw_character(
            draw,
            left_x,
            int(base_y + (bob if left_active else 0)),
            characters[0].body_color,
            characters[0].accent_color,
            characters[0].name,
            mouth_open and left_active,
            left_active,
            body_font,
        )
        _draw_character(
            draw,
            right_x,
            int(base_y + (bob if right_active else 0)),
            characters[1].body_color,
            characters[1].accent_color,
            characters[1].name,
            mouth_open and right_active,
            right_active,
            body_font,
        )

    subtitle_text = scene.dialogue.replace("\n", " ")
    subtitle_lines = _wrap_text(subtitle_text, max_chars=max(28, canvas_w // 34), max_lines=3)
    box_top = int(canvas_h * 0.78)
    box_bottom = canvas_h - 18
    draw.rounded_rectangle((24, box_top, canvas_w - 24, box_bottom), radius=20, fill="#0b1220cc")
    draw.rounded_rectangle((24, box_top, canvas_w - 24, box_top + 5), radius=2, fill="#38bdf8")
    y = box_top + 16
    for line in subtitle_lines:
        draw.text((42, y), line, fill="#f8fafc", font=body_font)
        y += 24

    return _camera_crop(image, width, height, progress, scene_index)


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


def _set_clip_audio(clip: Any, audio: AudioFileClip) -> Any:
    if hasattr(clip, "set_audio"):
        return clip.set_audio(audio)
    return clip.with_audio(audio)


def _generate_scene_frames(
    scene: Scene,
    characters: list[Character],
    width: int,
    height: int,
    duration: float,
    fps: int,
    scene_index: int,
    output_dir: Path,
    background_image: Image.Image | None,
    portrait_images: list[Image.Image | None],
) -> list[Path]:
    turns = _parse_dialogue_turns(scene.dialogue, characters[0].name)
    total_frames = max(1, int(math.ceil(duration * fps)))
    frame_paths: list[Path] = []

    for frame_idx in range(total_frames):
        t = frame_idx / max(1, total_frames - 1)
        timeline_index = min(len(turns) - 1, int(t * len(turns)))
        active_turn = turns[timeline_index]
        mouth_open = math.sin((frame_idx / fps) * 9.0 * math.pi) > 0

        frame = _build_scene_frame(
            scene=scene,
            characters=characters,
            width=width,
            height=height,
            scene_index=scene_index,
            progress=t,
            active_speaker=active_turn.speaker,
            mouth_open=mouth_open,
            background_image=background_image,
            portrait_images=portrait_images,
        )
        frame_path = output_dir / f"scene_{scene_index:02d}_frame_{frame_idx:04d}.png"
        frame.save(frame_path, format="PNG")
        frame_paths.append(frame_path)

    return frame_paths


def _add_background_music_with_ducking(source_video: Path, target_video: Path, duration_seconds: float) -> bool:
    ffmpeg_bin = _resolve_ffmpeg_bin()
    if not ffmpeg_bin:
        return False

    with tempfile.TemporaryDirectory(prefix="storybuilder_music_") as tmp:
        tmp_dir = Path(tmp)
        bgm_path = tmp_dir / "bgm.mp3"

        bgm_expr = "0.018*sin(2*PI*220*t)+0.012*sin(2*PI*330*t)+0.008*sin(2*PI*440*t)+0.006*sin(2*PI*176*t)"
        try:
            _run_command([
                ffmpeg_bin,
                "-y",
                "-f",
                "lavfi",
                "-i",
                f"aevalsrc={bgm_expr}:s=44100:d={max(1.0, duration_seconds)}",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "128k",
                str(bgm_path),
            ])
        except Exception:
            return False

        try:
            _run_command([
                ffmpeg_bin,
                "-y",
                "-i",
                str(source_video),
                "-i",
                str(bgm_path),
                "-filter_complex",
                "[1:a]volume=0.33[bg];[bg][0:a]sidechaincompress=threshold=0.045:ratio=10:attack=18:release=260[duck];[0:a][duck]amix=inputs=2:weights='1 1':normalize=0[aout]",
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                str(target_video),
            ])
            return True
        except Exception:
            try:
                _run_command([
                    ffmpeg_bin,
                    "-y",
                    "-i",
                    str(source_video),
                    "-i",
                    str(bgm_path),
                    "-filter_complex",
                    "[1:a]volume=0.16[bg];[0:a][bg]amix=inputs=2:normalize=0[aout]",
                    "-map",
                    "0:v",
                    "-map",
                    "[aout]",
                    "-c:v",
                    "copy",
                    "-c:a",
                    "aac",
                    "-shortest",
                    str(target_video),
                ])
                return True
            except Exception:
                return False


def generate_text_to_video(
    prompt: str,
    output: str,
    model: str = "storybuilder-v2",
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
    audio_clips: list[Any] = []
    final = None

    tmp_dir = Path(tempfile.mkdtemp(prefix="storybuilder_"))
    dialogue_only_output = output_path.with_name(f"{output_path.stem}.dialogue.mp4")
    used_bgm = False

    try:
        portrait_images = [_fetch_real_portrait(characters[0].name), _fetch_real_portrait(characters[1].name)]
        for index, scene in enumerate(scenes):
            audio_path = tmp_dir / f"scene_{index:02d}.mp3"
            _create_scene_audio(scene.dialogue, audio_path, language)

            audio = AudioFileClip(str(audio_path))
            audio_clips.append(audio)
            duration = max(3.0, float(audio.duration))

            frame_paths = _generate_scene_frames(
                scene=scene,
                characters=characters,
                width=width,
                height=height,
                duration=duration,
                fps=fps,
                scene_index=index,
                output_dir=tmp_dir,
                background_image=_fetch_real_background(scene, int(width * 1.2), int(height * 1.2)),
                portrait_images=portrait_images,
            )

            clip = ImageSequenceClip([str(p) for p in frame_paths], fps=fps)
            clip = _set_clip_audio(clip, audio)
            clips.append(clip)

        if not clips:
            raise RuntimeError("No scenes generated.")

        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            str(dialogue_only_output),
            fps=fps,
            codec="libx264",
            audio_codec="aac",
            logger=None,
        )

        final_duration = float(getattr(final, "duration", 0.0) or 0.0)
        used_bgm = _add_background_music_with_ducking(dialogue_only_output, output_path, final_duration)
        if not used_bgm:
            shutil.copyfile(dialogue_only_output, output_path)
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
        if dialogue_only_output.exists():
            try:
                dialogue_only_output.unlink()
            except Exception:
                pass

    return {
        "success": True,
        "output": str(output_path),
        "model": model,
        "seed": int(seed),
        "num_frames": len(scenes),
        "fps": fps,
        "provider": "storybuilder_free",
        "characters": [character.name for character in characters],
        "lip_sync": True,
        "camera_motion": True,
        "bgm_ducking": used_bgm,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Free Storybuilder character text-to-video")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="storybuilder-v2")
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
