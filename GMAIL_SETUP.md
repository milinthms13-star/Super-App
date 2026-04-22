# Gmail API Setup Guide

This guide walks you through setting up Gmail API for sending OTPs in development or production.

## Benefits
- ✅ **10,000 emails/day** free tier
- ✅ No SMTP credentials needed
- ✅ More reliable than Gmail SMTP
- ✅ OAuth-based authentication (secure)
- ✅ Better for high volume (scales to 1L+ emails)

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the **Project** dropdown at the top
3. Click **NEW PROJECT**
4. Enter project name: `NilaHub`
5. Click **CREATE**
6. Wait for the project to be created

---

## Step 2: Enable Gmail API

1. In the Google Cloud Console, search for **Gmail API**
2. Click **Gmail API** from the results
3. Click the **ENABLE** button
4. Wait for it to be enabled

---

## Step 3: Create OAuth 2.0 Credentials

1. In Google Cloud Console, go to **Credentials** (left sidebar)
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted to create an OAuth consent screen first:
   - Click **CREATE** on the consent screen dialog
   - Choose **External** user type
   - Click **CREATE**
   - Fill in the form:
     - App name: `NilaHub`
     - User support email: `your-email@gmail.com`
     - Click **SAVE AND CONTINUE**
   - On the next screen, click **SAVE AND CONTINUE** (scopes are optional)
   - Click **SAVE AND CONTINUE** again
   - Go back to create credentials
4. Now create OAuth 2.0 Client ID:
   - Application type: **Desktop application**
   - Name: `NilaHub Desktop`
   - Click **CREATE**

---

## Step 4: Download Credentials

1. After creating the credentials, click the download icon (↓)
2. Save the file as `credentials.json`
3. Move `credentials.json` to the `backend/` folder:
   ```bash
   # On Windows PowerShell:
   Move-Item -Path "C:\Users\YourUsername\Downloads\credentials.json" -Destination "c:\Users\Dhanya\malabarbazaar\backend\credentials.json"
   ```

---

## Step 5: Configure Environment

1. Open `backend/.env`
2. Change these lines:
   ```env
   EMAIL_SERVICE=gmail-api
   GMAIL_USER=your-email@gmail.com
   ```
   - Replace `your-email@gmail.com` with your Gmail address

---

## Step 6: Authorize Gmail (One-time setup)

1. Make sure the backend is running:
   ```bash
   cd backend
   npm run dev
   ```

2. In a browser, visit:
   ```
   http://localhost:5000/api/auth/authorize-gmail
   ```

3. You'll see a JSON response with an `authUrl`. Click that link.

4. Google will ask for permission. Click **Allow**

5. Copy the authorization code from the URL

6. Send it to your backend:
   ```bash
   curl -X POST http://localhost:5000/api/auth/authorize-gmail-callback \
     -H "Content-Type: application/json" \
     -d '{"code":"paste-code-here"}'
   ```

7. You should see: `"Gmail authorized successfully!"`

A file `backend/config/gmail-token.json` will be created with your refresh token.

---

## Step 7: Test Sending OTP

1. Go to your frontend: `http://localhost:3001`
2. Enter an email and click "Send OTP"
3. Check the email inbox - the OTP should arrive!

---

## Troubleshooting

### Error: "credentials.json not found"
- Make sure you downloaded and moved credentials.json to the backend folder

### Error: "Gmail OAuth not authorized"
- You haven't completed Step 6 (Authorization)
- Run the authorization flow again

### OTP not sending
- Check backend logs for error messages
- Make sure `EMAIL_SERVICE=gmail-api` in `.env`
- Verify the Gmail account you authorized has permission to use the API

### Token expired
- Delete `backend/config/gmail-token.json`
- Re-authorize by visiting Step 6 again

---

## For Production

When deploying to production:

1. Store `credentials.json` securely (environment variables)
2. Store `gmail-token.json` in a secure location (database or secure storage)
3. Use a service account for better security (optional)

---

## Next Steps

Once Gmail API is working:
- OTPs will be sent automatically to users
- Scale up to higher volumes when needed
- Consider upgrading to AWS SES for even better scaling (1L+ emails/day)
