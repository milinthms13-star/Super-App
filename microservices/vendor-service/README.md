# Vendor Management Service

Vendor Management microservice for MalabarBazaar.

## Features

- Vendor Management management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/vendors/*` - Vendors operations
- `/api/seller/*` - Seller operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy vendor-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3007/health
```
