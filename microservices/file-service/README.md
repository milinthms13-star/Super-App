# File Management Service

File Management microservice for MalabarBazaar.

## Features

- File Management management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/files/*` - Files operations
- `/api/uploads/*` - Uploads operations
- `/api/media/*` - Media operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy file-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3005/health
```
