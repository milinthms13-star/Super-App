const voiceCallService = require('./voiceCallService');

describe('VoiceCallService', () => {
  test('maps provider call statuses into reminder-safe internal statuses', () => {
    expect(voiceCallService.normalizeProviderCallStatus('queued')).toBe('ringing');
    expect(voiceCallService.normalizeProviderCallStatus('in-progress')).toBe('ringing');
    expect(voiceCallService.normalizeProviderCallStatus('busy')).toBe('failed');
    expect(voiceCallService.normalizeProviderCallStatus('completed')).toBe('completed');
    expect(voiceCallService.normalizeProviderCallStatus('no-answer')).toBe('no-answer');
  });
});
