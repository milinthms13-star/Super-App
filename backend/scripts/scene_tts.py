import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from gtts import gTTS


def _map_espeak_voice(lang: str) -> str:
    code = str(lang or "en").strip().split("-")[0].lower()
    mapping = {
        "en": "en",
        "hi": "hi",
        "ml": "ml",
        "ta": "ta",
        "te": "te",
        "kn": "kn",
    }
    return mapping.get(code, "en")


def _synthesize_with_espeak(text: str, output: Path, lang: str) -> None:
    espeak_bin = shutil.which("espeak-ng") or shutil.which("espeak")
    if not espeak_bin:
        raise RuntimeError("espeak is not installed.")

    voice = _map_espeak_voice(lang)
    with tempfile.TemporaryDirectory(prefix="scene_tts_") as tmp_dir:
        wav_path = Path(tmp_dir) / "speech.wav"
        subprocess.run(
            [espeak_bin, "-v", voice, "-s", "145", "-w", str(wav_path), text],
            check=True,
            capture_output=True,
            text=False,
        )

        if output.suffix.lower() == ".wav":
            output.write_bytes(wav_path.read_bytes())
            return

        ffmpeg_bin = shutil.which("ffmpeg")
        if not ffmpeg_bin:
            raise RuntimeError("ffmpeg is required to convert espeak wav output.")

        subprocess.run(
            [ffmpeg_bin, "-y", "-i", str(wav_path), "-acodec", "libmp3lame", "-b:a", "128k", str(output)],
            check=True,
            capture_output=True,
            text=False,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate scene narration MP3 using gTTS")
    parser.add_argument("--text", required=True, help="Narration text")
    parser.add_argument("--output", required=True, help="Output mp3 path")
    parser.add_argument("--lang", default="en", help="Language code (en, hi, ml, ...)")
    args = parser.parse_args()

    text = str(args.text or "").replace("\x00", "").strip()
    if not text:
        raise ValueError("Text is required.")

    output = Path(args.output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.suffix.lower() != ".mp3":
        output = output.with_suffix(".mp3")

    language = str(args.lang or "en").strip().split("-")[0].lower() or "en"
    try:
        gTTS(text=text, lang=language, slow=False).save(str(output))
    except Exception:
        # Free offline fallback for environments where gTTS network calls fail.
        _synthesize_with_espeak(text=text, output=output, lang=language)


if __name__ == "__main__":
    main()
