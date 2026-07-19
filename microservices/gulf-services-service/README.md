# Gulf Services Service

Gulf Services microservice for MalabarBazaar.

## Features

- Gulf Services management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/gulfservices/*` - Gulfservices operations
- `/api/recruitment/*` - Recruitment operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy gulf-services-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3022/health
```
