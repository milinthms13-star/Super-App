# Astrology Service

Astrology microservice for MalabarBazaar.

## Features

- Astrology management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/astrology/*` - Astrology operations
- `/api/horoscope/*` - Horoscope operations
- `/api/predictions/*` - Predictions operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy astrology-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3027/health
```
