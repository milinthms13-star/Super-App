FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Install ffmpeg for video-studio rendering.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 8080

CMD ["npm", "start"]

