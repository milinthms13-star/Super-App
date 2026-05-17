import argparse
from pathlib import Path

from gtts import gTTS


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
    gTTS(text=text, lang=language, slow=False).save(str(output))


if __name__ == "__main__":
    main()
