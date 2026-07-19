# Finance Service

Finance microservice for MalabarBazaar.

## Features

- Finance management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/finance/*` - Finance operations
- `/api/loans/*` - Loans operations
- `/api/credit/*` - Credit operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy finance-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3023/health
```
