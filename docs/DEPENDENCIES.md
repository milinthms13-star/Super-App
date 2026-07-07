# Healthcare Module - Dependencies

## Backend Dependencies

Add these to your `backend/package.json`:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1",
    "axios": "^1.4.0",
    "nodemailer": "^6.9.0",
    "twilio": "^4.10.0",
    "razorpay": "^2.8.6",
    "stripe": "^12.0.0",
    "pdfkit": "^0.13.0",
    "tesseract.js": "^4.1.1",
    "aws-sdk": "^2.1379.0",
    "crypto": "^1.0.1",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "mongodb-memory-server": "^8.12.0"
  }
}
```

### Install Command

```bash
cd backend
npm install express mongoose jsonwebtoken bcryptjs multer axios nodemailer twilio razorpay stripe pdfkit tesseract.js aws-sdk crypto cors dotenv helmet express-rate-limit
npm install --save-dev nodemon jest supertest mongodb-memory-server
```

---

## Frontend Dependencies

Add these to your `frontend/package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.10.0",
    "axios": "^1.4.0",
    "react-scripts": "5.0.1"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "cypress": "^12.10.0"
  }
}
```

### Install Command

```bash
cd frontend
npm install react react-dom react-router-dom axios
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event cypress
```

---

## Dependency Details

### Core Backend

| Package | Purpose | Version |
|---------|---------|---------|
| express | Web framework | 4.18.2 |
| mongoose | MongoDB ODM | 7.0.0 |
| jsonwebtoken | JWT authentication | 9.0.0 |
| bcryptjs | Password hashing | 2.4.3 |
| multer | File uploads | 1.4.5 |

### Communication

| Package | Purpose | Version |
|---------|---------|---------|
| nodemailer | Email sending | 6.9.0 |
| twilio | SMS sending | 4.10.0 |

### Payment

| Package | Purpose | Version |
|---------|---------|---------|
| razorpay | Payment gateway | 2.8.6 |
| stripe | Payment gateway | 12.0.0 |

### AI & Processing

| Package | Purpose | Version |
|---------|---------|---------|
| axios | HTTP client | 1.4.0 |
| tesseract.js | OCR | 4.1.1 |
| pdfkit | PDF generation | 0.13.0 |

### Storage

| Package | Purpose | Version |
|---------|---------|---------|
| aws-sdk | AWS S3 integration | 2.1379.0 |

### Security

| Package | Purpose | Version |
|---------|---------|---------|
| helmet | Security headers | 7.0.0 |
| cors | CORS handling | 2.8.5 |
| express-rate-limit | Rate limiting | 6.7.0 |

### Development

| Package | Purpose | Version |
|---------|---------|---------|
| nodemon | Auto-restart | 2.0.22 |
| jest | Testing | 29.5.0 |
| supertest | API testing | 6.3.3 |
| mongodb-memory-server | Test database | 8.12.0 |

---

## Optional Dependencies

### Video Consultations (Zoom)
```bash
npm install node-zoom-api
```

### Google Fit Integration
```bash
npm install googleapis
```

### Fitbit Integration
```bash
npm install fitbit-node
```

### Apple Health (iOS App)
```bash
# Requires native iOS development
# Use HealthKit framework in Swift/Objective-C
```

---

## Browser Compatibility

The frontend is compatible with:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Browser Features

- WebRTC (for video consultations)
- LocalStorage (for offline support)
- FileReader API (for file uploads)
- Geolocation API (for emergency services)

---

## System Requirements

### Development

- **Node.js:** 14.x or higher
- **npm:** 6.x or higher
- **MongoDB:** 4.4 or higher
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 2GB free space

### Production

- **Node.js:** 16.x LTS or higher
- **npm:** 8.x or higher
- **MongoDB:** 5.x or higher
- **RAM:** 8GB minimum, 16GB recommended
- **Disk:** 20GB free space
- **CPU:** 2 cores minimum, 4 cores recommended

---

## Environment-Specific Dependencies

### Development Only
```json
{
  "nodemon": "^2.0.22",
  "jest": "^29.5.0",
  "cypress": "^12.10.0"
}
```

### Production Only
```bash
npm install pm2 -g  # Process manager
npm install compression  # Response compression
```

---

## Updating Dependencies

### Check for Updates
```bash
npm outdated
```

### Update Specific Package
```bash
npm update package-name
```

### Update All Packages
```bash
npm update
```

### Security Audit
```bash
npm audit
npm audit fix
```

---

## Peer Dependencies

Some packages may require peer dependencies. Install them if prompted:

```bash
# Example for React
npm install react@18.2.0 react-dom@18.2.0
```

---

## Troubleshooting

### Issue: Package Installation Fails

**Solution 1:** Clear npm cache
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 2:** Use specific Node version
```bash
nvm use 16
npm install
```

### Issue: Peer Dependency Conflicts

**Solution:** Use legacy peer deps
```bash
npm install --legacy-peer-deps
```

### Issue: Native Module Build Fails

**Solution:** Install build tools
```bash
# Windows
npm install --global windows-build-tools

# Mac
xcode-select --install

# Linux
sudo apt-get install build-essential
```

---

## License Information

Most dependencies use permissive licenses:
- MIT License (most packages)
- Apache 2.0 (some packages)
- ISC License (some packages)

Always check individual package licenses for compliance with your use case.

---

## Alternative Packages

If you prefer different solutions:

### Email (instead of Nodemailer)
- SendGrid: `npm install @sendgrid/mail`
- Mailgun: `npm install mailgun-js`

### SMS (instead of Twilio)
- AWS SNS: `npm install aws-sdk`
- MessageBird: `npm install messagebird`

### Payment (instead of Razorpay/Stripe)
- PayPal: `npm install @paypal/checkout-server-sdk`
- Square: `npm install square`

### Database (instead of MongoDB)
- PostgreSQL: `npm install pg`
- MySQL: `npm install mysql2`

---

## Version Compatibility Matrix

| Backend | Frontend | Node.js | MongoDB |
|---------|----------|---------|---------|
| 1.0.0 | 1.0.0 | 14.x+ | 4.4+ |
| 1.0.0 | 1.0.0 | 16.x LTS | 5.0+ |
| 1.0.0 | 1.0.0 | 18.x LTS | 6.0+ |

---

## Installation Script

Save this as `install-dependencies.sh`:

```bash
#!/bin/bash

echo "Installing Healthcare Module Dependencies..."

# Backend
echo "Installing backend dependencies..."
cd backend
npm install

# Frontend
echo "Installing frontend dependencies..."
cd ../frontend
npm install

echo "✅ All dependencies installed successfully!"
echo "Run 'npm start' in backend and frontend directories to start the application."
```

Make it executable:
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

---

## NPM Scripts Recommendations

Add these to your `package.json`:

### Backend
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### Frontend
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "cypress": "cypress open",
    "cypress:run": "cypress run"
  }
}
```

---

**All dependencies documented! Ready to install and run! 🚀**
