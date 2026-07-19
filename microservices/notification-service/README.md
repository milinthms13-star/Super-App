# Notifications Service

Notifications microservice for MalabarBazaar.

## Features

- Notifications management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/notifications/*` - Notifications operations
- `/api/email/*` - Email operations
- `/api/sms/*` - Sms operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy notification-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3003/health
```
