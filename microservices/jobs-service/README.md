# Jobs & Careers Service

Jobs & Careers microservice for MalabarBazaar.

## Features

- Jobs & Careers management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/jobs/*` - Jobs operations
- `/api/applications/*` - Applications operations
- `/api/resumes/*` - Resumes operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy jobs-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3014/health
```
