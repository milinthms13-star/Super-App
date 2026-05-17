import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import request as urlrequest

HF_API_BASE = "https://api-inference.huggingface.co/models"


def _resolve_output_path(output: str) -> Path:
    output_path = Path(output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() != ".mp4":
        output_path = output_path.with_suffix(".mp4")
    return output_path


def _get_hf_token() -> str:
    token = (
        os.getenv("HUGGINGFACE_API_KEY")
        or os.getenv("HF_TOKEN")
        or os.getenv("HF_API_KEY")
        or ""
    ).strip()
    if not token:
        raise RuntimeError(
            "Missing Hugging Face token. Set HUGGINGFACE_API_KEY or HF_TOKEN."
        )
    return token


def _parse_error_message(raw_body: bytes, status: int) -> str:
    text = raw_body.decode("utf-8", errors="replace").strip()
    if not text:
        return f"HTTP {status}"

    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            message = (
                str(payload.get("error") or payload.get("message") or "").strip()
            )
            if message:
                return message
    except json.JSONDecodeError:
        pass

    return text[:500]


def _request_video_bytes(
    model: str,
    token: str,
    payload: dict[str, Any],
    timeout_seconds: int = 600,
    max_retries: int = 3,
) -> bytes:
    url = f"{HF_API_BASE}/{model}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "video/*",
    }
    body = json.dumps(payload).encode("utf-8")

    for attempt in range(max_retries + 1):
        req = urlrequest.Request(url=url, data=body, headers=headers, method="POST")
        try:
            with urlrequest.urlopen(req, timeout=timeout_seconds) as response:
                raw = response.read()
                content_type = (response.headers.get("content-type") or "").lower()
                if not raw:
                    raise RuntimeError("Hugging Face returned empty video bytes.")
                if content_type.startswith("video/") or "octet-stream" in content_type:
                    return raw
                # Some failures are JSON/text with status 200.
                message = _parse_error_message(raw, 200)
                raise RuntimeError(
                    f"Unexpected response type '{content_type or 'unknown'}': {message}"
                )
        except urlerror.HTTPError as exc:
            raw_error = exc.read() if hasattr(exc, "read") else b""
            message = _parse_error_message(raw_error, exc.code)

            # 503 can occur while a model is cold-starting.
            if exc.code == 503 and attempt < max_retries:
                wait_seconds = 20 * (attempt + 1)
                time.sleep(wait_seconds)
                continue

            raise RuntimeError(f"Hugging Face API error ({exc.code}): {message}") from exc
        except urlerror.URLError as exc:
            if attempt < max_retries:
                wait_seconds = 10 * (attempt + 1)
                time.sleep(wait_seconds)
                continue
            raise RuntimeError(f"Network error calling Hugging Face API: {exc}") from exc

    raise RuntimeError("Unable to generate video after retries.")


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
    clean_prompt = str(prompt or "").strip()
    if not clean_prompt:
        raise RuntimeError("Prompt is required.")

    output_path = _resolve_output_path(output)
    token = _get_hf_token()

    parameters: dict[str, Any] = {
        "num_inference_steps": max(1, int(num_inference_steps)),
        "num_frames": max(8, int(num_frames)),
        "guidance_scale": max(0.0, float(guidance_scale)),
        "seed": int(seed),
        "width": max(128, int(width)),
        "height": max(128, int(height)),
        # Many models ignore fps, but we pass it when supported.
        "fps": max(1, int(fps)),
    }

    if negative_prompt and str(negative_prompt).strip():
        parameters["negative_prompt"] = str(negative_prompt).strip()

    payload = {
        "inputs": clean_prompt,
        "parameters": parameters,
        "options": {
            "wait_for_model": True,
            "use_cache": False,
        },
    }

    video_bytes = _request_video_bytes(model=model, token=token, payload=payload)
    output_path.write_bytes(video_bytes)

    return {
        "success": True,
        "output": str(output_path),
        "model": model,
        "seed": int(seed),
        "num_frames": int(parameters["num_frames"]),
        "fps": int(parameters["fps"]),
        "provider": "huggingface_inference_api",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Hugging Face text-to-video generator")
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
