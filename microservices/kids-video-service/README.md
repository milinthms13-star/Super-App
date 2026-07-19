# Kids Video Maker Service

Kids Video Maker microservice for MalabarBazaar.

## Features

- Kids Video Maker management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/kidsvideomaker/*` - Kidsvideomaker operations
- `/api/cartoons/*` - Cartoons operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy kids-video-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3034/health
```
