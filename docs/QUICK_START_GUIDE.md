# Healthcare Module - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you get the Healthcare Module up and running quickly.

---

## Prerequisites

- Node.js 14+ installed
- MongoDB running locally or connection string
- Basic knowledge of React and Node.js

---

## Step 1: Clone & Install (2 minutes)

```bash
# Navigate to project
cd malabarbazaar

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Configure Environment (2 minutes)

Create `.env` file in `backend/` directory:

```env
# Minimal configuration for quick start
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/malabarbazaar
JWT_SECRET=your_secret_key_here

# Optional: Add these for full features
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
RAZORPAY_KEY_ID=your_razorpay_key
OPENAI_API_KEY=your_openai_key
```

---

## Step 3: Start Services (1 minute)

### Terminal 1 - Backend
```bash
cd backend
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

---

## Step 4: Access the Application

Open your browser and navigate to:

- **Frontend:** http://localhost:3000
- **Healthcare Module:** http://localhost:3000/healthcare
- **Admin Panel:** http://localhost:3000/healthcare/admin
- **Admin Enrollment:** http://localhost:3000/healthcare/admin-enrollment

---

## Quick Test Checklist

### ✅ Basic Features
- [ ] Homepage loads successfully
- [ ] Can view list of doctors
- [ ] Can book an appointment
- [ ] Can browse lab tests
- [ ] Can search medicines

### ✅ User Actions
- [ ] Register new account
- [ ] Login successfully
- [ ] Update profile
- [ ] Upload health record

### ✅ Admin Features
- [ ] Access admin panel
- [ ] View dashboard metrics
- [ ] Approve a doctor
- [ ] Review prescriptions

---

## Common Issues & Solutions

### Issue: MongoDB Connection Failed
**Solution:** Ensure MongoDB is running
```bash
# Start MongoDB
mongod
```

### Issue: Port Already in Use
**Solution:** Change port in `.env`
```env
PORT=5001
```

### Issue: API Not Responding
**Solution:** Check backend logs and ensure it's running

---

## API Testing

Use these curl commands to test the API:

### Get Doctors List
```bash
curl http://localhost:5000/api/healthcare/doctors
```

### Create Appointment (with auth)
```bash
curl -X POST http://localhost:5000/api/healthcare/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "doc_123",
    "appointmentDate": "2026-07-10",
    "appointmentTime": "09:00"
  }'
```

---

## Development Workflow

### Making Changes

1. **Edit Code** - Make your changes
2. **Hot Reload** - Frontend auto-reloads
3. **Restart** - Backend may need restart for some changes
4. **Test** - Verify in browser

### Adding Features

1. **Backend** - Add route in `backend/routes/healthcare.js`
2. **Model** - Create/update model in `backend/models/healthcare/`
3. **Frontend** - Update component in `src/modules/healthcare/`
4. **API Call** - Add method in `healthcareApi.js`

---

## Useful Commands

### Backend
```bash
npm start              # Start server
npm test               # Run tests
npm run dev            # Start with nodemon (auto-restart)
```

### Frontend
```bash
npm start              # Start dev server
npm test               # Run tests
npm run build          # Build for production
```

### Database
```bash
# MongoDB shell
mongo malabarbazaar

# Show collections
show collections

# Query appointments
db.healthcareappointments.find().pretty()
```

---

## Default Accounts

### Patient Account
```
Email: patient@example.com
Password: password123
```

### Doctor Account
```
Email: doctor@example.com
Password: password123
```

### Admin Account
```
Email: admin@example.com
Password: admin123
```

**Note:** Create these accounts via the registration flow

---

## Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/healthcare/doctors` | GET | List all doctors |
| `/api/healthcare/appointments` | GET | Get appointments |
| `/api/healthcare/appointments` | POST | Create appointment |
| `/api/healthcare/records` | GET | Get health records |
| `/api/healthcare/pharmacy/orders` | POST | Order medicines |

Full API docs: `docs/healthcare-api-documentation.md`

---

## Next Steps

1. ✅ Read full documentation: `docs/HEALTHCARE_MODULE_README.md`
2. ✅ Explore API reference: `docs/healthcare-api-documentation.md`
3. ✅ Review implementation details: `docs/IMPLEMENTATION_SUMMARY.md`
4. ✅ Configure external services (email, SMS, payment)
5. ✅ Set up production environment
6. ✅ Run tests: `npm test`

---

## Getting Help

- **Documentation:** `/docs` folder
- **Issues:** Create GitHub issue
- **Email:** healthcare@malabarbazaar.com

---

## Production Deployment

When ready for production:

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up SSL certificates
4. Configure external services
5. Run security audit
6. Set up monitoring
7. Create backup strategy

See `docs/HEALTHCARE_MODULE_README.md` for detailed deployment guide.

---

**You're all set! Happy coding! 🎉**
