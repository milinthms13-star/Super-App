# Beauty AI Service

Beauty AI microservice for MalabarBazaar.

## Features

- Beauty AI management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/beautyai/*` - Beautyai operations
- `/api/skincare/*` - Skincare operations
- `/api/tips/*` - Tips operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy beauty-ai-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3028/health
```
