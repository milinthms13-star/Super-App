jest.mock('../models/Horoscope', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../utils/horoscopeMatchingService', () => ({
  calculateCompatibilityScore: jest.fn(),
}));

const Horoscope = require('../models/Horoscope');
const horoscopeRouter = require('./matrimonial-horoscope');

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
  const layer = horoscopeRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('matrimonial horoscope routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('horoscope match returns 404 when horoscope data is missing', async () => {
    const handler = getRouteHandler('post', '/horoscope/match');
    Horoscope.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'horo-2' });

    const req = {
      body: {
        profile1Id: '665f4f7e8b69fe10ef2ac111',
        profile2Id: '665f4f7e8b69fe10ef2ac222',
      },
      user: {
        _id: 'user-1',
      },
    };
    const res = createResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Horoscope details missing for one or both profiles');
  });
});

