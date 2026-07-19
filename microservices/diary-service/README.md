# Personal Diary Service

Personal Diary microservice for MalabarBazaar.

## Features

- Personal Diary management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/diary/*` - Diary operations
- `/api/journals/*` - Journals operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy diary-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3031/health
```
