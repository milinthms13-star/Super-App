# Inventory Service

Inventory microservice for MalabarBazaar.

## Features

- Inventory management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/inventory/*` - Inventory operations
- `/api/stock/*` - Stock operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy inventory-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3008/health
```
