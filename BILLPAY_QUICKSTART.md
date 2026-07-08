# BillPay Module - Quick Start Guide

## Prerequisites
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000
- ✅ MongoDB running
- ✅ Node.js 18+ installed

## Step-by-Step Setup (15 minutes)

### Step 1: Get Razorpay Credentials (5 minutes)

1. Go to https://razorpay.com/
2. Click "Sign Up" (free account)
3. Complete registration
4. Go to **Settings → API Keys**
5. Click "Generate Test Keys"
6. Copy the Key ID and Secret

### Step 2: Add Credentials to .env (2 minutes)

1. Open `backend/.env`
2. Find these lines:
   ```env
   RAZORPAY_KEY_ID=
   RAZORPAY_KEY_SECRET=
   ```
3. Paste your credentials:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Save the file

### Step 3: Restart Backend (1 minute)

```bash
cd backend
npm start
```

Wait for "Server running on port 5000" message.


### Step 4: Access BillPay Module (1 minute)

1. Open browser: http://localhost:3000
2. Login to your account
3. Click "Nila Utility Hub" or navigate to http://localhost:3000/billpay

### Step 5: Test Payment Flow (5 minutes)

1. **Select Category**: Click on "Electricity" (or any category)
2. **Choose Biller**: Select a biller from dropdown
3. **Enter Details**: 
   - Consumer Number: `TEST123456`
   - Amount: `₹1000`
4. **Click "Pay Now"**
5. **Razorpay Modal Opens**
6. **Use Test Cards**:
   - Success: `4111 1111 1111 1111`
   - Failure: `4242 4242 4242 4242`
   - CVV: Any 3 digits
   - Expiry: Any future date
7. **Complete Payment**
8. **See Success Message** ✅

### Step 6: View Receipt (1 minute)

1. Go to **"History"** tab
2. Find your transaction
3. Click **"Download Receipt"**
4. PDF downloads automatically

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads BillPay module
- [ ] Can select category and biller
- [ ] Payment modal opens
- [ ] Test payment succeeds
- [ ] Transaction appears in history
- [ ] Receipt downloads as PDF
- [ ] Admin analytics visible (if admin user)


---

## Optional: Setu BBPS Setup (For Real Bill Discovery)

### Why Add Setu?
- Real-time bill fetch from actual billers
- 20,000+ billers across India
- Official BBPS receipts
- Production-ready bill payments

### Setu Setup (2-4 weeks)

1. **Apply for Access**
   - Go to https://setu.co/
   - Click "Get Started"
   - Select "Bharat Connect (BBPS)"
   - Fill application form

2. **Submit KYC Documents**
   - Business registration
   - PAN card
   - Bank account details
   - GST certificate (if applicable)

3. **Wait for Approval** (1-2 weeks)
   - Setu team reviews application
   - May request additional documents
   - Approval notification via email

4. **Get Credentials**
   - Login to Setu Bridge dashboard
   - Navigate to API section
   - Copy credentials:
     - API Key
     - Bearer Token
     - Client ID
     - Client Secret
     - Agent ID

5. **Add to .env**
   ```env
   SETU_BILLPAY_API_KEY=your-api-key
   SETU_BILLPAY_BEARER_TOKEN=your-bearer-token
   SETU_BILLPAY_CLIENT_ID=your-client-id
   SETU_BILLPAY_CLIENT_SECRET=your-client-secret
   SETU_BILLPAY_AGENT_ID=your-agent-id
   SETU_BILLPAY_AGENT_MOBILE=9876543210
   SETU_BILLPAY_AGENT_IFSC=SBIN0000001
   ```

6. **Restart and Test**
   ```bash
   cd backend
   npm start
   ```


---

## Troubleshooting

### Issue: "Payment gateway not configured"
**Solution**: Make sure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `backend/.env`

### Issue: "Cannot create order"
**Solution**: 
1. Check backend logs for errors
2. Verify Razorpay credentials are correct
3. Ensure backend is running

### Issue: Receipt not downloading
**Solution**: Check browser's download settings and popup blocker

### Issue: Setu bill discovery not working
**Solution**: 
1. Verify all Setu credentials are set in `.env`
2. Check `SETU_BILLPAY_STRICT_MODE=false` to allow fallback
3. Contact Setu support if credentials are correct

### Issue: Admin analytics not visible
**Solution**: Make sure your user account has `role: "admin"` or email is `mgdhanyamohan@gmail.com`

---

## Testing with Razorpay Test Mode

### Test Card Numbers

**Successful Payment:**
```
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
Name: Test User
```

**Failed Payment:**
```
Card: 4242 4242 4242 4242
CVV: 123
Expiry: 12/25
```

**3D Secure (OTP Required):**
```
Card: 5104 0600 0000 0008
CVV: 123
Expiry: 12/25
OTP: Any 6 digits
```


### Test UPI IDs
```
success@razorpay
failure@razorpay
```

### Test Net Banking
- Select any bank
- Use credentials provided on test page
- All test transactions are free

---

## Next Steps After Setup

### 1. Add Database Indexes (Recommended)
```javascript
// In MongoDB shell
use superappmango

db.bills.createIndex({ userId: 1, category: 1 });
db.bills.createIndex({ userId: 1, dueDate: 1 });
db.billpaytransactions.createIndex({ userId: 1, timestamp: -1 });
db.billpaytransactions.createIndex({ txnId: 1 }, { unique: true });
db.disputes.createIndex({ userId: 1, status: 1 });
db.mandates.createIndex({ userId: 1, status: 1 });
```

### 2. Enable Production Mode
When ready for production:
1. Get Razorpay **Live** keys (not test keys)
2. Update `.env` with live credentials
3. Test with real small amount (₹1-10)
4. Enable HTTPS
5. Update `FRONTEND_URL` in `.env`

### 3. Monitor Performance
- Check MongoDB query performance
- Monitor Razorpay dashboard for success rates
- Review error logs regularly
- Set up Sentry for error tracking (already configured)

---

## Quick Reference

### API Endpoints
```
GET    /api/billpay/bills                 - Get saved bills
POST   /api/billpay/discover              - Discover bill
POST   /api/billpay/pay/create-order      - Create payment
POST   /api/billpay/pay/verify            - Verify payment
GET    /api/billpay/history               - Transaction history
```


### Environment Variables
```env
# Required
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Optional (for BBPS)
SETU_BILLPAY_API_KEY=xxxxx
SETU_BILLPAY_BEARER_TOKEN=xxxxx
SETU_BILLPAY_CLIENT_ID=xxxxx
SETU_BILLPAY_CLIENT_SECRET=xxxxx
SETU_BILLPAY_AGENT_ID=xxxxx
```

### Support Resources
- **Razorpay Docs**: https://razorpay.com/docs/
- **Setu Docs**: https://docs.setu.co/payments/bbps
- **BBPS Official**: https://www.bharatbillpay.com/

---

## Success! 🎉

You should now have:
- ✅ BillPay module running
- ✅ Razorpay integration working
- ✅ Test payments successful
- ✅ Receipts downloading

**Ready to accept real payments?** Just switch to Razorpay live keys and you're good to go!

---

*For detailed documentation, see BILLPAY_MODULE_ANALYSIS.md*  
*For business overview, see BILLPAY_EXECUTIVE_SUMMARY.md*
