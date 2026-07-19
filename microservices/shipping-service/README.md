# Shipping Service

Shipping microservice for MalabarBazaar.

## Features

- Shipping management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/shipping/*` - Shipping operations
- `/api/tracking/*` - Tracking operations
- `/api/delivery/*` - Delivery operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy shipping-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3009/health
```
