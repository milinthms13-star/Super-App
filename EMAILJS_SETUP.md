# MalabarBazaar - EmailJS Setup Guide 📧

## Overview
The login system is now configured to send OTPs via email using EmailJS. This guide will help you set it up in 5 minutes.

## Setup Instructions

### Step 1: Create EmailJS Account
1. Go to [emailjs.com](https://www.emailjs.com)
2. Click "Sign Up" and create a free account
3. Verify your email

### Step 2: Add Email Service
1. Click "Email Services" in the dashboard
2. Click "Add Service"
3. Choose "Gmail" or your preferred email provider
4. Authorize the connection
5. Copy the **Service ID** (looks like: `service_xxxxx`)

### Step 3: Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Configure the template with these settings:

**Template Name:** OTP Email (or anything you prefer)

**Email Subject:**
```
Your MalabarBazaar OTP Code: {{otp_code}}
```

**Email Content:**
```
Hello {{user_name}},

Your OTP for MalabarBazaar login is:

{{otp_code}}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
MalabarBazaar Team
```

4. Save the template and copy the **Template ID** (looks like: `template_xxxxx`)

### Step 4: Get Public Key
1. Go to "Account" → "API Keys"
2. Copy your **Public Key** (looks like: `public_xxxxx`)

### Step 5: Update Login.js
Open `src/components/Login.js` and update these lines (around line 8-10):

```javascript
const EMAILJS_SERVICE_ID = "service_YOUR_SERVICE_ID_HERE";
const EMAILJS_TEMPLATE_ID = "template_YOUR_TEMPLATE_ID_HERE";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY_HERE";
```

Replace with your actual credentials from EmailJS.

### Step 6: Test the System
1. Refresh your app (http://localhost:3001)
2. Enter your email address
3. Click "Send OTP via Email"
4. You should receive an email with the OTP code
5. Enter the OTP and click "Verify OTP"

## Demo Mode
If you don't set up EmailJS:
- The system runs in **Demo Mode**
- OTP will be shown in the browser console and on the screen
- This allows you to test the functionality without email setup

## Troubleshooting

### Issue: Emails not received
**Solution:**
- Check spam/junk folder
- Verify Service ID and Template ID are correct
- Make sure your Gmail account has "Less secure app access" enabled if using Gmail
- Check emailjs.com dashboard for error logs

### Issue: "InvalidProviderType" error
**Solution:**
- Make sure you added an email service in the EmailJS dashboard
- Don't just use the Public Key without a service

### Issue: Template not working
**Solution:**
- Verify template variable names match exactly:
  - `{{otp_code}}`
  - `{{user_name}}`
  - `{{to_email}}`

## Security Notes

✅ **Good practices already implemented:**
- OTP is 6 digits randomly generated
- OTP expires after verification
- Email is validated before sending OTP

🔒 **Additional recommendations:**
- Keep your Public Key safe (it's safe to be public, but don't share it unnecessarily)
- Add OTP expiration (implement in production)
- Rate limit OTP requests (prevent abuse)
- Add database to store OTPs and user accounts

## Production Deployment

For production:
1. **Add OTP expiration:** Store OTP with timestamp, expires in 10 minutes
2. **Database:** Store users and OTPs (use Firebase, MongoDB, etc.)
3. **Rate limiting:** Prevent multiple OTP requests from same email
4. **Error handling:** Don't reveal OTP validity to user
5. **HTTPS only:** Always use HTTPS in production
6. **Environment variables:** Store credentials in .env file

Example .env setup:
```
REACT_APP_EMAILJS_SERVICE_ID=service_xxxxx
REACT_APP_EMAILJS_TEMPLATE_ID=template_xxxxx
REACT_APP_EMAILJS_PUBLIC_KEY=public_xxxxx
```

Then in Login.js:
```javascript
const EMAILJS_SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;
```

## Features

✅ Send OTP via email
✅ Verify OTP from email
✅ Resend OTP option
✅ Direct email login (no OTP)
✅ Responsive design
✅ Demo mode for testing
✅ User-friendly error messages

## Support

For more help:
- EmailJS Docs: https://www.emailjs.com/docs/
- React Tutorial: https://www.emailjs.com/docs/examples/reactjs/

---

**Made with ❤️ for MalabarBazaar**
