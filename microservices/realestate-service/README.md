# Real Estate Service

Real Estate microservice for MalabarBazaar.

## Features

- Real Estate management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/realestate/*` - Realestate operations
- `/api/properties/*` - Properties operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy realestate-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3012/health
```
