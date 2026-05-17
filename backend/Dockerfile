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

# Install Python dependencies for scene-based text-to-video pipeline.
RUN python3 -m pip install --no-cache-dir --break-system-packages -r backend/scripts/requirements-hf-text-to-video.txt

EXPOSE 8080

CMD ["npm", "start"]
