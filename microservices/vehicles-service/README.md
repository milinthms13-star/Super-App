# Vehicles Service

Vehicles microservice for MalabarBazaar.

## Features

- Vehicles management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/vehicles/*` - Vehicles operations
- `/api/automotive/*` - Automotive operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy vehicles-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3015/health
```
