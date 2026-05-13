process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/malabarbazaar-test';
process.env.JWT_SECRET = 'test-secret-key';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());
const devadarshanRouter = require('../routes/devadarshan');
app.use('/api/devadarshan', devadarshanRouter);

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Mongo connected');
  } catch (err) {
    console.error('Mongo connect failed', err.message);
    process.exit(1);
  }

  const token = jwt.sign(
    { email: 'testuser@example.com', id: 'testuser1', name: 'Test User' },
    process.env.JWT_SECRET,
    { issuer: 'malabarbazaar-api', audience: 'malabarbazaar-web' }
  );

  const bookingPayload = {
    templeId: 'tmp-padmanabha',
    poojaType: 'Archana',
    devoteeName: 'Test Devotee',
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    quantity: 1,
    paymentMethod: 'UPI',
  };

  try {
    const res = await request(app)
      .post('/api/devadarshan/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(bookingPayload);

    console.log('booking status', res.status);
    console.log('booking body', JSON.stringify(res.body, null, 2));

    const bootstrap = await request(app)
      .get('/api/devadarshan/bootstrap')
      .set('Authorization', `Bearer ${token}`);
    console.log('bootstrap status', bootstrap.status);
    console.log('bootstrap body keys', Object.keys(bootstrap.body));
  } catch (err) {
    console.error('Smoke test request failed', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
