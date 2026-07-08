import { renderHook, act } from '@testing-library/react';
import { useAstrologyNotifications } from '../../hooks/useAstrologyNotifications';
import { astrologyService } from '../../../../services/astrologyService';

jest.mock('../../../../services/astrologyService');

describe('useAstrologyNotifications', () => {
  const mockProfile = {
    userId: 'user123',
    notifications: {
      dailyHoroscope: true,
      goodMuhurtam: false,
      festivalReminders: true,
      dashaAlerts: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    astrologyService.getProfile = jest.fn().mockResolvedValue(mockProfile);
  });

  it('should initialize with default preferences', () => {
    const { result } = renderHook(() => useAstrologyNotifications());

    expect(result.current.preferences).toEqual({
      dailyHoroscope: false,
      goodMuhurtam: false,
      festivalReminders: false,
      dashaAlerts: false,
    });
    expect(result.current.loading).toBe(false);
  });

  it('should load notification preferences from profile', async () => {
    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.loadPreferences();
    });

    expect(result.current.preferences).toEqual({
      dailyHoroscope: true,
      goodMuhurtam: false,
      festivalReminders: true,
      dashaAlerts: true,
    });
  });

  it('should update notification preference', async () => {
    astrologyService.updateNotificationPreferences = jest.fn().mockResolvedValue({
      notifications: {
        dailyHoroscope: false,
        goodMuhurtam: true,
        festivalReminders: true,
        dashaAlerts: true,
      },
    });

    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.updatePreference('goodMuhurtam', true);
    });

    expect(astrologyService.updateNotificationPreferences).toHaveBeenCalledWith({
      goodMuhurtam: true,
    });
    expect(result.current.preferences.goodMuhurtam).toBe(true);
  });

  it('should toggle preference', async () => {
    astrologyService.updateNotificationPreferences = jest.fn().mockResolvedValue({
      notifications: {
        dailyHoroscope: false,
        goodMuhurtam: false,
        festivalReminders: false,
        dashaAlerts: false,
      },
    });

    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.loadPreferences();
    });

    await act(async () => {
      await result.current.togglePreference('dailyHoroscope');
    });

    expect(astrologyService.updateNotificationPreferences).toHaveBeenCalledWith({
      dailyHoroscope: false,
    });
  });

  it('should handle update errors', async () => {
    astrologyService.updateNotificationPreferences = jest.fn().mockRejectedValue(
      new Error('Update failed')
    );

    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.updatePreference('dailyHoroscope', true);
    });

    expect(result.current.error).toBe('Update failed');
  });

  it('should enable all notifications', async () => {
    astrologyService.updateNotificationPreferences = jest.fn().mockResolvedValue({
      notifications: {
        dailyHoroscope: true,
        goodMuhurtam: true,
        festivalReminders: true,
        dashaAlerts: true,
      },
    });

    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.enableAll();
    });

    expect(result.current.preferences).toEqual({
      dailyHoroscope: true,
      goodMuhurtam: true,
      festivalReminders: true,
      dashaAlerts: true,
    });
  });

  it('should disable all notifications', async () => {
    astrologyService.updateNotificationPreferences = jest.fn().mockResolvedValue({
      notifications: {
        dailyHoroscope: false,
        goodMuhurtam: false,
        festivalReminders: false,
        dashaAlerts: false,
      },
    });

    const { result } = renderHook(() => useAstrologyNotifications());

    await act(async () => {
      await result.current.disableAll();
    });

    expect(result.current.preferences).toEqual({
      dailyHoroscope: false,
      goodMuhurtam: false,
      festivalReminders: false,
      dashaAlerts: false,
    });
  });

  it('should show loading state during operations', async () => {
    let resolveUpdate;
    const updatePromise = new Promise((resolve) => {
      resolveUpdate = resolve;
    });

    astrologyService.updateNotificationPreferences = jest.fn().mockReturnValue(updatePromise);

    const { result } = renderHook(() => useAstrologyNotifications());

    act(() => {
      result.current.updatePreference('dailyHoroscope', true);
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveUpdate({ notifications: { dailyHoroscope: true } });
      await updatePromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
