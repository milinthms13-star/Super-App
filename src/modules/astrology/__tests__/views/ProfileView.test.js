import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileView from '../../views/ProfileView';
import { astrologyService } from '../../../../services/astrologyService';

jest.mock('../../../../services/astrologyService');

const mockProfile = {
  sign: 'aries',
  birthDate: '1990-01-01',
  birthTime: '10:30 AM',
  birthPlace: 'Mumbai',
  birthTimezone: 'Asia/Kolkata',
  nakshatra: 'Ashwini',
  rashi: 'Mesha',
  lagna: 'Mesha',
  gender: 'male',
  preferences: {
    receiveDailyHoroscope: true,
    favoriteTopics: ['career', 'finance'],
  },
  notifications: {
    dailyHoroscope: true,
    goodMuhurtam: true,
    festivalReminders: true,
    dashaAlerts: true,
  },
};

const mockOnUpdate = jest.fn();

describe('ProfileView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render profile form with data', () => {
    render(<ProfileView profile={mockProfile} onUpdate={mockOnUpdate} />);

    expect(screen.getByDisplayValue('1990-01-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:30 AM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mumbai')).toBeInTheDocument();
  });

  it('should update profile on form submission', async () => {
    astrologyService.updateProfile = jest.fn().mockResolvedValue({
      ...mockProfile,
      birthPlace: 'Delhi',
    });

    render(<ProfileView profile={mockProfile} onUpdate={mockOnUpdate} />);

    const birthPlaceInput = screen.getByDisplayValue('Mumbai');
    fireEvent.change(birthPlaceInput, { target: { value: 'Delhi' } });

    const submitButton = screen.getByRole('button', { name: /save|update/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(astrologyService.updateProfile).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should handle notification preference changes', () => {
    render(<ProfileView profile={mockProfile} onUpdate={mockOnUpdate} />);

    const dailyHoroscopeCheckbox = screen.getByRole('checkbox', { name: /daily horoscope/i });
    expect(dailyHoroscopeCheckbox).toBeChecked();

    fireEvent.click(dailyHoroscopeCheckbox);
    expect(dailyHoroscopeCheckbox).not.toBeChecked();
  });

  it('should show error message on update failure', async () => {
    astrologyService.updateProfile = jest.fn().mockRejectedValue(
      new Error('Update failed')
    );

    render(<ProfileView profile={mockProfile} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole('button', { name: /save|update/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    render(<ProfileView profile={{}} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole('button', { name: /save|update/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });
  });
});
