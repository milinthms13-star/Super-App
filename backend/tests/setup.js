const mongoose = require('mongoose');

if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

if (typeof global.Blob === 'undefined') {
  const { Blob, File } = require('buffer');
  global.Blob = Blob;
  global.File = typeof global.File === 'undefined' ? File : global.File;
}

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

if (typeof global.MessagePort === 'undefined') {
  try {
    const { MessagePort, MessageChannel } = require('worker_threads');
    global.MessagePort = MessagePort;
    global.MessageChannel = MessageChannel;
  } catch (error) {
    global.MessagePort = class {};
    global.MessageChannel = class {};
  }
}

if (typeof global.DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message, name = 'Error') {
      super(message);
      this.name = name;
    }
  };
}

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
