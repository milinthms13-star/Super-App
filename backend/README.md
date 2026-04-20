# MalabarBazaar Backend

Backend foundation for the MalabarBazaar super app. It is being hardened toward production use with real authentication, persistence, security controls, and scalable service boundaries.

## 🚀 Features

- **Authentication**: Email OTP login with signed bearer tokens
- **Database**: MongoDB with connection pooling and indexing
- **Caching**: Redis for rate limiting and session management
- **Email Services**: Support for Gmail, AWS SES, SendGrid, and custom SMTP
- **Security**: Helmet, CORS, rate limiting, input validation
- **Monitoring**: Winston logging, health checks, error handling
- **Real-time**: Socket.IO for live features
- **API**: RESTful endpoints with Joi validation
- **Scaling**: Horizontal scaling ready with load balancers

## 📋 Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- Email service account (Gmail, AWS SES, SendGrid, etc.)

## 🛠 Installation

1. **Clone and navigate to backend:**
   ```bash
   cd malabarbazaar/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **For production:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Database
```env
MONGODB_URI=mongodb://localhost:27017/malabarbazaar
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/malabarbazaar
```

#### Email Services

**Gmail:**
```env
EMAIL_SERVICE=Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**AWS SES:**
```env
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
```

**SendGrid:**
```env
EMAIL_SERVICE=sendgrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

#### Redis (Optional)
```env
REDIS_URL=redis://localhost:6379
```

#### Authentication
```env
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/auth/me` - Return the current authenticated user
- `POST /api/auth/logout` - Acknowledge logout for token-based clients

### Health Checks
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed service status
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe

## 🏗 Architecture

```
backend/
├── config/
│   ├── db.js          # MongoDB connection
│   └── redis.js       # Redis connection
├── middleware/
│   └── errorHandler.js # Global error handling
├── models/
│   ├── User.js        # User schema
│   └── OtpToken.js    # OTP token schema
├── routes/
│   ├── auth.js        # Authentication routes
│   └── health.js      # Health check routes
├── utils/
│   └── logger.js      # Winston logger
├── server.js          # Main server file
└── package.json
```

## 🔒 Security Features

- **Rate Limiting**: 100 requests/15min general, 5 auth attempts/15min
- **Input Validation**: Joi schemas for all endpoints
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **OTP Hashing**: SHA-256 hashed OTP storage
- **Email Validation**: RFC compliant email validation
- **Error Sanitization**: No sensitive data in error responses

## 📊 Monitoring & Logging

### Logs
- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Console**: Colorized development logs

### Health Checks
- **Basic**: Service uptime and status
- **Detailed**: Database, Redis, memory usage
- **Readiness**: Database connectivity check
- **Liveness**: Service responsiveness

## 🚀 Deployment

### Development
```bash
npm run dev  # With nodemon auto-restart
```

### Production
```bash
npm start    # Production server
```

### Docker (Recommended)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start server.js --name malabarbazaar-backend
pm2 startup
pm2 save
```

## 🔄 Scaling Strategies

### Horizontal Scaling
- Stateless design allows multiple instances
- Redis for shared session/cache storage
- Load balancer for traffic distribution

### Database Scaling
- MongoDB sharding for large datasets
- Read replicas for read-heavy operations
- Connection pooling configured

### Email Scaling
- AWS SES for high-volume email delivery
- SendGrid for transactional emails
- Rate limiting prevents abuse

## 🧪 Testing

```bash
npm test
```

### Test Coverage
- Unit tests for utilities
- Integration tests for API endpoints
- Load testing with Artillery
- Email service mocking

## 📈 Performance Optimization

### Database
- Indexed fields for fast queries
- TTL indexes for OTP cleanup
- Connection pooling
- Query optimization

### Caching
- Redis for rate limiting
- Session caching
- API response caching

### Code
- Compression middleware
- Efficient error handling
- Async/await patterns
- Memory leak prevention

## 🔧 Maintenance

### Database Migrations
```bash
npm run migrate
```

### Log Rotation
- Winston handles log rotation
- Configure log levels per environment
- Archive old logs automatically

### Backup Strategy
- MongoDB automated backups
- Redis persistence configuration
- Environment variable backups

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review environment configuration
3. Test with health check endpoints
4. Check MongoDB and Redis connectivity

## 🚨 Production Checklist

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Email service verified
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured
- [ ] Monitoring tools set up
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated

---

**Built for scale. Ready for millions.** 🚀
