jest.mock('../models/ReferralProgram', () => ({
  findOne: jest.fn(),
}));

jest.mock('../models/Wallet', () => {
  const Wallet = jest.fn(function Wallet(data) {
    Object.assign(this, {
      balance: 0,
      transactions: [],
      save: jest.fn().mockResolvedValue(undefined),
    }, data);
  });
  Wallet.findOne = jest.fn();
  return Wallet;
});

jest.mock('../models/User', () => ({}));

const ReferralProgram = require('../models/ReferralProgram');
const Wallet = require('../models/Wallet');
const referralProgramRouter = require('./referralprogram');

describe('referral program route helpers', () => {
  const getRouteHandler = (method, path) => {
    const layer = referralProgramRouter.stack.find(
      (entry) => entry.route?.path === path && entry.route?.methods?.[method]
    );

    return layer.route.stack[layer.route.stack.length - 1].handle;
  };

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not credit the wallet twice for the same referred user', async () => {
    const handler = getRouteHandler('post', '/track-referral');
    const walletSave = jest.fn().mockResolvedValue(undefined);
    const referralSave = jest.fn().mockResolvedValue(undefined);
    const wallet = {
      userEmail: 'owner@example.com',
      userName: 'Owner',
      balance: 100,
      transactions: [],
      save: walletSave,
    };
    const referral = {
      referrerEmail: 'owner@example.com',
      referrerName: 'Owner',
      referralCode: 'REFCODE1',
      rewardAmount: 100,
      tierBenefits: { rewardPercentage: 5 },
      totalRewardsEarned: 0,
      referredUsers: [
        {
          email: 'friend@example.com',
          name: 'Friend',
          signedUpAt: new Date('2026-05-01T00:00:00.000Z'),
          conversionStatus: 'Converted',
          rewardStatus: 'Credited',
        },
      ],
      save: referralSave,
    };

    ReferralProgram.findOne.mockResolvedValue(referral);
    Wallet.findOne.mockResolvedValue(wallet);

    const req = {
      body: {
        referralCode: 'refcode1',
        newUserEmail: 'friend@example.com',
        newUserName: 'Friend Again',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Referral already tracked');
    expect(wallet.balance).toBe(100);
    expect(wallet.transactions).toHaveLength(0);
    expect(walletSave).not.toHaveBeenCalled();
    expect(referral.referredUsers[0].rewardStatus).toBe('Credited');
    expect(referralSave).toHaveBeenCalledTimes(1);
  });

  test('credits the correct referred user entry when converting an existing referral', async () => {
    const handler = getRouteHandler('post', '/track-referral');
    const walletSave = jest.fn().mockResolvedValue(undefined);
    const referralSave = jest.fn().mockResolvedValue(undefined);
    const wallet = {
      userEmail: 'owner@example.com',
      userName: 'Owner',
      balance: 0,
      transactions: [],
      save: walletSave,
    };
    const referral = {
      referrerEmail: 'owner@example.com',
      referrerName: 'Owner',
      referralCode: 'REFCODE2',
      rewardAmount: 100,
      tierBenefits: { rewardPercentage: 5 },
      totalRewardsEarned: 0,
      referredUsers: [
        {
          email: 'existing@example.com',
          name: 'Existing',
          conversionStatus: 'Pending',
          rewardStatus: 'Pending',
        },
        {
          email: 'later@example.com',
          name: 'Later',
          conversionStatus: 'Pending',
          rewardStatus: 'Pending',
        },
      ],
      save: referralSave,
    };

    ReferralProgram.findOne.mockResolvedValue(referral);
    Wallet.findOne.mockResolvedValue(wallet);

    const req = {
      body: {
        referralCode: 'REFCODE2',
        newUserEmail: 'existing@example.com',
        newUserName: 'Existing Customer',
      },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(referral.referredUsers[0].conversionStatus).toBe('Converted');
    expect(referral.referredUsers[0].rewardStatus).toBe('Credited');
    expect(referral.referredUsers[1].rewardStatus).toBe('Pending');
    expect(wallet.balance).toBe(105);
    expect(wallet.transactions).toHaveLength(1);
    expect(walletSave).toHaveBeenCalledTimes(1);
    expect(referralSave).toHaveBeenCalledTimes(1);
  });

  test('returns a zero-safe conversion rate for empty referral stats', async () => {
    const handler = getRouteHandler('get', '/statistics');
    ReferralProgram.findOne.mockResolvedValue({
      totalReferrals: 0,
      successfulReferrals: 0,
      totalRewardsEarned: 0,
      tier: 'Bronze',
      referredUsers: [],
    });

    const req = {
      user: { email: 'owner@example.com' },
    };
    const res = createMockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.conversionRate).toBe('0.00');
  });
});
