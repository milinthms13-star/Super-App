const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const run = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log('Mongo in-memory uri:', uri);
  await mongoose.connect(uri);

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

  // Authenticated schedule
  const authRes = await request(app)
    .post('/api/messaging/v4/scheduled')
    .set('Authorization', 'Bearer valid-token')
    .send({ chatId: new mongoose.Types.ObjectId().toString(), content: 'Scheduled message', scheduledTime: new Date(Date.now() + 3600000), messageType: 'text' });
  console.log('Authenticated status:', authRes.status);
  console.log('Authenticated body:', authRes.body);

  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
};

run().catch((err)=>{ console.error('Run error:', err); process.exit(1); });
