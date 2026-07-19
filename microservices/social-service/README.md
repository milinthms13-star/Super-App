# Social Service

Social microservice for MalabarBazaar.

## Features

- Social management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/social/*` - Social operations
- `/api/feed/*` - Feed operations
- `/api/posts/*` - Posts operations
- `/api/comments/*` - Comments operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy social-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3030/health
```
