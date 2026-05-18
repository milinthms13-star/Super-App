import argparse
import json
from pathlib import Path


def _clean_text(value: str) -> str:
    return str(value or "").replace("\x00", "").strip()


def _resolve_output_path(output: str) -> Path:
    path = Path(output).expanduser().resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() != ".mp4":
        path = path.with_suffix(".mp4")
    return path


def _resolve_torch_dtype(dtype: str):
    import torch

    normalized = _clean_text(dtype).lower()
    if normalized in {"fp32", "float32"}:
        return torch.float32
    if normalized in {"bf16", "bfloat16"}:
        return torch.bfloat16
    return torch.float16


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate real motion text-to-video using CogVideoX.")
    parser.add_argument("--prompt", required=True, help="Text prompt for the video generation model.")
    parser.add_argument("--output", required=True, help="Output mp4 path.")
    parser.add_argument("--model", default="THUDM/CogVideoX-2b", help="Model ID.")
    parser.add_argument("--num_frames", type=int, default=49, help="Number of frames.")
    parser.add_argument("--num_inference_steps", type=int, default=30, help="Diffusion steps.")
    parser.add_argument("--guidance_scale", type=float, default=6.0, help="Guidance scale.")
    parser.add_argument("--fps", type=int, default=8, help="Output FPS.")
    parser.add_argument("--dtype", default="fp16", help="Torch dtype: fp16|bf16|fp32")
    args = parser.parse_args()

    prompt = _clean_text(args.prompt)
    if len(prompt) < 3:
        raise ValueError("Prompt is too short.")

    output_path = _resolve_output_path(args.output)
    model_id = _clean_text(args.model) or "THUDM/CogVideoX-2b"
    num_frames = max(16, min(97, int(args.num_frames or 49)))
    num_steps = max(10, min(80, int(args.num_inference_steps or 30)))
    guidance = float(args.guidance_scale or 6.0)
    fps = max(4, min(24, int(args.fps or 8)))

    import torch
    from diffusers import CogVideoXPipeline
    from diffusers.utils import export_to_video

    dtype = _resolve_torch_dtype(args.dtype)
    pipe = CogVideoXPipeline.from_pretrained(model_id, torch_dtype=dtype)
    pipe.enable_model_cpu_offload()
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    result = pipe(
        prompt=prompt,
        num_videos_per_prompt=1,
        num_inference_steps=num_steps,
        num_frames=num_frames,
        guidance_scale=guidance,
    )
    frames = result.frames[0]
    export_to_video(frames, str(output_path), fps=fps)

    print(
        json.dumps(
            {
                "success": True,
                "output": str(output_path),
                "model": model_id,
                "num_frames": num_frames,
                "num_inference_steps": num_steps,
                "guidance_scale": guidance,
                "fps": fps,
            }
        )
    )


if __name__ == "__main__":
    main()
