# Travel Service

Travel microservice for MalabarBazaar.

## Features

- Travel management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/travel/*` - Travel operations
- `/api/flights/*` - Flights operations
- `/api/bus/*` - Bus operations
- `/api/train/*` - Train operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy travel-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3019/health
```
