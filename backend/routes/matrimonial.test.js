jest.mock('../models/MatrimonialProfile', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  exists: jest.fn(),
}));

jest.mock('../models/User', () => ({
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../config/s3', () => ({
  uploadToS3: jest.fn(),
}));

const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const matrimonialRouter = require('./matrimonial');

const createMockResponse = () => ({
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
  const layer = matrimonialRouter.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method]
  );

  return layer.route.stack[layer.route.stack.length - 1].handle;
};

describe('matrimonial routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('search defaults to verified profiles and excludes blocked/self matches', async () => {
    const handler = getRouteHandler('get', '/search');
    const currentProfileId = '665f4f7e8b69fe10ef2ac111';
    const blockedProfileId = '665f4f7e8b69fe10ef2ac222';
    const findChain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: currentProfileId,
      blockedBy: [blockedProfileId],
    });
    MatrimonialProfile.find.mockReturnValue(findChain);

    const req = {
      query: {},
      user: {
        _id: 'user-123',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(MatrimonialProfile.find).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: { $ne: 'user-123' },
        verificationStatus: 'verified',
        $and: expect.arrayContaining([
          { _id: { $ne: currentProfileId } },
          { _id: { $nin: [blockedProfileId] } },
          { blockedBy: { $ne: currentProfileId } },
        ]),
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('profile save keeps the existing photo when no new upload is provided', async () => {
    const handler = getRouteHandler('put', '/profile');
    const existingProfile = {
      photoUrl: '/uploads/matrimonial/existing-photo.jpg',
      age: 29,
      gender: 'Man',
      verificationStatus: 'pending',
      profileStatus: 'pending_review',
      preferences: {},
      privacy: {
        hidePhone: false,
        hidePhotos: false,
        premiumOnlyContact: false,
      },
      languages: ['Malayalam'],
      hobbies: ['Travel'],
    };

    MatrimonialProfile.findOne.mockResolvedValue(existingProfile);
    MatrimonialProfile.findOneAndUpdate.mockResolvedValue({
      _id: '665f4f7e8b69fe10ef2ac333',
      userId: 'user-123',
      name: 'Arun Menon',
      email: 'arun@example.com',
      phone: '9876543210',
      photoUrl: '/uploads/matrimonial/existing-photo.jpg',
      age: 29,
      gender: 'Man',
      religion: 'Hindu',
      caste: 'Nair',
      community: 'Malayali',
      education: 'B.Tech',
      profession: 'Product Manager',
      location: 'Kochi',
      maritalStatus: 'Never Married',
      familyDetails: 'Family details',
      bio: 'Bio',
      languages: ['Malayalam'],
      hobbies: ['Travel'],
      preferences: {},
      privacy: {
        hidePhone: false,
        hidePhotos: false,
        premiumOnlyContact: false,
      },
      profileViews: 0,
      interestsSent: 0,
      interestsReceived: 0,
      verificationStatus: 'pending',
      profileStatus: 'pending_review',
      lastActive: new Date('2026-05-07T00:00:00.000Z'),
    });

    const req = {
      body: {
        name: 'Arun Menon',
        email: 'arun@example.com',
        phone: '9876543210',
        age: '29',
        gender: 'Man',
        religion: 'Hindu',
        caste: 'Nair',
        community: 'Malayali',
        education: 'B.Tech',
        profession: 'Product Manager',
        location: 'Kochi',
        maritalStatus: 'Never Married',
        familyDetails: 'Family details',
        bio: 'Bio',
        languages: 'Malayalam',
        hobbies: 'Travel',
      },
      user: {
        _id: 'user-123',
        email: 'arun@example.com',
        preferences: {},
      },
      file: null,
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(MatrimonialProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-123' },
      expect.objectContaining({
        $set: expect.objectContaining({
          photoUrl: '/uploads/matrimonial/existing-photo.jpg',
        }),
      }),
      expect.objectContaining({
        upsert: true,
      })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('sending the same interest twice is idempotent', async () => {
    const handler = getRouteHandler('post', '/interests');
    const currentProfileId = '665f4f7e8b69fe10ef2ac444';
    const targetProfileId = '665f4f7e8b69fe10ef2ac555';
    const save = jest.fn();

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: currentProfileId,
      userId: 'user-123',
      interestsSent: 1,
      blockedBy: [],
      save,
    });
    MatrimonialProfile.findById.mockResolvedValue({
      _id: targetProfileId,
      name: 'Anjali',
      phone: '',
      privacy: {
        hidePhone: false,
        hidePhotos: false,
        premiumOnlyContact: false,
      },
      verificationStatus: 'verified',
      profileStatus: 'approved',
      interests: [
        {
          id: 'interest-1',
          fromProfileId: currentProfileId,
          toProfileId: targetProfileId,
          status: 'sent',
          message: '',
          createdAt: new Date('2026-05-07T00:00:00.000Z'),
        },
      ],
      blockedBy: [],
      save,
    });

    const req = {
      body: {
        toProfileId: targetProfileId,
        message: 'Hello',
      },
      user: {
        _id: 'user-123',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Interest already sent');
    expect(save).not.toHaveBeenCalled();
  });

  test('admin moderation updates live profile status', async () => {
    const handler = getRouteHandler('patch', '/admin/profiles/:profileId/moderation');
    const save = jest.fn().mockResolvedValue(undefined);
    const profile = {
      _id: '665f4f7e8b69fe10ef2ac666',
      userId: 'user-456',
      name: 'Pending Member',
      email: 'pending@example.com',
      phone: '',
      age: 27,
      gender: 'Woman',
      religion: 'Hindu',
      caste: 'Nair',
      community: 'Malayali',
      education: 'MBA',
      profession: 'Designer',
      location: 'Kochi',
      maritalStatus: 'Never Married',
      familyDetails: 'Family details',
      bio: 'Bio',
      languages: ['Malayalam'],
      hobbies: ['Travel'],
      preferences: {},
      privacy: {
        hidePhone: false,
        hidePhotos: false,
        premiumOnlyContact: false,
      },
      profileViews: 0,
      interestsSent: 0,
      interestsReceived: 0,
      verificationStatus: 'pending',
      profileStatus: 'pending_review',
      lastActive: new Date('2026-05-07T00:00:00.000Z'),
      save,
    };

    MatrimonialProfile.findById.mockResolvedValue(profile);

    const req = {
      params: {
        profileId: '665f4f7e8b69fe10ef2ac666',
      },
      body: {
        action: 'approve',
      },
      user: {
        role: 'admin',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(profile.verificationStatus).toBe('verified');
    expect(profile.profileStatus).toBe('approved');
    expect(save).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
