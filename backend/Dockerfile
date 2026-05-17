FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080
ENV PYTHON_BIN=python3

WORKDIR /app

# Install ffmpeg for video-studio rendering.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Install Python dependencies for HF text-to-video (CPU build).
RUN python3 -m pip install --no-cache-dir --break-system-packages --index-url https://download.pytorch.org/whl/cpu torch \
  && python3 -m pip install --no-cache-dir --break-system-packages diffusers transformers accelerate imageio imageio-ffmpeg safetensors huggingface_hub

EXPOSE 8080

CMD ["npm", "start"]
