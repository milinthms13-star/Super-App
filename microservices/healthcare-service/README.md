# Healthcare Service

Healthcare microservice for MalabarBazaar.

## Features

- Healthcare management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/healthcare/*` - Healthcare operations
- `/api/appointments/*` - Appointments operations
- `/api/doctors/*` - Doctors operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy healthcare-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3025/health
```
