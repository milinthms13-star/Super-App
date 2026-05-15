const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

mongoose.set('strictQuery', false);

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
  } catch (_error) {
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

global.before = beforeAll;
global.after = afterAll;
global.ObjectId = mongoose.Types.ObjectId;
global.createObjectId = (id) => {
  if (typeof id === 'string' && id.length === 24) {
    return new mongoose.Types.ObjectId(id);
  }
  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }
  return new mongoose.Types.ObjectId();
};

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  process.env.MONGODB_URI = mongoUri;
  process.env.DATABASE_URL = mongoUri;
  process.env.MONGO_TEST_URI = mongoUri;
}, 60000);

afterEach(async () => {
  jest.clearAllMocks();
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
}, 60000);
