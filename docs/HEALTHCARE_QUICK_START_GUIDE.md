# Healthcare Module - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you get the Healthcare Module up and running quickly.

## Prerequisites

Before you begin, ensure you have:
- ✅ Node.js v14+ installed
- ✅ MongoDB v4.4+ installed and running
- ✅ npm or yarn package manager
- ✅ Git (optional)

## Step 1: Installation (2 minutes)

### Clone or Navigate to Project
```bash
cd malabarbazaar
```

### Install Dependencies
```bash
npm install
```

**Key packages installed**:
- `react` - Frontend framework
- `express` - Backend server
- `mongoose` - MongoDB ORM
- `razorpay` / `stripe` - Payment gateways
- `simple-peer` - WebRTC for video calls
- `pdfkit` - PDF report generation

## Step 2: Configuration (2 minutes)

### Create Environment File
```bash
# Copy the example environment file
cp .env.example .env
```

### Configure Environment Variables
Open `.env` and set the following:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/malabarbazaar

# Payment Gateway (Choose one or both)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=your_key_here
RAZORPAY_KEY_SECRET=your_secret_here

# OR use Stripe
# PAYMENT_PROVIDER=stripe
# STRIPE_SECRET_KEY=your_stripe_key
# STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Server
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here

# File Storage (optional for now)
# AWS_ACCESS_KEY_ID=your_aws_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret
# AWS_S3_BUCKET=your_bucket_name
```

### Quick Test Mode (No Configuration Needed)
For quick testing without payment gateway setup:
```bash
# Set payment provider to simulated mode
PAYMENT_PROVIDER=simulated
```

## Step 3: Database Setup (1 minute)

### Start MongoDB
```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod

# Or use MongoDB Compass GUI
```

### Verify Connection
```bash
# Test MongoDB connection
mongosh
> use malabarbazaar
> show collections
> exit
```

**Note**: Collections will be created automatically on first use.

## Step 4: Run the Application (< 1 minute)

### Start Development Server
```bash
# Start both frontend and backend
npm run dev

# OR start separately
# Terminal 1 (Backend)
npm run server

# Terminal 2 (Frontend)
npm run client
```

### Access the Application
Open your browser and navigate to:
```
http://localhost:3000
```

Then go to:
```
http://localhost:3000/healthcare
```

## Step 5: Test the Features

### Quick Feature Test Checklist

#### 1. Doctor Consultation ✅
- Click "Book Consultation" on homepage
- Select a doctor from the list
- Fill appointment form
- Submit booking
- View appointment in "My Appointments"

#### 2. Lab Booking ✅
- Navigate to "Lab Tests" section
- Browse available tests
- Add test to cart
- Select date and time
- Complete booking

#### 3. Upload Medical Record ✅
- Go to "Health Records" section
- Click "Upload New Record"
- Select file (image or PDF)
- Fill record details
- Save to vault

#### 4. Lab Report OCR ✅
- Navigate to "Lab Report Processing" (new section)
- Drag and drop a lab report image
- Click "Process with OCR"
- View extracted results
- Save to records

#### 5. Pharmacy Order ✅
- Go to "Pharmacy" section
- Search for medicines
- Add to cart
- Upload prescription (if required)
- Place order

#### 6. Emergency SOS ✅
- Navigate to "Emergency" section
- Click "Activate SOS"
- Location sharing activated
- Emergency contacts notified

#### 7. Wearables Integration ✅
- Go to "Wearables" section (new)
- Connect device (simulated in dev mode)
- View health metrics
- Check sync status

#### 8. Insurance Claims ✅
- Navigate to "Insurance" section
- Add insurance card details
- Submit a claim
- Track claim status

---

## 🎯 Common Use Cases

### Use Case 1: Book a Video Consultation

**Steps**:
1. Navigate to `/healthcare`
2. Click "Doctor Consultation"
3. Filter by specialty (e.g., "General Physician")
4. Select doctor and click "Book Appointment"
5. Choose date, time, and consultation mode (Video)
6. Fill patient details
7. Proceed to payment
8. Receive confirmation

**Expected Time**: 2-3 minutes

### Use Case 2: Upload and Process Lab Report

**Steps**:
1. Navigate to "Lab Report Processing"
2. Upload report image/PDF
3. Click "Process with OCR"
4. Review extracted results
5. Edit if needed
6. Save to Health Records

**Expected Time**: 1-2 minutes

### Use Case 3: Order Medicines

**Steps**:
1. Go to "Pharmacy" section
2. Search for medicine or browse categories
3. Add items to cart
4. Upload prescription
5. Select delivery address and time
6. Proceed to payment
7. Track order status

**Expected Time**: 3-4 minutes

---

## 🔧 Troubleshooting

### Issue 1: MongoDB Connection Error
**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Solution**:
```bash
# Check if MongoDB is running
mongosh

# If not running, start it
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### Issue 2: Port Already in Use
**Error**: `EADDRINUSE: Port 3000 already in use`

**Solution**:
```bash
# Find and kill the process using the port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# OR change port in package.json
PORT=3001 npm run dev
```

### Issue 3: Payment Gateway Errors
**Error**: Payment initialization fails

**Solution**:
```bash
# Use simulated mode for development
# In .env file:
PAYMENT_PROVIDER=simulated

# No API keys needed in simulated mode
```

### Issue 4: Video Consultation Not Loading
**Issue**: Video call doesn't connect

**Solution**:
- Check browser permissions for camera/microphone
- Ensure you're using HTTPS or localhost
- Check WebRTC compatibility (Chrome, Firefox recommended)
- In development, WebRTC is simulated (no real connection)

