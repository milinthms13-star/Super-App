# TODO

- [x] Locate the code path causing `spawn python ENOENT`.
- [x] Identify the exact spawn site in `backend/services/kidsVideoGeneratorHFService.js`.
- [ ] Make runtime resilient by adding fallback for python executable (python.exe/python3) when `python` is not in PATH.
- [x] Add documentation to set `PYTHON_BIN` / `PYTHON_PATH` for deployments.
- [x] Run a quick sanity check by calling the HF text-to-video endpoint (or invoking the generator function) after applying fix.




