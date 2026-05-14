# NilaStay Hotel Booking - Backend API Implementation Guide

## Overview
This guide provides complete API specifications for the NilaStay hotel booking system Phase 1 (MVV). Implement these endpoints in your Node.js/Express backend.

---

## Database Models

### 1. User Model
```javascript
{
  _id: ObjectId,
  email: String (unique),
  phone: String,
  name: String,
  avatar: String (image URL),
  role: String (admin | partner | customer), // default: customer
  registrationType: String, // for compatibility
  
  // Partner-specific fields
  partnerInfo: {
    businessName: String,
    bankAccount: String,
    bankIFSC: String,
    KYCStatus: String (pending | approved | rejected),
    commissionRate: Number (default: 10),
  },
  
  // Customer preferences
  savedHotels: [ObjectId], // Hotel IDs
  bookingHistory: [ObjectId], // Booking IDs
  
  createdAt: Date,
  updatedAt: Date,
}
```

### 2. Hotel Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  location: String (required),
  type: String (Hotel|Homestay|Resort|Lodge|Villa|Heritage Property|Eco Lodge|Beach Resort|Hill Station Stay|Houseboat),
  description: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  coordinates: { latitude: Number, longitude: Number },
  
  // Ratings & Reviews
  rating: Number (1-5),
  reviews: Number (count),
  reviewDetails: [{
    userId: ObjectId,
    rating: Number,
    comment: String,
    createdAt: Date
  }],
  
  // Media
  images: [String], // Array of image URLs
  amenities: [String],
  
  // Contact
  contact: {
    phone: String (required, with country code e.g. +91...),
    whatsapp: String,
    email: String,
    website: String,
  },
  
  // Verification & Status
  ownerId: ObjectId (reference to Partner User),
  verified: Boolean (default: false),
    verificationDate: Date,
  verificationNotes: String,
  status: String (active|inactive|suspended),
  
  // Partnership
  isFeatured: Boolean (default: false),
  featuredUntil: Date,
  commissionRate: Number (% per booking),
  
  createdAt: Date,
  updatedAt: Date,
}
```

### 3. Room Model
```javascript
{
  _id: ObjectId,
  hotelId: ObjectId (required, reference to Hotel),
  type: String (required, e.g. Deluxe Room, Suite),
  description: String,
  capacity: Number (how many guests),
  bedType: String (Single|Double|Twin|King|Queen),
  
  // Pricing
  basePrice: Number (price per night),
  price: Number (current price, can be modified for seasonal pricing),
  seasonalPricing: [{
    startDate: Date,
    endDate: Date,
    price: Number,
  }],
  
  // Inventory
  totalInventory: Number (total rooms of this type),
  availableInventory: Number, // managed via bookings
  
  // Amenities & Features
  amenities: [String],
  images: [String],
  features: [String],
  maxOccupancy: Number,
  cancellationPolicy: String,
  
  // Availability Status
  isActive: Boolean (default: true),
  
  createdAt: Date,
  updatedAt: Date,
}
```

### 4. Booking Model
```javascript
{
  _id: ObjectId,
  
  // References
  hotelId: ObjectId (required),
  roomId: ObjectId (required),
  userId: ObjectId (required),
  
  // Guest Information
  guestName: String (required),
  guestEmail: String (required),
  guestPhone: String (required),
  numberOfGuests: Number,
  specialRequests: String,
  
  // Booking Details
  checkInDate: Date (required),
  checkOutDate: Date (required),
  numberOfNights: Number,
  roomType: String,
  
  // Pricing
  pricePerNight: Number,
  totalPrice: Number (before taxes),
  gst: Number (5% of total),
  finalTotal: Number (total + gst),
  commissionAmount: Number (calculated from hotel's commission rate),
  partnerPayout: Number (finalTotal - commissionAmount),
  
  // Status & Tracking
  status: String (pending|confirmed|cancelled|completed),
  paymentStatus: String (unpaid|paid|refunded),
  paymentMethod: String (online|wallet|cash_on_arrival),
  
  // Cancellation
  cancellationReason: String,
  cancellationDate: Date,
  refundAmount: Number,
  
  // Confirmation & Communication
  confirmationCode: String (unique),
  emailSent: Boolean,
  whatsappSent: Boolean,
  
  createdAt: Date,
  updatedAt: Date,
  checkedInAt: Date,
  checkedOutAt: Date,
}
```

### 5. Partner Payout Model
```javascript
{
  _id: ObjectId,
  partnerId: ObjectId (reference to Partner User),
  
  // Payout Details
  payoutPeriod: { startDate: Date, endDate: Date },
  totalBookings: Number,
  totalAmount: Number,
  totalCommission: Number,
  netPayout: Number,
  
  // Payment Info
  bankAccount: String,
  bankIFSC: String,
  status: String (pending|processing|completed|failed),
  transactionId: String,
  processedDate: Date,
  
  bookingReferences: [ObjectId], // Booking IDs included in this payout
  
  createdAt: Date,
  updatedAt: Date,
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Create new user account
```
Request:
{
  email: String (required),
  phone: String (required),
  name: String (required),
  password: String (required),
  role: String (customer|partner), // default: customer
}

Response:
{
  success: Boolean,
  message: String,
  token: String (JWT),
  user: { _id, email, name, role, ...}
}
```

#### POST /api/auth/login
Login user
```
Request:
{
  email: String (required),
  password: String (required),
}

Response:
{
  success: Boolean,
  token: String (JWT),
  user: { _id, email, name, role, ...}
}
```

#### GET /api/auth/me
Get current user (requires JWT token)
```
Headers: Authorization: Bearer {token}

Response:
{
  success: Boolean,
  user: { _id, email, name, role, avatar, ...}
}
```

---

### Hotel Endpoints

#### GET /api/hotels/search
Search hotels with filters
```
Query Parameters:
- location: String (optional)
- propertyType: String[] (optional, comma-separated)
- minPrice: Number (optional)
- maxPrice: Number (optional)
- amenities: String[] (optional, comma-separated)
- checkInDate: Date (optional, format: YYYY-MM-DD)
- checkOutDate: Date (optional, format: YYYY-MM-DD)
- guests: Number (optional)
- sortBy: String (rating|price-low|price-high)
- page: Number (default: 1)
- limit: Number (default: 20)

Response:
{
  success: Boolean,
  total: Number,
  page: Number,
  pages: Number,
  data: [
    {
      _id, name, location, type, description, rating, reviews,
      price, images, amenities, verified, contact, rooms: [...]
    }
  ]
}
```

#### GET /api/hotels/:id
Get hotel details with rooms and availability
```
Query Parameters:
- checkInDate: Date (optional)
- checkOutDate: Date (optional)

Response:
{
  success: Boolean,
  data: {
    _id, name, location, type, description, address, city, state,
    rating, reviews, reviewDetails, images, amenities, verified,
    contact, rating, ownerId,
    rooms: [
      {
        _id, hotelId, type, capacity, bedType, price, seasonalPricing,
        amenities, images, cancellationPolicy, available: Boolean,
        availableCount: Number
      }
    ]
  }
}
```

#### GET /api/hotels/:id/availability
Check room availability for date range
```
Query Parameters:
- checkInDate: Date (required)
- checkOutDate: Date (required)

Response:
{
  success: Boolean,
  checkInDate: Date,
  checkOutDate: Date,
  nights: Number,
  rooms: [
    {
      _id, type, price, capacity, available: Boolean,
      availableCount: Number
    }
  ]
}
```

#### POST /api/hotels
Create new hotel (Partner only)
```
Headers: Authorization: Bearer {token}

Request:
{
  name: String,
  location: String,
  type: String,
  description: String,
  address: String,
  contact: { phone, whatsapp, email, website },
  amenities: [String],
  images: [String],
}

Response:
{
  success: Boolean,
  message: String,
  data: { _id, name, ... }
}
```

#### PUT /api/hotels/:id
Update hotel (Partner/Admin only)
```
Headers: Authorization: Bearer {token}

Request:
{
  name: String, // optional
  description: String, // optional
  // ... other fields to update
}

Response:
{
  success: Boolean,
  data: { updated hotel object }
}
```

---

### Room Endpoints

#### GET /api/hotels/:hotelId/rooms
Get all rooms for a hotel
```
Response:
{
  success: Boolean,
  data: [
    {
      _id, hotelId, type, capacity, bedType, price, amenities,
      images, cancellationPolicy, available: Boolean
    }
  ]
}
```

#### POST /api/hotels/:hotelId/rooms
Create room (Partner/Admin only)
```
Headers: Authorization: Bearer {token}

Request:
{
  type: String (required),
  capacity: Number,
  bedType: String,
  basePrice: Number (required),
  totalInventory: Number,
  amenities: [String],
  images: [String],
  cancellationPolicy: String,
}

Response:
{
  success: Boolean,
  data: { _id, hotelId, type, price, ... }
}
```

#### PUT /api/hotels/:hotelId/rooms/:roomId
Update room (Partner/Admin only)
```
Headers: Authorization: Bearer {token}

Request:
{
  type: String, // optional
  price: Number, // optional
  // ... other fields to update
}

Response:
{
  success: Boolean,
  data: { updated room object }
}
```

---

### Booking Endpoints

#### POST /api/bookings
Create booking
```
Headers: Authorization: Bearer {token}

Request:
{
  hotelId: ObjectId (required),
  roomId: ObjectId (required),
  checkInDate: Date (required),
  checkOutDate: Date (required),
  guestName: String (required),
  guestEmail: String (required),
  guestPhone: String (required),
  numberOfGuests: Number,
  roomType: String,
  pricePerNight: Number,
  totalPrice: Number,
  gst: Number,
  finalTotal: Number,
  specialRequests: String,
  paymentMethod: String (online|wallet|cash_on_arrival),
}

Response:
{
  success: Boolean,
  message: String,
  data: {
    _id, hotelId, roomId, confirmationCode, status,
    checkInDate, checkOutDate, guestName, finalTotal, ...
  }
}
```

#### GET /api/bookings/user/:userId
Get user's bookings
```
Headers: Authorization: Bearer {token}

Query Parameters:
- status: String (optional, filter by status)
- sortBy: String (default: -createdAt)
- page: Number
- limit: Number

Response:
{
  success: Boolean,
  total: Number,
  data: [
    {
      _id, hotelId, roomType, checkInDate, checkOutDate,
      guestName, finalTotal, status, confirmationCode, ...
    }
  ]
}
```

#### GET /api/bookings/:bookingId
Get booking details
```
Response:
{
  success: Boolean,
  data: {
    _id, hotelId, roomId, checkInDate, checkOutDate,
    guestName, guestEmail, guestPhone, finalTotal,
    status, confirmationCode, specialRequests, ...
  }
}
```

#### POST /api/bookings/:bookingId/cancel
Cancel booking
```
Headers: Authorization: Bearer {token}

Request:
{
  cancellationReason: String (optional),
}

Response:
{
  success: Boolean,
  message: String,
  data: {
    _id, status: "cancelled", refundAmount,
    cancellationDate, ...
  }
}
```

#### PUT /api/bookings/:bookingId/confirm
Confirm booking (Admin/Partner)
```
Headers: Authorization: Bearer {token}

Response:
{
  success: Boolean,
  data: { _id, status: "confirmed", ... }
}
```

---

### Partner/Admin Endpoints

#### GET /api/admin/hotel-stats
Get admin dashboard stats (Admin only)
```
Headers: Authorization: Bearer {token}

Response:
{
  success: Boolean,
  data: {
    totalHotels: Number,
    activeBookings: Number,
    monthlyRevenue: Number,
    commissionEarned: Number,
    pendingApprovals: Number,
    topHotels: [{ name, bookings, revenue }],
  }
}
```

#### GET /api/admin/hotels
Get all hotels for verification (Admin only)
```
Query Parameters:
- status: String (pending|approved|rejected)
- page: Number
- limit: Number

Response:
{
  success: Boolean,
  data: [
    {
      _id, name, location, ownerId, verified, verificationDate,
      status, bookingCount, rating, ...
    }
  ]
}
```

#### POST /api/admin/hotels/:hotelId/verify
Verify hotel (Admin only)
```
Headers: Authorization: Bearer {token}

Request:
{
  approved: Boolean,
  notes: String (optional),
}

Response:
{
  success: Boolean,
  data: { _id, verified: true, verificationDate, ... }
}
```

#### GET /api/admin/payouts
Get all partner payouts (Admin only)
```
Response:
{
  success: Boolean,
  data: [
    {
      _id, partnerId, payoutPeriod, totalAmount, status,
      processedDate, ...
    }
  ]
}
```

#### POST /api/admin/payouts/process
Process payouts for a period (Admin only)
```
Headers: Authorization: Bearer {token}

Request:
{
  startDate: Date,
  endDate: Date,
}

Response:
{
  success: Boolean,
  message: String,
  data: {
    totalPayouts: Number,
    totalAmount: Number,
    payouts: [{ partnerId, amount, status }]
  }
}
```

---

## Implementation Priorities

### Phase 1 (MVV) - Required for go-live:
- [x] User authentication (register/login/JWT)
- [x] Hotel search & filtering
- [x] Room availability checking
- [x] Booking creation
- [x] My Bookings retrieval
- [x] Booking cancellation
- [x] Role-based access control

### Phase 2 - Business Features:
- [ ] Admin hotel verification workflow
- [ ] Partner payout processing
- [ ] Commission calculations
- [ ] Featured hotel management
- [ ] Hotel analytics

### Phase 3 - Advanced:
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Ratings & reviews system
- [ ] Wishlist management
- [ ] Coupon codes

---

## Data Validation Rules

### Booking Validation
- Check-out date must be after check-in date
- Check-in date cannot be in the past
- Booking creation within 30 days of check-in only
- Guest name: 2-50 characters
- Guest email: valid email format
- Guest phone: 10 digits (for India)
- Room must have available inventory
- Total guests must match room capacity

### Hotel Validation
- Hotel name: 2-100 characters
- Location must be from predefined Kerala locations
- Contact phone must be valid
- At least one image required
- Rating: 1-5 stars

### Room Validation
- Room type: 3-50 characters
- Capacity: 1-20 guests
- Price: > 0
- Total inventory: > 0

---

## Error Response Format
```javascript
{
  success: false,
  error: {
    code: String (VALIDATION_ERROR|NOT_FOUND|UNAUTHORIZED|FORBIDDEN|SERVER_ERROR),
    message: String,
    details: Array (optional, for validation errors)
  }
}
```

Example:
```javascript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid booking data",
    details: [
      { field: "guestEmail", message: "Invalid email format" },
      { field: "checkOutDate", message: "Must be after check-in date" }
    ]
  }
}
```

---

## JWT Token Claims
```javascript
{
  sub: userId, // subject (user ID)
  email: String,
  name: String,
  role: String (admin|partner|customer),
  iat: Number (issued at),
  exp: Number (expiration),
  iss: String ("nila-stay"), // issuer
}
```

---

## API Security Checklist
- [ ] All endpoints validate JWT tokens
- [ ] Role-based authorization on sensitive endpoints
- [ ] Input validation & sanitization
- [ ] Rate limiting (prevent brute force)
- [ ] CORS properly configured
- [ ] HTTPS enforced in production
- [ ] API keys for third-party integrations
- [ ] Error messages don't expose sensitive info
- [ ] Database queries use parameterized statements
- [ ] Passwords hashed with bcrypt (10 rounds)

---

## Testing Checklist

### Unit Tests
- [ ] User authentication
- [ ] Hotel search filters
- [ ] Availability calculations
- [ ] Booking validations
- [ ] Commission calculations

### Integration Tests
- [ ] Complete booking flow (search → book → confirm)
- [ ] User my bookings flow
- [ ] Admin verification workflow
- [ ] Partner payout processing

### End-to-End Tests
- [ ] Customer booking journey
- [ ] Partner management
- [ ] Admin operations

---

## Deployment Notes

1. **Database**: Ensure indexes on frequently queried fields:
   - `hotels.location`
   - `bookings.userId`
   - `bookings.hotelId`
   - `bookings.checkInDate, checkOutDate`
   - `rooms.hotelId`

2. **Environment Variables**:
   ```
   MONGODB_URI=...
   JWT_SECRET=...
   ADMIN_EMAIL=...
   PARTNER_COMMISSION_RATE=10
   ```

3. **Seed Data**: Load initial hotels/rooms into production database

4. **Monitoring**: Log all bookings and payments

---

## Support & Questions
Refer to this guide when implementing backend endpoints. Ensure frontend API calls match these specifications exactly.
