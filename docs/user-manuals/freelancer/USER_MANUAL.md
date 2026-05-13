# Freelancer Marketplace User Manual (Production-Ready)

> Module: `src/modules/freelancer/FreelancerMarketplace.js`  
> API: `backend/routes/freelancer.js`  
> Product name: **NilaWorks**

## 1) What changed
Freelancer module is now backend-integrated and workflow-driven:
- Providers are loaded from database.
- Jobs, bids, bookings, reviews, disputes and reports are persistent.
- Booking lifecycle supports assignment, payment escrow, OTP work-start verification, cancellation, refund request.
- AI quote now uses category/scope/budget/urgency/location/skill-level logic.
- Provider onboarding, subscription plans, lead purchase and commission settings are connected.

## 2) Main tabs
- Hire Professionals
- Post Job
- My Bookings
- Emergency
- Provider Plans

On mobile, bottom tab navigation is shown for quick switching.

## 3) Hire Professionals
Use search + filter drawer:
- category
- district
- rating
- experience
- language
- budget tier
- availability
- service type
- response speed
- verified only
- sorting (rating/price/response)

Card actions:
- View Profile
- Book Now
- Compare (up to 3)
- Save
- Call (masked contact workflow)
- Chat
- Reviews
- Portfolio
- Service Area

UI states:
- loading skeleton cards
- no results message
- error message

## 4) Post Job
### Create job post
Required validation:
- title
- category
- location
- detailed requirements
- service type
- urgency
- min budget + max budget
- future deadline
- contact name
- 10 digit contact phone

Optional:
- file attachments (docs/images/video)

Contact is masked in marketplace records.

### Bidding
Providers can submit bids with:
- amount
- timeline
- cover letter

### Lead purchase
Lead purchase workflow is available from job cards for business monetization.

## 5) My Bookings
### Booking creation
Create booking with:
- provider
- customer name + phone
- service mode (gig/hourly)
- booking mode (instant/schedule/quotation/bidding)
- schedule
- work notes
- emergency flag
- amount

### Booking tracking
Load bookings by 10-digit phone.
View:
- booking code
- provider
- booking status
- payment status
- masked customer phone

### OTP before work starts
- send OTP for booking
- verify OTP to move booking to work-in-progress

### Escrow + milestones
- initialize escrow total
- create milestones (`Title|Amount`)
- release milestones

### Cancellation and refunds
- cancellation request with role and reason
- refund request with reason

### Dispute panel
- create dispute by booking code
- upload proof files
- view dispute list by status

## 6) Emergency & Safety
- emergency service list
- provider/customer/job/booking reporting
- report goes to admin review flow

## 7) Provider Plans
### Provider onboarding / KYC
Submit provider onboarding with:
- profile details
- category, location, pricing
- contact details
- KYC files

### Plan purchase
Purchase plan per provider:
- Basic
- Pro
- Premium

### Commission settings
Admin-configurable:
- commission type/value
- sponsored listing fee
- lead purchase fee
- cancellation penalty percent
- refund window hours

### Admin metrics snapshot
Shows counts for:
- providers
- jobs
- bookings
- open disputes
- open reports
- active plan purchases

## 8) Compliance & trust
- masked phone support in workflows
- OTP-based work-start gate
- dispute + proof upload
- cancellation policy hooks
- refund request state tracking
- admin report/dispute visibility

