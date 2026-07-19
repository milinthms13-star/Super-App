# AI Chat Service

AI Chat microservice for MalabarBazaar.

## Features

- AI Chat management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/aichat/*` - Aichat operations
- `/api/ai/*` - Ai operations
- `/api/aiml/*` - Aiml operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy ai-chat-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3033/health
```
