# Matrimonial Service

Matrimonial microservice for MalabarBazaar.

## Features

- Matrimonial management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/matrimonial/*` - Matrimonial operations
- `/api/profiles/*` - Profiles operations
- `/api/matches/*` - Matches operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy matrimonial-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3013/health
```
