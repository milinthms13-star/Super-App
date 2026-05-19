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


def _load_pose_condition_image(reference_image: str):
    if not reference_image:
        return None
    ref = Path(reference_image).expanduser().resolve()
    if not ref.exists():
        return None

    try:
        from PIL import Image
        from controlnet_aux import OpenposeDetector

        detector = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")
        source = Image.open(ref).convert("RGB")
        pose_image = detector(source)
        return pose_image
    except Exception:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Phase-2 motion scene generation with AnimateDiff + OpenPose guidance.")
    parser.add_argument("--prompt", required=True, help="Scene prompt.")
    parser.add_argument("--output", required=True, help="Output mp4 file path.")
    parser.add_argument("--model", default="emilianJR/epiCRealism", help="Base SD model for AnimateDiff.")
    parser.add_argument("--motion_adapter", default="guoyww/animatediff-motion-adapter-v1-5-2", help="Motion adapter model.")
    parser.add_argument("--controlnet", default="lllyasviel/sd-controlnet-openpose", help="OpenPose controlnet model.")
    parser.add_argument("--reference_image", default="", help="Reference image used to derive pose guidance.")
    parser.add_argument("--num_frames", type=int, default=32, help="Number of frames.")
    parser.add_argument("--num_inference_steps", type=int, default=20, help="Diffusion steps.")
    parser.add_argument("--guidance_scale", type=float, default=7.0, help="Guidance scale.")
    parser.add_argument("--width", type=int, default=768, help="Frame width.")
    parser.add_argument("--height", type=int, default=432, help="Frame height.")
    parser.add_argument("--fps", type=int, default=8, help="Frames per second.")
    parser.add_argument("--dtype", default="fp16", help="Torch dtype: fp16|bf16|fp32")
    args = parser.parse_args()

    prompt = _clean_text(args.prompt)
    if len(prompt) < 3:
        raise ValueError("Prompt is too short.")

    output_path = _resolve_output_path(args.output)
    base_model_id = _clean_text(args.model) or "emilianJR/epiCRealism"
    motion_adapter_id = _clean_text(args.motion_adapter) or "guoyww/animatediff-motion-adapter-v1-5-2"
    controlnet_id = _clean_text(args.controlnet) or "lllyasviel/sd-controlnet-openpose"
    num_frames = max(16, min(48, int(args.num_frames or 32)))
    num_steps = max(8, min(60, int(args.num_inference_steps or 20)))
    guidance = float(args.guidance_scale or 7.0)
    width = max(384, min(1024, int(args.width or 768)))
    height = max(256, min(768, int(args.height or 432)))
    fps = max(4, min(24, int(args.fps or 8)))

    import torch
    from diffusers import (
        AnimateDiffPipeline,
        MotionAdapter,
        DDIMScheduler,
    )
    from diffusers.utils import export_to_video

    dtype = _resolve_torch_dtype(args.dtype)
    motion_adapter = MotionAdapter.from_pretrained(motion_adapter_id, torch_dtype=dtype)
    pose_image = _load_pose_condition_image(args.reference_image)

    pipeline_type = "animatediff"
    used_pose_guidance = False

    if pose_image is not None:
        try:
            from diffusers import AnimateDiffControlNetPipeline, ControlNetModel

            controlnet = ControlNetModel.from_pretrained(controlnet_id, torch_dtype=dtype)
            pipe = AnimateDiffControlNetPipeline.from_pretrained(
                base_model_id,
                motion_adapter=motion_adapter,
                controlnet=controlnet,
                torch_dtype=dtype,
            )
            used_pose_guidance = True
            pipeline_type = "animatediff_controlnet_openpose"
        except Exception:
            pipe = AnimateDiffPipeline.from_pretrained(
                base_model_id,
                motion_adapter=motion_adapter,
                torch_dtype=dtype,
            )
    else:
        pipe = AnimateDiffPipeline.from_pretrained(
            base_model_id,
            motion_adapter=motion_adapter,
            torch_dtype=dtype,
        )

    pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
    pipe.enable_model_cpu_offload()
    if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    generation_kwargs = dict(
        prompt=prompt,
        num_frames=num_frames,
        guidance_scale=guidance,
        num_inference_steps=num_steps,
        width=width,
        height=height,
    )
    if used_pose_guidance and pose_image is not None:
        generation_kwargs["image"] = pose_image

    result = pipe(**generation_kwargs)
    frames = result.frames[0]
    export_to_video(frames, str(output_path), fps=fps)

    print(
        json.dumps(
            {
                "success": True,
                "output": str(output_path),
                "pipeline_type": pipeline_type,
                "used_pose_guidance": used_pose_guidance,
                "num_frames": num_frames,
                "num_inference_steps": num_steps,
                "guidance_scale": guidance,
                "fps": fps,
                "width": width,
                "height": height,
            }
        )
    )


if __name__ == "__main__":
    main()
