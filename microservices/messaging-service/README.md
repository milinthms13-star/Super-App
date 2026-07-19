# Messaging Service

Messaging microservice for MalabarBazaar.

## Features

- Messaging management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/messaging/*` - Messaging operations
- `/api/chat/*` - Chat operations
- `/api/conversations/*` - Conversations operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy messaging-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3029/health
```
