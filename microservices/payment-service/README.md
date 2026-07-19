# Payments Service

Payments microservice for MalabarBazaar.

## Features

- Payments management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/payments/*` - Payments operations
- `/api/invoices/*` - Invoices operations
- `/api/transactions/*` - Transactions operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy payment-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3004/health
```
