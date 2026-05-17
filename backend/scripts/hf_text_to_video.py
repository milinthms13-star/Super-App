import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Hugging Face Diffusers text-to-video generator")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="damo-vilab/text-to-video-ms-1.7b")
    parser.add_argument("--num_inference_steps", type=int, default=25)
    parser.add_argument("--num_frames", type=int, default=200)
    parser.add_argument("--width", type=int, default=576)
    parser.add_argument("--height", type=int, default=320)
    parser.add_argument("--fps", type=int, default=12)
    args = parser.parse_args()

    try:
        import torch
        from diffusers import DiffusionPipeline, DPMSolverMultistepScheduler
        from diffusers.utils import export_to_video
    except Exception as error:
      raise RuntimeError(
          "Missing dependencies. Install: pip install torch diffusers transformers accelerate imageio imageio-ffmpeg"
      ) from error

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    token = os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_TOKEN")
    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    variant = "fp16" if torch.cuda.is_available() else None

    pipe = DiffusionPipeline.from_pretrained(
        args.model,
        torch_dtype=dtype,
        variant=variant,
        use_safetensors=True,
        token=token,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

    if torch.cuda.is_available():
        pipe.enable_model_cpu_offload()
    pipe.enable_vae_slicing()

    generated = pipe(
        args.prompt,
        num_inference_steps=max(1, args.num_inference_steps),
        num_frames=max(8, args.num_frames),
        width=max(128, args.width),
        height=max(128, args.height),
    ).frames

    # Diffusers can return [frames] for batch size 1.
    video_frames = generated[0] if generated and isinstance(generated[0], list) else generated
    export_to_video(video_frames, output_video_path=args.output, fps=max(1, args.fps))

    print(json.dumps({
        "success": True,
        "output": args.output,
        "model": args.model,
        "num_frames": len(video_frames),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        sys.exit(1)
