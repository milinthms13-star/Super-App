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

jest.mock('../utils/subscriptionService', () => ({
  hasEntitlement: jest.fn(),
  consumeEntitlement: jest.fn(),
}));

const MatrimonialProfile = require('../models/MatrimonialProfile');
const User = require('../models/User');
const subscriptionService = require('../utils/subscriptionService');
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
    subscriptionService.hasEntitlement.mockResolvedValue(true);
    subscriptionService.consumeEntitlement.mockResolvedValue({});
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

  test('profile save resets verified profiles to changes requested when core details change', async () => {
    const handler = getRouteHandler('put', '/profile');
    const existingProfile = {
      photoUrl: '/uploads/matrimonial/existing-photo.jpg',
      name: 'Arun Menon',
      email: 'arun@example.com',
      phone: '9876543210',
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
      bio: 'Original bio',
      verificationStatus: 'verified',
      profileStatus: 'approved',
      preferences: {
        religion: 'Any',
      },
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
      _id: '665f4f7e8b69fe10ef2ac334',
      userId: 'user-123',
      ...existingProfile,
      bio: 'Updated bio',
      verificationStatus: 'pending',
      profileStatus: 'changes_requested',
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
        bio: 'Updated bio',
        languages: 'Malayalam',
        hobbies: 'Travel',
        hidePhone: 'true',
        preferences: JSON.stringify({
          ageMin: 26,
          profession: 'Doctor',
        }),
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

    const updatePayload = MatrimonialProfile.findOneAndUpdate.mock.calls[0][1].$set;
    expect(updatePayload.profileStatus).toBe('changes_requested');
    expect(updatePayload.verificationStatus).toBe('pending');
    expect(updatePayload.privacy).toMatchObject({
      hidePhone: true,
      hidePhotos: false,
      premiumOnlyContact: false,
    });
    expect(updatePayload.preferences).toMatchObject({
      ageMin: 26,
      profession: 'Doctor',
      religion: 'Any',
    });
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

  test('search strips protected contact details for free viewers and allows opting out of verified-only mode', async () => {
    const handler = getRouteHandler('get', '/search');
    const currentProfileId = '665f4f7e8b69fe10ef2ac777';
    const privateProfileId = '665f4f7e8b69fe10ef2ac888';
    const findChain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        {
          _id: privateProfileId,
          name: 'Private Member',
          phone: '9876543210',
          photoUrl: '/uploads/matrimonial/private-member.jpg',
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
          privacy: {
            hidePhone: false,
            hidePhotos: true,
            premiumOnlyContact: true,
          },
          verificationStatus: 'pending',
          profileStatus: 'approved',
          profileViews: 11,
          lastActive: new Date('2026-05-07T00:00:00.000Z'),
        },
      ]),
    };

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: currentProfileId,
      blockedBy: [],
      premiumUntil: null,
    });
    MatrimonialProfile.find.mockReturnValue(findChain);

    const req = {
      query: {
        verifiedOnly: 'false',
        limit: '999',
      },
      user: {
        _id: 'user-123',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    const query = MatrimonialProfile.find.mock.calls[0][0];
    expect(query.verificationStatus).toBeUndefined();
    expect(findChain.limit).toHaveBeenCalledWith(200);
    expect(res.statusCode).toBe(200);
    expect(res.body.data[0]).toMatchObject({
      id: privateProfileId,
      phone: '',
      photoUrl: '',
      contactVisibility: 'premium_required',
    });
  });

  test('sending a message is forbidden until an interest has been accepted', async () => {
    const handler = getRouteHandler('post', '/messages');
    const currentSave = jest.fn();
    const targetSave = jest.fn();

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: '665f4f7e8b69fe10ef2ac889',
      userId: 'user-123',
      messages: [],
      save: currentSave,
    });
    MatrimonialProfile.findById.mockResolvedValue({
      _id: '665f4f7e8b69fe10ef2ac890',
      userId: 'user-456',
      messages: [],
      save: targetSave,
    });
    MatrimonialProfile.exists.mockResolvedValue(false);

    const req = {
      body: {
        toProfileId: '665f4f7e8b69fe10ef2ac890',
        content: 'Hello there',
      },
      user: {
        _id: 'user-123',
        email: 'member@example.com',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(MatrimonialProfile.exists).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Messages are available only after an accepted interest');
    expect(currentSave).not.toHaveBeenCalled();
    expect(targetSave).not.toHaveBeenCalled();
  });

  test('sending a message is forbidden when subscription entitlement is missing', async () => {
    const handler = getRouteHandler('post', '/messages');
    subscriptionService.hasEntitlement.mockResolvedValue(false);

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: '665f4f7e8b69fe10ef2ac889',
      userId: 'user-123',
      messages: [],
      save: jest.fn(),
    });
    MatrimonialProfile.findById.mockResolvedValue({
      _id: '665f4f7e8b69fe10ef2ac890',
      userId: 'user-456',
      messages: [],
      save: jest.fn(),
    });

    const req = {
      body: {
        toProfileId: '665f4f7e8b69fe10ef2ac890',
        content: 'Hello there',
      },
      user: {
        _id: 'user-123',
        email: 'member@example.com',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Direct messaging requires an active paid subscription');
  });

  test('reporting a profile records a sanitized open moderation report', async () => {
    const handler = getRouteHandler('post', '/profiles/:profileId/report');
    const save = jest.fn().mockResolvedValue(undefined);
    const currentProfileId = '665f4f7e8b69fe10ef2ac891';
    const targetProfile = {
      _id: '665f4f7e8b69fe10ef2ac892',
      reports: [],
      save,
    };

    MatrimonialProfile.findOne.mockResolvedValue({
      _id: currentProfileId,
    });
    MatrimonialProfile.findById.mockResolvedValue(targetProfile);

    const req = {
      params: {
        profileId: '665f4f7e8b69fe10ef2ac892',
      },
      body: {
        reason: '<script>alert(1)</script>Fraudulent profile',
      },
      user: {
        _id: 'user-123',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(targetProfile.reports).toHaveLength(1);
    expect(targetProfile.reports[0]).toMatchObject({
      reporterId: currentProfileId,
      reason: 'alert(1)Fraudulent profile',
      status: 'open',
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Profile reported successfully');
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
