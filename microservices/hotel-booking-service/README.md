# Hotel Booking Service

Hotel Booking microservice for MalabarBazaar.

## Features

- Hotel Booking management
- RESTful API
- JWT authentication
- Rate limiting
- Shared MongoDB database

## API Endpoints

- `/api/hotels/*` - Hotels operations
- `/api/rooms/*` - Rooms operations
- `/api/bookings/*` - Bookings operations

## Setup

```bash
npm install
cp .env.example .env
# Configure .env
npm run dev
```

## Deploy

```bash
gcloud run deploy hotel-booking-service \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated
```

## Health Check

```bash
curl http://localhost:3017/health
```
