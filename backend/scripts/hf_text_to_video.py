import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any


def _resolve_output_path(output: str) -> Path:
    output_path = Path(output).expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() != ".mp4":
        output_path = output_path.with_suffix(".mp4")
    return output_path


def _load_pipeline(model: str, dtype: Any, token: str | None):
    from diffusers import DPMSolverMultistepScheduler, DiffusionPipeline

    kwargs: dict[str, Any] = {
        "torch_dtype": dtype,
        "use_safetensors": True,
    }
    if token:
        kwargs["token"] = token
    if str(dtype).endswith("float16"):
        kwargs["variant"] = "fp16"

    try:
        pipe = DiffusionPipeline.from_pretrained(model, **kwargs)
    except Exception:
        if "variant" not in kwargs:
            raise
        kwargs.pop("variant", None)
        pipe = DiffusionPipeline.from_pretrained(model, **kwargs)

    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    return pipe


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
    try:
        import torch
        from diffusers.utils import export_to_video
    except Exception as error:
        raise RuntimeError(
            "Missing dependencies. Install: pip install torch diffusers transformers accelerate imageio imageio-ffmpeg"
        ) from error

    output_path = _resolve_output_path(output)
    token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    has_cuda = torch.cuda.is_available()
    dtype = torch.float16 if has_cuda else torch.float32
    device = "cuda" if has_cuda else "cpu"

    pipe = _load_pipeline(model=model, dtype=dtype, token=token)
    if has_cuda:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to(device)
    pipe.enable_vae_slicing()

    generator = torch.Generator(device=device).manual_seed(seed)
    result = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt if negative_prompt else None,
        num_inference_steps=max(1, num_inference_steps),
        num_frames=max(8, num_frames),
        width=max(128, width),
        height=max(128, height),
        guidance_scale=max(0.0, guidance_scale),
        generator=generator,
    ).frames

    # Diffusers can return [frames] for batch size 1.
    video_frames = result[0] if result and isinstance(result[0], list) else result
    export_to_video(video_frames, output_video_path=str(output_path), fps=max(1, fps))

    return {
        "success": True,
        "output": str(output_path),
        "model": model,
        "seed": seed,
        "num_frames": len(video_frames),
        "device": device,
    }


def main():
    parser = argparse.ArgumentParser(description="Hugging Face Diffusers text-to-video generator")
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
