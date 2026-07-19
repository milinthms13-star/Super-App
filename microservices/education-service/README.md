# Education Service

Education microservice for MalabarBazaar.

## Features

- Education management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/education/*` - Education operations
- `/api/courses/*` - Courses operations
- `/api/learning/*` - Learning operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy education-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3026/health
```
