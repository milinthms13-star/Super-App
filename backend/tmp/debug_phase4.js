const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

const setupApp = () => {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token && token !== 'invalid') {
      req.user = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com'
      };
    }
    next();
  });

  app.use('/api/messaging/v4/scheduled', require('../routes/schedulingRoutes'));
  return app;
};

(async () => {
  const app = setupApp();
  // Test 1: unauthenticated
  const unauth = await request(app)
    .post('/api/messaging/v4/scheduled')
    .send({ chatId: new mongoose.Types.ObjectId().toString(), content: 'Test', scheduledTime: new Date(Date.now() + 3600000) });
  console.log('Unauthenticated status:', unauth.status);
  console.log('Unauthenticated body:', unauth.body);

  // Test 2: authenticated valid token
  const authRes = await request(app)
    .post('/api/messaging/v4/scheduled')
    .set('Authorization', 'Bearer valid-token')
    .send({ chatId: new mongoose.Types.ObjectId().toString(), content: 'Scheduled message', scheduledTime: new Date(Date.now() + 3600000), messageType: 'text' });
  console.log('Authenticated status:', authRes.status);
  console.log('Authenticated body:', authRes.body);

  // Test 3: missing fields
  const missingRes = await request(app)
    .post('/api/messaging/v4/scheduled')
    .set('Authorization', 'Bearer valid-token')
    .send({ chatId: new mongoose.Types.ObjectId().toString() });
  console.log('Missing fields status:', missingRes.status);
  console.log('Missing fields body:', missingRes.body);

  process.exit(0);
})();
