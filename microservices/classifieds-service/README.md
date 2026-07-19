# Classifieds Service

Classifieds microservice for MalabarBazaar.

## Features

- Classifieds management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/classifieds/*` - Classifieds operations
- `/api/listings/*` - Listings operations
- `/api/ads/*` - Ads operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy classifieds-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3011/health
```
