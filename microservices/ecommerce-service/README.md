# E-commerce Service

E-commerce microservice for MalabarBazaar.

## Features

- E-commerce management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/products/*` - Products operations
- `/api/cart/*` - Cart operations
- `/api/orders/*` - Orders operations
- `/api/reviews/*` - Reviews operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy ecommerce-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3006/health
```
