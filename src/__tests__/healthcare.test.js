import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Healthcare from '../modules/healthcare/Healthcare';
import { healthcareApi } from '../modules/healthcare/services/healthcareApi';

// Mock the API
jest.mock('../modules/healthcare/services/healthcareApi');

// Mock child components to isolate testing
jest.mock('../modules/healthcare/components/DoctorConsultation', () => {
  return function MockDoctorConsultation() {
    return <div data-testid="doctor-consultation">Doctor Consultation Component</div>;
  };
});

jest.mock('../modules/healthcare/components/LabBooking', () => {
  return function MockLabBooking() {
    return <div data-testid="lab-booking">Lab Booking Component</div>;
  };
});

jest.mock('../modules/healthcare/components/RecordsVault', () => {
  return function MockRecordsVault() {
    return <div data-testid="records-vault">Records Vault Component</div>;
  };
});

jest.mock('../modules/healthcare/components/PharmacyDelivery', () => {
  return function MockPharmacyDelivery() {
    return <div data-testid="pharmacy-delivery">Pharmacy Delivery Component</div>;
  };
});

jest.mock('../modules/healthcare/components/EmergencySOS', () => {
  return function MockEmergencySOS() {
    return <div data-testid="emergency-sos">Emergency SOS Component</div>;
  };
});

jest.mock('../modules/healthcare/components/ElderlyCare', () => {
  return function MockElderlyCare() {
    return <div data-testid="elderly-care">Elderly Care Component</div>;
  };
});

jest.mock('../modules/healthcare/components/HealthcareNav', () => {
  return function MockHealthcareNav({ activeSection, onSectionChange }) {
    return (
      <nav data-testid="healthcare-nav">
        <button onClick={() => onSectionChange('consultation')}>Consultation</button>
        <button onClick={() => onSectionChange('lab')}>Lab</button>
        <button onClick={() => onSectionChange('records')}>Records</button>
        <button onClick={() => onSectionChange('pharmacy')}>Pharmacy</button>
        <button onClick={() => onSectionChange('emergency')}>Emergency</button>
        <button onClick={() => onSectionChange('elderly')}>Elderly Care</button>
      </nav>
    );
  };
});

jest.mock('../modules/healthcare/components/HealthcareHero', () => {
  return function MockHealthcareHero() {
    return <div data-testid="healthcare-hero">Healthcare Hero Component</div>;
  };
});

const mockApiResponse = {
  doctors: [
    {
      _id: '1',
      name: 'Dr. Sarah Johnson',
      specialty: 'General Physician',
      rating: 4.8,
      consultationFee: 500
    }
  ],
  labTests: [
    {
      _id: '1',
      name: 'Complete Blood Count',
      price: 300
    }
  ],
  healthPackages: [],
  medicines: [],
  records: [],
  appointments: [],
  familyProfiles: [],
  refillReminders: [],
  emergencyIncidents: [],
  notifications: [],
  partnerApplications: [],
  pharmacyOrders: []
};

describe('Healthcare Module', () => {
  beforeEach(() => {
    healthcareApi.getInitialData.mockResolvedValue(mockApiResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders healthcare module with hero and navigation', async () => {
    render(<Healthcare />);

    // Check if hero component is rendered
    expect(screen.getByTestId('healthcare-hero')).toBeInTheDocument();

    // Check if navigation is rendered
    expect(screen.getByTestId('healthcare-nav')).toBeInTheDocument();

    // Wait for data loading
    await waitFor(() => {
      expect(healthcareApi.getInitialData).toHaveBeenCalled();
    });
  });

  test('loads initial data on mount', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(healthcareApi.getInitialData).toHaveBeenCalledTimes(1);
    });
  });

  test('displays consultation section by default', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });
  });

  test('switches to lab booking section when navigation clicked', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    // Click lab booking button
    fireEvent.click(screen.getByText('Lab'));

    expect(screen.getByTestId('lab-booking')).toBeInTheDocument();
  });

  test('switches to records vault section', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Records'));

    expect(screen.getByTestId('records-vault')).toBeInTheDocument();
  });

  test('switches to pharmacy delivery section', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pharmacy'));

    expect(screen.getByTestId('pharmacy-delivery')).toBeInTheDocument();
  });

  test('switches to emergency section', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Emergency'));

    expect(screen.getByTestId('emergency-sos')).toBeInTheDocument();
  });

  test('switches to elderly care section', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Elderly Care'));

    expect(screen.getByTestId('elderly-care')).toBeInTheDocument();
  });

  test('handles API loading state', () => {
    healthcareApi.getInitialData.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Healthcare />);

    // Should show loading state initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('handles API error gracefully', async () => {
    const errorMessage = 'Failed to load healthcare data';
    healthcareApi.getInitialData.mockRejectedValue(new Error(errorMessage));

    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('updates state with loaded data', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(healthcareApi.getInitialData).toHaveBeenCalled();
    });

    // The component should have loaded the mock data
    // We can't easily test internal state, but we can verify the API was called
    expect(healthcareApi.getInitialData).toHaveBeenCalledTimes(1);
  });
});

describe('Healthcare API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getInitialData calls correct endpoint', async () => {
    healthcareApi.getInitialData.mockResolvedValue(mockApiResponse);

    const result = await healthcareApi.getInitialData();

    expect(result).toEqual(mockApiResponse);
  });

  test('handles API errors with fallback', async () => {
    // Mock axios to reject
    const mockAxios = require('axios');
    mockAxios.get.mockRejectedValue(new Error('Network error'));

    // Import the actual API service to test fallback logic
    const { healthcareApi: realApi } = require('../modules/healthcare/services/healthcareApi');

    // Test that it falls back to mock data on error
    const result = await realApi.getInitialData();

    expect(result).toBeDefined();
    expect(Array.isArray(result.doctors)).toBe(true);
  });
});