### Issue 5: OCR Not Processing Reports
**Issue**: OCR processing fails or shows errors

**Solution**:
- OCR is simulated in development mode (shows mock data)
- For production OCR, install Tesseract.js:
  ```bash
  npm install tesseract.js
  ```
- Check file size (must be < 10MB)
- Supported formats: JPG, PNG, GIF, PDF

---

## 📱 Testing on Mobile

### Local Network Testing
```bash
# Find your local IP address
# Windows
ipconfig

# macOS/Linux
ifconfig | grep "inet "

# Access from mobile on same network
http://192.168.1.x:3000/healthcare
```

### Mobile Features to Test
- ✅ Responsive UI
- ✅ Touch gestures
- ✅ Camera upload for records
- ✅ GPS location for emergency
- ✅ Push notifications (if enabled)

---

## 🎨 Customization

### Change Theme Colors
```css
/* Edit src/modules/healthcare/Healthcare.css */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #10b981;
  --accent-color: #8b5cf6;
}
```

### Add Custom Specialties
```javascript
// Edit src/modules/healthcare/data/healthcareMockData.js
export const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Your Custom Specialty', // Add here
];
```

### Modify Appointment Slots
```javascript
// Edit backend/models/healthcare/HealthcareDoctor.js
const defaultSlots = [
  { time: '09:00 AM', available: true },
  { time: '09:30 AM', available: true },
  // Add more slots
];
```

---

## 🔐 User Accounts for Testing

### Test Patient Account
```
Email: patient@test.com
Password: test123
Role: patient
```

### Test Doctor Account
```
Email: doctor@test.com
Password: test123
Role: doctor
```

### Test Admin Account
```
Email: admin@test.com
Password: admin123
Role: admin
```

**Note**: These accounts are created automatically in development mode.

---

## 📊 Mock Data

The healthcare module comes with rich mock data for testing:

- **50+ Doctors** across various specialties
- **100+ Lab Tests** with pricing
- **20+ Health Packages** for different needs
- **500+ Medicines** in pharmacy catalog
- **Sample Appointments** for testing workflows
- **Mock Insurance Providers** with coverage details

**Location**: `src/modules/healthcare/data/healthcareMockData.js`

---

## 🌐 Internationalization

### Test Different Languages
```javascript
// Switch language in browser
localStorage.setItem('preferredLanguage', 'hi'); // Hindi
localStorage.setItem('preferredLanguage', 'ml'); // Malayalam
localStorage.setItem('preferredLanguage', 'ta'); // Tamil
localStorage.setItem('preferredLanguage', 'te'); // Telugu

// Reload page to see changes
location.reload();
```

### Available Languages
- 🇬🇧 English (en) - Default
- 🇮🇳 Hindi (hi)
- 🇮🇳 Malayalam (ml)
- 🇮🇳 Tamil (ta)
- 🇮🇳 Telugu (te)

---

## 📈 Development Workflow

### Recommended Development Flow
1. **Morning Setup** (5 min)
   - Start MongoDB
   - Start dev server
   - Check logs for errors

2. **Feature Development** (as needed)
   - Create/modify components
   - Test in browser
   - Check console for errors

3. **Testing** (before commits)
   - Test all modified features
   - Check responsive design
   - Verify API calls work

4. **End of Day** (5 min)
   - Commit changes
   - Stop servers
   - Backup database (optional)

---

## 🚀 Next Steps

After completing this quick start:

1. **Read Full Documentation**
   - `docs/HEALTHCARE_MODULE_README.md` - Complete guide
   - `docs/healthcare-api-documentation.md` - API reference
   - `docs/HEALTHCARE_IMPLEMENTATION_SUMMARY.md` - Implementation details

2. **Explore Advanced Features**
   - Video consultations with WebRTC
   - OCR for lab reports
   - Wearables integration
   - Insurance claim processing
   - Analytics and health scoring

3. **Configure Production Settings**
   - Set up real payment gateways
   - Configure file storage (AWS S3)
   - Set up production database
   - Configure monitoring

4. **Deploy to Production**
   - Follow deployment guide
   - Set up SSL certificates
   - Configure domain
   - Enable monitoring

---

## 📞 Need Help?

### Resources
- **Documentation**: Check `docs/` folder
- **API Reference**: `docs/healthcare-api-documentation.md`
- **Issue Tracker**: GitHub Issues
- **Support Email**: support@malabarbazaar.com

### Common Questions
- **Q**: How do I add a new feature?
  - **A**: Check component structure in `src/modules/healthcare/components/`

- **Q**: How do I modify the database schema?
  - **A**: Edit models in `backend/models/healthcare/`

- **Q**: How do I add a new API endpoint?
  - **A**: Add route in `backend/routes/healthcare.js`

- **Q**: How do I customize the UI?
  - **A**: Edit CSS files in component folders

---

## 🎉 You're Ready!

Congratulations! You now have a fully functional healthcare platform running locally.

### Quick Links
- 🏠 Homepage: `http://localhost:3000`
- 🏥 Healthcare: `http://localhost:3000/healthcare`
- 📊 Admin Panel: `http://localhost:3000/healthcare` (with admin account)
- 📚 API Docs: `docs/healthcare-api-documentation.md`

### Explore Features
- Book consultations
- Order medicines
- Upload health records
- Process lab reports with OCR
- Track health metrics
- Manage insurance claims

**Happy Coding! 🚀**

---

**Last Updated**: July 7, 2026  
**Version**: 1.0.0  
**Estimated Setup Time**: 5 minutes
