# Food Delivery Service

Food Delivery microservice for MalabarBazaar.

## Features

- Food Delivery management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/food-delivery/*` - Food-delivery operations
- `/api/restaurants/*` - Restaurants operations
- `/api/menus/*` - Menus operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy food-delivery-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3016/health
```
