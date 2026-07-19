# Business Builder Service

Business Builder microservice for MalabarBazaar.

## Features

- Business Builder management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/business/*` - Business operations
- `/api/miniapps/*` - Miniapps operations
- `/api/templates/*` - Templates operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy business-builder-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3020/health
```
