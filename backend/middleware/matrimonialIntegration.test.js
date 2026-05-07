jest.mock('../models/MatrimonialProfile', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../utils/subscriptionService', () => ({
  subscriptionService: {
    hasEntitlement: jest.fn(),
    getUserSubscription: jest.fn(),
  },
}));

jest.mock('../utils/blueTickService', () => ({
  blueTickService: {},
}));

const MatrimonialProfile = require('../models/MatrimonialProfile');
const {
  ensureMatrimonialProfileContext,
  ensurePartnerPreferencesComplete,
  checkBlockStatus,
} = require('./matrimonialIntegration');

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

describe('matrimonial integration middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('ensureMatrimonialProfileContext resolves the live profile by userId', async () => {
    const profile = {
      _id: '665f4f7e8b69fe10ef2ac222',
      userId: '665f4f7e8b69fe10ef2ac111',
      email: 'match@example.com',
      preferences: {},
    };

    MatrimonialProfile.findOne.mockResolvedValue(profile);

    const req = {
      user: {
        _id: '665f4f7e8b69fe10ef2ac111',
        email: 'match@example.com',
      },
      auth: {
        sub: '665f4f7e8b69fe10ef2ac111',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await ensureMatrimonialProfileContext(req, res, next);

    expect(MatrimonialProfile.findOne).toHaveBeenCalledWith({
      userId: '665f4f7e8b69fe10ef2ac111',
    });
    expect(req.matrimonialProfileId).toBe('665f4f7e8b69fe10ef2ac222');
    expect(req.user.matrimonialProfileId).toBe('665f4f7e8b69fe10ef2ac222');
    expect(next).toHaveBeenCalled();
  });

  test('ensurePartnerPreferencesComplete accepts the real preferences field', async () => {
    const profile = {
      _id: '665f4f7e8b69fe10ef2ac222',
      userId: '665f4f7e8b69fe10ef2ac111',
      email: 'match@example.com',
      preferences: {
        ageMin: 25,
        ageMax: 32,
        religion: 'Any',
        location: 'Kochi',
      },
    };

    MatrimonialProfile.findOne.mockResolvedValue(profile);

    const req = {
      user: {
        _id: '665f4f7e8b69fe10ef2ac111',
        email: 'match@example.com',
      },
      auth: {
        sub: '665f4f7e8b69fe10ef2ac111',
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await ensurePartnerPreferencesComplete(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.body).toBeNull();
  });

  test('checkBlockStatus uses blockedBy on both profiles instead of req.user.matrimonialProfileId', async () => {
    const currentProfile = {
      _id: '665f4f7e8b69fe10ef2ac111',
      userId: '665f4f7e8b69fe10ef2ac999',
      email: 'match@example.com',
      blockedBy: [],
    };
    const targetProfile = {
      _id: '665f4f7e8b69fe10ef2ac333',
      blockedBy: ['665f4f7e8b69fe10ef2ac111'],
    };

    MatrimonialProfile.findOne.mockResolvedValue(currentProfile);
    MatrimonialProfile.findById.mockResolvedValue(targetProfile);

    const req = {
      user: {
        _id: '665f4f7e8b69fe10ef2ac999',
        email: 'match@example.com',
      },
      auth: {
        sub: '665f4f7e8b69fe10ef2ac999',
      },
      body: {
        toProfileId: '665f4f7e8b69fe10ef2ac333',
      },
      params: {},
    };
    const res = createResponse();
    const next = jest.fn();

    await checkBlockStatus(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'You have blocked this user. Unblock to contact.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
