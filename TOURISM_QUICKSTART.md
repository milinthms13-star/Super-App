# Tourism Module - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Environment Setup (2 minutes)

#### Backend `.env`:
```bash
# Add these to your existing backend/.env file

# Razorpay (Get from https://dashboard.razorpay.com)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Frontend `.env`:
```bash
# Add to your existing frontend/.env file

REACT_APP_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
```

**Get Razorpay Test Keys:**
1. Sign up at https://dashboard.razorpay.com
2. Go to Settings → API Keys → Generate Test Key
3. Copy Key ID and Key Secret
4. For webhook secret: Settings → Webhooks → Create webhook secret

### Step 2: Verify Installation (1 minute)

Check if required packages are installed:

```bash
# Backend
cd backend
npm list mongoose razorpay pdfkit multer

# If any missing, install:
npm install mongoose razorpay pdfkit multer
```

### Step 3: Start Services (1 minute)

```bash
# Terminal 1: Start Backend
cd backend
npm start
# Should show: "Server running on port 5000"
# Should show: "Connected to MongoDB"

# Terminal 2: Start Frontend
cd frontend
npm start
# Opens http://localhost:3000
```

### Step 4: Test the Module (1 minute)

1. **Browse Packages**
   - Go to http://localhost:3000
   - Navigate to Tourism section
   - See packages load from MongoDB

2. **Create Test Booking**
   - Click any package → "Book Now"
   - Fill booking form
   - Click "Submit Booking"
   - Payment modal appears

3. **Test Payment**
   - Use test card: `4111 1111 1111 1111`
   - CVV: Any 3 digits
   - Expiry: Any future date
   - Click "Pay"
   - See success message

4. **Check Booking History**
   - Navigate to "Booking History" tab
   - See your booking with status
   - Try balance payment (if advance was selected)

## 🎯 What Just Happened?

✅ Backend connected to MongoDB  
✅ Razorpay payment gateway integrated  
✅ Booking created in database  
✅ Payment processed securely  
✅ Email notification sent (if configured)  
✅ Invoice generated  
✅ Booking visible in history  

## 📧 Optional: Email Configuration

To receive email notifications:

```bash
# Add to backend/.env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# Get app password:
# 1. Go to Google Account settings
# 2. Security → 2-Step Verification → App passwords
# 3. Generate new password for "Mail"
```

## 📱 Optional: SMS Configuration

To receive SMS notifications:

```bash
# Add to backend/.env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Get Twilio credentials:
# 1. Sign up at https://www.twilio.com
# 2. Get free trial credentials
# 3. Verify your phone number
```

## 🎨 Access Different Roles

### As Customer:
- Browse and book packages
- Make payments
- View bookings
- Submit reviews

### As Vendor:
Login as vendor user (create via registration) to access:
- Create/edit packages
- Upload images
- Manage leads
- View bookings

### As Admin:
Login as admin user to access:
- Approve vendors
- Approve packages
- Manage bookings
- Handle complaints
- Process refunds

## 🧪 Test Card Numbers

| Card Number | Result |
|------------|--------|
| 4111 1111 1111 1111 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0027 6000 3184 | 3D Secure |

All cards: CVV = Any 3 digits, Expiry = Any future date

## 📊 Verify Everything Works

### Check Database:
```bash
# Connect to MongoDB
mongosh

# Use your database
use nilahub

# Check collections
db.tourismpackages.countDocuments()
db.tourismbookings.countDocuments()
db.tourismpayments.countDocuments()
```

### Check API:
```bash
# Get packages
curl http://localhost:5000/api/tourism/packages

# Get bootstrap data
curl http://localhost:5000/api/tourism/bootstrap
```

### Check Logs:
```bash
# Backend logs
tail -f backend/logs/combined.log

# Look for:
# - "Payment order created"
# - "Payment captured successfully"
# - "Booking confirmation email sent"
# - "Invoice generated"
```

## 🐛 Troubleshooting

### "Payment gateway not initialized"
→ Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env

### "Failed to load Razorpay SDK"
→ Check internet connection (Razorpay script loads from CDN)
→ Check REACT_APP_RAZORPAY_KEY_ID in frontend/.env

### "Email not configured"
→ Optional: Add EMAIL_SERVICE, EMAIL_USER, EMAIL_PASS to .env
→ Module works without email, just won't send notifications

### "Cannot connect to MongoDB"
→ Check MONGO_URI in backend/.env
→ Ensure MongoDB is running: `mongosh`

### Booking created but payment failed
→ Check Razorpay dashboard for payment details
→ Check backend logs for errors
→ Can retry payment from booking history

## 🎉 Next Steps

1. **Configure Email/SMS** for full notification experience
2. **Create Vendor Account** to test vendor features
3. **Upload Real Images** to packages
4. **Test Admin Features** with admin account
5. **Add More Packages** to build catalog
6. **Test Mobile UI** on different devices

## 📚 Full Documentation

- Complete API docs: `backend/routes/TOURISM_README.md`
- Implementation details: `TOURISM_IMPLEMENTATION_SUMMARY.md`
- Database models: `backend/models/Tourism*.js`

## ✅ Quick Checklist

- [ ] Environment variables set
- [ ] Backend started successfully
- [ ] Frontend started successfully
- [ ] Can see packages on UI
- [ ] Can create booking
- [ ] Payment modal appears
- [ ] Payment successful
- [ ] Booking in history
- [ ] Can make balance payment

**All checked?** Congratulations! 🎉 Tourism module is working!

## 🆘 Need Help?

1. Check logs: `backend/logs/combined.log`
2. Check browser console for frontend errors
3. Check Razorpay dashboard for payment status
4. Read full documentation in README files
5. Check MongoDB collections for data

## 💡 Pro Tips

- Use incognito mode to test without cache
- Keep browser console open to see errors
- Monitor backend logs in real-time
- Test with different browsers
- Try both advance and full payment types
- Test coupon codes functionality
- Upload review images to test image uploads

---

**Ready for Production?**

1. Get live Razorpay keys (remove `_test` from key ID)
2. Set up production MongoDB
3. Configure production email service
4. Add SSL certificates
5. Set up monitoring and alerts
6. Deploy!

Estimated setup time: **5 minutes** ⚡
