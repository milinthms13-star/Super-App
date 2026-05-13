jest.mock('../models/KYC', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../models/BlueTick', () => ({
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../models/MatrimonialProfile', () => ({
  findOne: jest.fn(),
}));

jest.mock('../utils/blueTickService', () => ({
  autoIssueBlueTick: jest.fn(),
  calculateEligibilityScore: jest.fn(),
}));

const kycRouter = require('./matrimonial-kyc');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const getRouteHandler = (method, path) => {
  const layer = kycRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('matrimonial kyc routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('kyc upload rejects unsupported file type', async () => {
    const handler = getRouteHandler('post', '/kyc/upload');
    const req = {
      body: {
        profileId: '665f4f7e8b69fe10ef2ac111',
        documentType: 'aadhaar',
      },
      file: {
        originalname: 'evil.exe',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('MZFAKE', 'utf8'),
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Only JPG, PNG, and PDF files are allowed for KYC documents');
  });

  test('kyc selfie rejects oversized payload', async () => {
    const handler = getRouteHandler('post', '/kyc/selfie');
    const oversized = Buffer.alloc(3 * 1024 * 1024 + 32, 1).toString('base64');
    const req = {
      body: {
        profileId: '665f4f7e8b69fe10ef2ac111',
        selfieImage: `data:image/jpeg;base64,${oversized}`,
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Selfie image exceeds max size of 3MB');
  });
});

