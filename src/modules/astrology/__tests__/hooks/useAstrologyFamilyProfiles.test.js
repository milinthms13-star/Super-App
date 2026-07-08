import { renderHook, act } from '@testing-library/react';
import { useAstrologyFamilyProfiles } from '../../hooks/useAstrologyFamilyProfiles';
import { astrologyService } from '../../../../services/astrologyService';

jest.mock('../../../../services/astrologyService');

describe('useAstrologyFamilyProfiles', () => {
  const mockProfile = {
    userId: 'user123',
    familyProfiles: [
      {
        id: 'profile1',
        name: 'John Doe',
        relation: 'Spouse',
        sign: 'taurus',
        birthDate: '1992-05-15',
        birthTime: '08:00 AM',
      },
      {
        id: 'profile2',
        name: 'Jane Doe',
        relation: 'Daughter',
        sign: 'leo',
        birthDate: '2015-08-20',
        birthTime: '02:30 PM',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    astrologyService.getProfile = jest.fn().mockResolvedValue(mockProfile);
  });

  it('should initialize with empty profiles', () => {
    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    expect(result.current.profiles).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should load family profiles from service', async () => {
    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    expect(result.current.profiles).toHaveLength(2);
    expect(result.current.profiles[0].name).toBe('John Doe');
  });

  it('should add new family profile', async () => {
    const newProfile = {
      name: 'New Member',
      relation: 'Sibling',
      sign: 'gemini',
      birthDate: '1988-03-10',
      birthTime: '10:00 AM',
    };

    astrologyService.updateProfile = jest.fn().mockResolvedValue({
      ...mockProfile,
      familyProfiles: [...mockProfile.familyProfiles, { ...newProfile, id: 'profile3' }],
    });

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    await act(async () => {
      await result.current.addProfile(newProfile);
    });

    expect(result.current.profiles).toHaveLength(3);
    expect(result.current.profiles[2].name).toBe('New Member');
  });

  it('should edit existing family profile', async () => {
    const updatedProfile = {
      id: 'profile1',
      name: 'John Updated',
      relation: 'Spouse',
      sign: 'taurus',
      birthDate: '1992-05-15',
      birthTime: '09:00 AM',
    };

    astrologyService.updateProfile = jest.fn().mockResolvedValue({
      ...mockProfile,
      familyProfiles: [updatedProfile, mockProfile.familyProfiles[1]],
    });

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    await act(async () => {
      await result.current.editProfile('profile1', updatedProfile);
    });

    expect(result.current.profiles[0].name).toBe('John Updated');
    expect(result.current.profiles[0].birthTime).toBe('09:00 AM');
  });

  it('should delete family profile', async () => {
    astrologyService.updateProfile = jest.fn().mockResolvedValue({
      ...mockProfile,
      familyProfiles: [mockProfile.familyProfiles[1]],
    });

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    await act(async () => {
      await result.current.deleteProfile('profile1');
    });

    expect(result.current.profiles).toHaveLength(1);
    expect(result.current.profiles[0].id).toBe('profile2');
  });

  it('should duplicate family profile', async () => {
    astrologyService.updateProfile = jest.fn().mockResolvedValue({
      ...mockProfile,
      familyProfiles: [
        ...mockProfile.familyProfiles,
        { ...mockProfile.familyProfiles[0], id: 'profile3', name: 'John Doe (Copy)' },
      ],
    });

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    await act(async () => {
      await result.current.duplicateProfile('profile1');
    });

    expect(result.current.profiles).toHaveLength(3);
    expect(result.current.profiles[2].name).toContain('Copy');
  });

  it('should generate Kundli for family member', async () => {
    const mockKundli = {
      birthChart: { ascendant: 'Vrishabha', sun: 'Taurus' },
      dasha: { current: 'Venus' },
    };

    astrologyService.getKundliData = jest.fn().mockResolvedValue(mockKundli);

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    let kundli;
    await act(async () => {
      kundli = await result.current.generateKundli('profile1');
    });

    expect(kundli.birthChart.sun).toBe('Taurus');
    expect(astrologyService.getKundliData).toHaveBeenCalledWith(
      expect.objectContaining({ sign: 'taurus' })
    );
  });

  it('should check compatibility between family members', async () => {
    const mockCompatibility = {
      score: 82,
      summary: 'Good compatibility',
    };

    astrologyService.getCompatibility = jest.fn().mockResolvedValue(mockCompatibility);

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.loadProfiles();
    });

    let compatibility;
    await act(async () => {
      compatibility = await result.current.checkCompatibility('profile1', 'profile2');
    });

    expect(compatibility.score).toBe(82);
    expect(astrologyService.getCompatibility).toHaveBeenCalledWith('taurus', 'leo');
  });

  it('should handle errors when adding profile', async () => {
    astrologyService.updateProfile = jest.fn().mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    await act(async () => {
      await result.current.addProfile({ name: 'Test' });
    });

    expect(result.current.error).toBe('Update failed');
  });

  it('should handle loading state', async () => {
    let resolveLoad;
    const loadPromise = new Promise((resolve) => {
      resolveLoad = resolve;
    });

    astrologyService.getProfile = jest.fn().mockReturnValue(loadPromise);

    const { result } = renderHook(() => useAstrologyFamilyProfiles());

    act(() => {
      result.current.loadProfiles();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveLoad(mockProfile);
      await loadPromise;
    });

    expect(result.current.loading).toBe(false);
  });
});
