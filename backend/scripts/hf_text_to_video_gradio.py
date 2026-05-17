import tempfile
from pathlib import Path

import gradio as gr

from hf_text_to_video import generate_text_to_video


def run_generation(
    prompt: str,
    negative_prompt: str,
    model: str,
    num_inference_steps: int,
    num_frames: int,
    width: int,
    height: int,
    fps: int,
    guidance_scale: float,
    seed: int,
):
    if not prompt or not prompt.strip():
        raise gr.Error("Prompt is required.")

    output_path = Path(tempfile.gettempdir()) / f"hf_t2v_{seed}.mp4"
    result = generate_text_to_video(
        prompt=prompt.strip(),
        output=str(output_path),
        model=model.strip(),
        negative_prompt=negative_prompt.strip() if negative_prompt else None,
        num_inference_steps=num_inference_steps,
        num_frames=num_frames,
        width=width,
        height=height,
        fps=fps,
        guidance_scale=guidance_scale,
        seed=seed,
    )
    return result["output"], result


with gr.Blocks(title="Hugging Face Text-to-Video") as demo:
    gr.Markdown("## Hugging Face Text-to-Video (Python)")
    gr.Markdown("Set `HF_TOKEN` or `HUGGINGFACE_API_KEY` for gated/private models.")

    with gr.Row():
        with gr.Column():
            prompt = gr.Textbox(
                label="Prompt",
                lines=3,
                value="A cinematic drone shot flying over monsoon-soaked tea hills at sunrise",
            )
            negative_prompt = gr.Textbox(
                label="Negative Prompt",
                lines=2,
                value="blurry, distorted, low quality",
            )
            model = gr.Textbox(
                label="Model",
                value="damo-vilab/text-to-video-ms-1.7b",
            )
            num_inference_steps = gr.Slider(10, 60, value=25, step=1, label="Inference Steps")
            num_frames = gr.Slider(8, 48, value=24, step=1, label="Frames")
            width = gr.Slider(256, 1024, value=576, step=64, label="Width")
            height = gr.Slider(256, 1024, value=320, step=64, label="Height")
            fps = gr.Slider(4, 24, value=8, step=1, label="FPS")
            guidance_scale = gr.Slider(1.0, 20.0, value=9.0, step=0.5, label="Guidance Scale")
            seed = gr.Number(value=42, precision=0, label="Seed")
            generate_btn = gr.Button("Generate Video", variant="primary")
        with gr.Column():
            video_output = gr.Video(label="Generated Video", format="mp4")
            json_output = gr.JSON(label="Run Details")

    generate_btn.click(
        fn=run_generation,
        inputs=[
            prompt,
            negative_prompt,
            model,
            num_inference_steps,
            num_frames,
            width,
            height,
            fps,
            guidance_scale,
            seed,
        ],
        outputs=[video_output, json_output],
    )


if __name__ == "__main__":
    demo.launch()
