# Tourism Service

Tourism microservice for MalabarBazaar.

## Features

- Tourism management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/tourism/*` - Tourism operations
- `/api/packages/*` - Packages operations
- `/api/tours/*` - Tours operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy tourism-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3018/health
```
