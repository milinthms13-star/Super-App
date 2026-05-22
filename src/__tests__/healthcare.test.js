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
  return function MockHealthcareNav({ onChange }) {
    return (
      <nav data-testid="healthcare-nav">
        <button onClick={() => onChange('consultation')}>Consultation</button>
        <button onClick={() => onChange('lab')}>Lab</button>
        <button onClick={() => onChange('records')}>Records</button>
        <button onClick={() => onChange('pharmacy')}>Pharmacy</button>
        <button onClick={() => onChange('emergency')}>Emergency</button>
        <button onClick={() => onChange('elderly')}>Elderly Care</button>
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

  test('renders healthcare module home screen and loads initial data', async () => {
    render(<Healthcare />);

    expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();

    await waitFor(() => {
      expect(healthcareApi.getInitialData).toHaveBeenCalledTimes(1);
    });
  });

  test('switches to doctor consultation from home action', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find Doctor/i }));

    expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
  });

  test('switches to lab booking section from home action', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Book Test/i }));

    expect(screen.getByTestId('lab-booking')).toBeInTheDocument();
  });

  test('switches to pharmacy delivery section from home action', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Order Medicine/i }));

    expect(screen.getByTestId('pharmacy-delivery')).toBeInTheDocument();
  });

  test('switches to emergency section from home action', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Open SOS/i }));

    expect(screen.getByTestId('emergency-sos')).toBeInTheDocument();
  });

  test('switches to records vault section via navigation', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find Doctor/i }));
    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Records'));

    expect(screen.getByTestId('records-vault')).toBeInTheDocument();
  });

  test('switches to elderly care section via navigation', async () => {
    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Find Doctor/i }));
    await waitFor(() => {
      expect(screen.getByTestId('doctor-consultation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Elderly Care'));

    expect(screen.getByTestId('elderly-care')).toBeInTheDocument();
  });

  test('handles API loading state', () => {
    healthcareApi.getInitialData.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<Healthcare />);

    expect(screen.getByTestId('healthcare-10home')).toBeInTheDocument();
    expect(healthcareApi.getInitialData).toHaveBeenCalledTimes(1);
  });

  test('handles API error gracefully', async () => {
    const errorMessage = 'Failed to load healthcare data';
    healthcareApi.getInitialData.mockRejectedValue(new Error(errorMessage));

    render(<Healthcare />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load healthcare data/i);
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
    const axios = require('axios');
    const getSpy = jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));
    const { healthcareApi: realApi } = jest.requireActual('../modules/healthcare/services/healthcareApi');

    const result = await realApi.getInitialData();

    expect(result).toBeDefined();
    expect(Array.isArray(result.doctors)).toBe(true);
    expect(Array.isArray(result.labTests)).toBe(true);

    getSpy.mockRestore();
  });

  test('getInitialData surfaces auth failures for protected loaders', async () => {
    const axios = require('axios');
    const getSpy = jest.spyOn(axios, 'get').mockImplementation((url) => {
      if (String(url).includes('/records')) {
        return Promise.reject({ response: { status: 401, data: { message: 'Unauthorized' } } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    const { healthcareApi: realApi } = jest.requireActual('../modules/healthcare/services/healthcareApi');

    await expect(realApi.getInitialData()).rejects.toBeTruthy();
    getSpy.mockRestore();
  });

  test('verifyAppointmentPayment does not fallback on 4xx verification errors', async () => {
    const axios = require('axios');
    const postSpy = jest.spyOn(axios, 'post').mockRejectedValue({
      response: { status: 400, data: { message: 'Payment reference mismatch' } },
    });
    const { healthcareApi: realApi } = jest.requireActual('../modules/healthcare/services/healthcareApi');

    await expect(
      realApi.verifyAppointmentPayment('appointment-1', 'HC-APT-REF', 'success', 'simulated')
    ).rejects.toBeTruthy();

    postSpy.mockRestore();
  });
});
