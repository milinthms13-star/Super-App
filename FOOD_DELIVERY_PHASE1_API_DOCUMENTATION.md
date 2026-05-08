# Food Delivery Phase 1 - API Documentation

**Phase:** 1 - Core Authentication & User Setup  
**Status:** Implementation Complete  
**Base URL:** `/api/fooddelivery`

---

## Table of Contents

1. [Authentication APIs](#authentication-apis)
2. [User Profile APIs](#user-profile-apis)
3. [Address Management APIs](#address-management-apis)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)

---

## Authentication APIs

### 1. Send OTP

Send an OTP to a phone number for login/signup.

**Endpoint:**
```
POST /auth/send-otp
```

**Request Body:**
```json
{
  "phoneNumber": "9876543210"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "phoneNumber": "9876543210",
  "expiresIn": 600
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Error message here"
}
```

**Status Codes:**
- `200` - OTP sent successfully
- `400` - Invalid phone number or rate limit exceeded

---

### 2. Verify OTP & Login

Verify OTP and login the user.

**Endpoint:**
```
POST /auth/verify-otp
```

**Request Body:**
```json
{
  "phoneNumber": "9876543210",
  "otp": "123456",
  "userData": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceType": "mobile",
    "osVersion": "14.0",
    "appVersion": "1.0.0"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210",
    "phoneVerified": true,
    "profilePictureUrl": null,
    "defaultAddressId": null,
    "preferences": {
      "language": "en",
      "cuisine": [],
      "notificationPreferences": {
        "email": true,
        "sms": true,
        "push": true,
        "promotions": true
      }
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Status Codes:**
- `200` - Login successful
- `400` - Invalid OTP or verification failed

---

### 3. Email/Password Login

Login with email and password.

**Endpoint:**
```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceType": "web"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": { /* user object */ },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Status Codes:**
- `200` - Login successful
- `401` - Invalid credentials
- `400` - Account locked or other errors

---

### 4. Register

Register a new user with email and password.

**Endpoint:**
```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "userId": "user_id",
  "email": "john@example.com"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

**Status Codes:**
- `201` - Registration successful
- `400` - Invalid data or email already exists

---

### 5. Social Login

Login/Register using social providers (Google, Facebook, Apple).

**Endpoint:**
```
POST /auth/social-login
```

**Request Body:**
```json
{
  "provider": "google",
  "socialData": {
    "id": "google_user_id",
    "email": "john@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "picture": "https://example.com/picture.jpg"
  },
  "deviceInfo": {
    "deviceId": "unique-device-id",
    "deviceType": "mobile"
  }
}
```

**Supported Providers:**
- `google`
- `facebook`
- `apple`

**Response (Success):**
```json
{
  "success": true,
  "message": "Social login successful",
  "user": { /* user object */ },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "isNewUser": true
}
```

**Status Codes:**
- `200` - Login successful
- `400` - Invalid social data

---

### 6. Forgot Password

Request password reset link via email.

**Endpoint:**
```
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If email exists, password reset link will be sent"
}
```

**Note:** Always returns success for security reasons.

**Status Codes:**
- `200` - Request processed

---

### 7. Reset Password

Reset password using token from email link.

**Endpoint:**
```
POST /auth/reset-password
```

**Request Body:**
```json
{
  "token": "jwt_token_from_email",
  "password": "NewSecurePass123!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Status Codes:**
- `200` - Password reset successful
- `400` - Invalid token or password

---

### 8. Change Password

Change password for logged-in user.

**Endpoint:**
```
POST /auth/change-password
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Status Codes:**
- `200` - Password changed
- `400` - Invalid current password
- `401` - Unauthorized

---

### 9. Verify Email

Verify email address using token from email link.

**Endpoint:**
```
POST /auth/verify-email
```

**Request Body:**
```json
{
  "token": "jwt_token_from_email"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": { /* user object */ }
}
```

**Status Codes:**
- `200` - Email verified
- `400` - Invalid or expired token

---

### 10. Logout

Logout the current user and invalidate session.

**Endpoint:**
```
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Status Codes:**
- `200` - Logout successful
- `401` - Unauthorized

---

### 11. Refresh Token

Get a new access token using refresh token.

**Endpoint:**
```
POST /auth/refresh-token
```

**Request Body (Option 1 - Cookie):**
```
HTTP-only cookie: refreshToken
```

**Request Body (Option 2 - Body):**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "token": "new_access_token"
}
```

**Status Codes:**
- `200` - Token refreshed
- `401` - Invalid or expired refresh token

---

## User Profile APIs

### 1. Get Profile

Get current user's profile information.

**Endpoint:**
```
GET /profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "9876543210",
    "phoneVerified": true,
    "emailVerified": true,
    "profilePictureUrl": "https://s3.amazonaws.com/...",
    "gender": "male",
    "dateOfBirth": "1990-01-01",
    "defaultAddressId": "address_id",
    "preferences": {
      "language": "en",
      "cuisine": ["Italian", "Chinese"],
      "dietaryRestrictions": ["vegetarian"],
      "spiceLevel": "medium",
      "notificationPreferences": {
        "email": true,
        "sms": true,
        "push": true,
        "promotions": false
      }
    },
    "referralCode": "REF123ABC",
    "accountStatus": "active",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

**Status Codes:**
- `200` - Profile retrieved
- `401` - Unauthorized
- `400` - User not found

---

### 2. Update Profile

Update user's profile information.

**Endpoint:**
```
PUT /profile
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "gender": "male",
  "dateOfBirth": "1990-01-01"
}
```

**Updatable Fields:**
- `firstName` (string, min 2 chars)
- `lastName` (string, min 2 chars)
- `gender` (enum: male, female, other, prefer_not_to_say)
- `dateOfBirth` (ISO date)
- `email` (email format)
- `phoneNumber` (10 digits)

**Response (Success):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { /* updated user object */ }
}
```

**Status Codes:**
- `200` - Profile updated
- `400` - Invalid data
- `401` - Unauthorized

---

### 3. Upload Profile Picture

Upload a profile picture.

**Endpoint:**
```
POST /profile/picture
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
```
profilePicture: <image_file>
```

**Supported Formats:**
- JPEG
- PNG
- WebP

**Maximum Size:** 5MB

**Response (Success):**
```json
{
  "success": true,
  "message": "Profile picture uploaded",
  "imageUrl": "https://s3.amazonaws.com/..."
}
```

**Status Codes:**
- `200` - Picture uploaded
- `400` - Invalid file
- `401` - Unauthorized

---

### 4. Update Preferences

Update user preferences (language, cuisine, notifications, etc.).

**Endpoint:**
```
PUT /profile/preferences
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "language": "en",
  "cuisine": ["Italian", "Chinese", "Indian"],
  "dietaryRestrictions": ["vegetarian"],
  "spiceLevel": "medium",
  "notificationPreferences": {
    "email": true,
    "sms": true,
    "push": true,
    "promotions": false
  },
  "darkMode": true
}
```

**Valid Values:**
- `language`: en, hi, ta, te, kn, ml
- `cuisine`: Any cuisine string
- `dietaryRestrictions`: vegetarian, vegan, halal, jain, gluten-free, dairy-free
- `spiceLevel`: mild, medium, hot, extra_hot

**Response (Success):**
```json
{
  "success": true,
  "message": "Preferences updated",
  "preferences": { /* updated preferences */ }
}
```

**Status Codes:**
- `200` - Preferences updated
- `400` - Invalid data
- `401` - Unauthorized

---

## Address Management APIs

### 1. Add Address

Add a new delivery address.

**Endpoint:**
```
POST /addresses
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "label": "Home",
  "addressType": "home",
  "streetAddress": "123 Main Street",
  "apt_building": "Apt 101",
  "area": "Downtown",
  "city": "Bangalore",
  "state": "Karnataka",
  "postalCode": "560001",
  "landmark": "Near XYZ Mall",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "instructions": "Ring the doorbell twice",
  "contactName": "John Doe",
  "contactPhone": "9876543210",
  "isDefault": true
}
```

**Required Fields:**
- `label`
- `streetAddress`
- `city`
- `state`
- `postalCode`
- `latitude`
- `longitude`

**Limit:** Maximum 5 addresses per user

**Response (Success):**
```json
{
  "success": true,
  "message": "Address added successfully",
  "address": {
    "_id": "address_id",
    "userId": "user_id",
    "label": "Home",
    "addressType": "home",
    "streetAddress": "123 Main Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560001",
    "fullAddress": "Apt 101, 123 Main Street, Downtown, Bangalore, Karnataka, 560001",
    "location": {
      "type": "Point",
      "coordinates": [77.5946, 12.9716]
    },
    "isDefault": true,
    "isActive": true,
    "isVerified": false,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

**Status Codes:**
- `201` - Address created
- `400` - Invalid data or max limit reached
- `401` - Unauthorized

---

### 2. Get All Addresses

Get all active addresses for the user.

**Endpoint:**
```
GET /addresses
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "addresses": [ /* array of addresses */ ],
  "count": 3
}
```

**Status Codes:**
- `200` - Addresses retrieved
- `401` - Unauthorized

---

### 3. Get Default Address

Get the user's default address.

**Endpoint:**
```
GET /addresses/default
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "address": { /* address object */ }
}
```

**Response (No Default):**
```json
{
  "success": false,
  "message": "No address found",
  "address": null
}
```

**Status Codes:**
- `200` - Address retrieved
- `400` - No address found
- `401` - Unauthorized

---

### 4. Update Address

Update a specific address.

**Endpoint:**
```
PUT /addresses/:addressId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "label": "Work",
  "landmark": "Updated landmark",
  "instructions": "Updated instructions"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Address updated successfully",
  "address": { /* updated address object */ }
}
```

**Status Codes:**
- `200` - Address updated
- `400` - Invalid data
- `401` - Unauthorized
- `404` - Address not found

---

### 5. Delete Address

Delete an address (soft delete).

**Endpoint:**
```
DELETE /addresses/:addressId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

