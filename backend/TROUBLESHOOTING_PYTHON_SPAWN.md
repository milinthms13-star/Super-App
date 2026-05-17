# Troubleshooting: `spawn python ENOENT` (HF text-to-video)

This project spawns Python from Node in:
- `backend/services/kidsVideoGeneratorHFService.js`

The spawn target is derived from environment variables:
- `PYTHON_BIN` (preferred)
- `PYTHON_PATH` (fallback)
- otherwise it defaults to the executable name `python`

## Symptom
`spawn python ENOENT` (Node cannot find the `python` executable in PATH for the Node process).

## Fix (recommended)
Set `PYTHON_BIN` to the full path of `python.exe` in the environment where the Node server runs.

Example (Windows):
- `PYTHON_BIN=C:\Python314\python.exe`

Then restart the Node server so the environment variable is reloaded.

## Linux/Cloud Shell quick fix
Cloud Shell is Linux, so use forward slashes in file paths and prefer `python3`.

Install deps:
- `python3 -m pip install --user -r backend/scripts/requirements-hf-text-to-video.txt`

Set env var for backend runtime:
- `PYTHON_BIN=python3`

If using Render, add environment variable:
- Key: `PYTHON_BIN`
- Value: `python3`

Also set one of:
- `HF_TOKEN`
- `HUGGINGFACE_API_KEY`

## Render deployment fix (important)
If frontend still shows `spawn python ENOENT` after code changes, your backend likely deployed without Python dependencies.

Use `render.yaml` backend build command that installs:
- CPU torch (`--index-url https://download.pytorch.org/whl/cpu`)
- `diffusers`, `transformers`, `accelerate`, `imageio`, `imageio-ffmpeg`

And set:
- `PYTHON_BIN=python3`

Then trigger a **backend redeploy** (not only frontend).

## Quick verification
From the same runtime environment (not just your interactive shell), confirm Node can spawn it.

## Why it happens
Windows can have `python` available in your interactive terminal, but Node’s runtime PATH may differ (different launcher/scheduler/service).

## Hardening (optional)
If you want repo-side resilience, update `kidsVideoGeneratorHFService.js` to fall back to:
- `python.exe`
- `python3`
when `python` is not resolvable.

