# Recommendations Service

Recommendations microservice for MalabarBazaar.

## Features

- Recommendations management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/recommendations/*` - Recommendations operations
- `/api/suggestions/*` - Suggestions operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy recommendation-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3010/health
```
