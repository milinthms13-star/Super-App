# Analytics Service

Analytics microservice for MalabarBazaar.

## Features

- Analytics management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/analytics/*` - Analytics operations
- `/api/reports/*` - Reports operations
- `/api/dashboards/*` - Dashboards operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy analytics-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3035/health
```
