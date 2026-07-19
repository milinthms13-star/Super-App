# Polls & Surveys Service

Polls & Surveys microservice for MalabarBazaar.

## Features

- Polls & Surveys management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/polls/*` - Polls operations
- `/api/surveys/*` - Surveys operations
- `/api/votes/*` - Votes operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy poll-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3032/health
```
