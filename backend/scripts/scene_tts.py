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
        "bn": "bn",
        "mr": "mr",
        "gu": "gu",
        "ur": "ur",
        "ar": "ar",
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

        ffmpeg_bin = _resolve_ffmpeg_bin()
        if not ffmpeg_bin:
            raise RuntimeError("ffmpeg is required to convert espeak wav output.")

        subprocess.run(
            [ffmpeg_bin, "-y", "-i", str(wav_path), "-acodec", "libmp3lame", "-b:a", "128k", str(output)],
            check=True,
            capture_output=True,
            text=False,
        )


def _resolve_ffmpeg_bin() -> str:
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        return ffmpeg_bin
    try:
        from imageio_ffmpeg import get_ffmpeg_exe

        return get_ffmpeg_exe()
    except Exception:
        return ""


def _synthesize_with_windows_speech(text: str, output: Path) -> None:
    powershell = shutil.which("powershell") or shutil.which("pwsh")
    if not powershell:
        raise RuntimeError("PowerShell is not available for Windows speech synthesis.")

    safe_text = text.replace("'", "''")
    with tempfile.TemporaryDirectory(prefix="scene_tts_") as tmp_dir:
        wav_path = Path(tmp_dir) / "speech.wav"
        safe_wav = str(wav_path).replace("'", "''")
        script = (
            "Add-Type -AssemblyName System.Speech; "
            "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
            "$synth.Rate = -1; "
            f"$synth.SetOutputToWaveFile('{safe_wav}'); "
            f"$synth.Speak('{safe_text}'); "
            "$synth.Dispose();"
        )
        subprocess.run(
            [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
            check=True,
            capture_output=True,
            text=False,
        )

        if not wav_path.exists() or wav_path.stat().st_size == 0:
            raise RuntimeError("Windows speech synthesizer did not produce audio.")

        if output.suffix.lower() == ".wav":
            output.write_bytes(wav_path.read_bytes())
            return

        ffmpeg_bin = _resolve_ffmpeg_bin()
        if not ffmpeg_bin:
            raise RuntimeError("ffmpeg is required to convert wav speech output.")

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
        # Free offline fallback chain for environments where gTTS network calls fail.
        try:
            _synthesize_with_espeak(text=text, output=output, lang=language)
        except Exception:
            _synthesize_with_windows_speech(text=text, output=output)


if __name__ == "__main__":
    main()
