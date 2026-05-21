const shared = require('./freelancer/shared');

describe('freelancer shared workflow guards', () => {
  test('allows valid booking transitions', () => {
    const { canTransitionBookingStatus } = shared.helpers;
    expect(canTransitionBookingStatus('requested', 'provider_assigned')).toBe(true);
    expect(canTransitionBookingStatus('provider_assigned', 'otp_pending')).toBe(true);
    expect(canTransitionBookingStatus('work_in_progress', 'completed')).toBe(true);
  });

  test('blocks invalid booking transitions', () => {
    const { canTransitionBookingStatus } = shared.helpers;
    expect(canTransitionBookingStatus('requested', 'completed')).toBe(false);
    expect(canTransitionBookingStatus('cancelled', 'work_in_progress')).toBe(false);
  });

  test('derives capabilities from role context', () => {
    const { deriveFreelancerCapabilities } = shared.helpers;
    const admin = deriveFreelancerCapabilities({ role: 'admin' });
    const provider = deriveFreelancerCapabilities({ role: 'provider' });
    const customer = deriveFreelancerCapabilities({ role: 'user' });

    expect(admin.canResolveDisputes).toBe(true);
    expect(provider.canBid).toBe(true);
    expect(provider.canBook).toBe(false);
    expect(customer.canBook).toBe(true);
    expect(customer.canBid).toBe(false);
  });
});
