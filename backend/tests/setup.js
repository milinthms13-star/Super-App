const mongoose = require('mongoose');

// Mock mongoose.Types.ObjectId globally
global.ObjectId = mongoose.Types.ObjectId;

/**
 * Create a properly formed ObjectId for testing
 */
global.createObjectId = (id) => {
  if (typeof id === 'string' && id.length === 24) {
    return mongoose.Types.ObjectId(id);
  }
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  return new mongoose.Types.ObjectId();
};

/**
 * Create test data with valid ObjectIds
 */
global.createTestUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  username: 'testuser',
  email: 'test@example.com',
  avatar: 'http://example.com/avatar.jpg'
});

global.createTestMessage = () => ({
  _id: new mongoose.Types.ObjectId(),
  content: 'Test message',
  sender: new mongoose.Types.ObjectId(),
  chatId: new mongoose.Types.ObjectId(),
  createdAt: new Date(),
  updatedAt: new Date()
});

global.createTestChat = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Chat',
  members: [new mongoose.Types.ObjectId()],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Mock process.env
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/malabarbazaar-test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '7d';

// Suppress mongoose warnings
mongoose.set('strictQuery', false);

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Setup and teardown
beforeAll(() => {
  // Setup code if needed
});

afterAll(async () => {
  // Cleanup after all tests
  try {
    await mongoose.disconnect();
  } catch (error) {
    // Ignore disconnect errors in test environment
  }
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