**Status Codes:**
- `200` - Address deleted
- `401` - Unauthorized
- `404` - Address not found

---

### 6. Set Default Address

Set an address as the default delivery address.

**Endpoint:**
```
PUT /addresses/:addressId/default
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Default address set successfully",
  "address": { /* address object with isDefault: true */ }
}
```

**Status Codes:**
- `200` - Default address set
- `401` - Unauthorized
- `404` - Address not found

---

### 7. Verify Address

Manually mark an address as verified.

**Endpoint:**
```
POST /addresses/:addressId/verify
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Address verified",
  "address": { /* address object with isVerified: true */ }
}
```

**Status Codes:**
- `200` - Address verified
- `401` - Unauthorized
- `404` - Address not found

---

### 8. Record Address Usage

Record that an address was used for an order (for analytics).

**Endpoint:**
```
POST /addresses/:addressId/usage
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (Success):**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Usage recorded
- `401` - Unauthorized
- `404` - Address not found

---

## Error Handling

### Common Error Responses

**Invalid Request (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**Unauthorized (401):**
```json
{
  "success": false,
  "message": "Unauthorized. Please login."
}
```

**Forbidden (403):**
```json
{
  "success": false,
  "message": "You don't have permission to perform this action"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Rate Limiting

All endpoints are rate limited:

- **Authentication endpoints:** 5 requests per minute per IP
- **Profile endpoints:** 30 requests per minute per user
- **Address endpoints:** 20 requests per minute per user
- **OTP endpoints:** 3 requests per hour per phone number

**Rate Limit Headers:**
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1640000000
```

When rate limit exceeded:
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

Status Code: `429`

---

## Authentication

Most endpoints require authentication via JWT bearer token:

```
Authorization: Bearer <access_token>
```

Access tokens are valid for **30 days**.

Refresh tokens are returned in HTTP-only cookies and are valid for **90 days**.

---

## Testing the APIs

### Using cURL

```bash
# Send OTP
curl -X POST http://localhost:5000/api/fooddelivery/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "9876543210"}'

# Login with OTP
curl -X POST http://localhost:5000/api/fooddelivery/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "otp": "123456",
    "userData": {
      "firstName": "John"
    }
  }'

# Get Profile (with token)
curl -X GET http://localhost:5000/api/fooddelivery/profile \
  -H "Authorization: Bearer <access_token>"
```

### Using Postman

1. Import the provided Postman collection
2. Set environment variables:
   - `baseUrl`: http://localhost:5000
   - `access_token`: Your JWT token
3. Run requests from the collection

---

## Integration Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection established
- [ ] Twilio SMS configured
- [ ] Email SMTP configured
- [ ] AWS S3 bucket configured
- [ ] Google OAuth credentials added
- [ ] Facebook OAuth credentials added
- [ ] Apple Sign In configured
- [ ] JWT secrets generated
- [ ] Database indexes created
- [ ] Tests passing
- [ ] API documentation reviewed
- [ ] Rate limiting tested
- [ ] Error handling verified
- [ ] Security headers configured

---

## Next Phase

Phase 2 will include:
- Restaurant Discovery
- Menu Management
- Search & Filters
- Restaurant Ratings & Reviews

---

**Last Updated:** May 8, 2026  
**Version:** 1.0  
**Author:** Food Delivery Team
