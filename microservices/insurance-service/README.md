# Insurance Service

Insurance microservice for MalabarBazaar.

## Features

- Insurance management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/insurance/*` - Insurance operations
- `/api/policies/*` - Policies operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy insurance-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3024/health
```
