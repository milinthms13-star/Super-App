# Freelancer Marketplace Service

Freelancer Marketplace microservice for MalabarBazaar.

## Features

- Freelancer Marketplace management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/freelancer/*` - Freelancer operations
- `/api/gigs/*` - Gigs operations
- `/api/projects/*` - Projects operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy freelancer-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3021/health
```
