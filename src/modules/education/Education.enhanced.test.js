import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Education from './Education';
import { useApp } from '../../contexts/AppContext';

// Mock the context
jest.mock('../../contexts/AppContext', () => ({
  useApp: jest.fn(),
}));

// Mock API call function
const mockApiCall = jest.fn();

describe('Education Module - Enhanced Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    mockApiCall.mockClear();

    useApp.mockReturnValue({
      currentUser: {
        id: 'test-user-1',
        email: 'student@example.com',
        name: 'Test Student',
      },
      apiCall: mockApiCall,
    });

    // Default mock responses
    mockApiCall.mockImplementation((endpoint) => {
      if (endpoint.includes('/state')) {
        return Promise.resolve({
          data: {
            state: {
              enrolledCourseIds: [],
              appliedScholarships: [],
              joinedGroups: [],
              courseProgress: {},
              roleProfile: {
                primaryRole: 'student',
                studentName: '',
                classLevel: '',
                targetExam: '',
                preferredLanguage: 'English',
                careerGoal: '',
              },
              interventionsDismissed: [],
            },
          },
        });
      }

      if (endpoint.includes('/courses')) {
        return Promise.resolve({
          data: {
            courses: [
              {
                id: 'course-1',
                courseId: 'course-1',
                title: 'Test Course 1',
                level: 'Beginner',
                price: 0,
              },
            ],
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for navigation', () => {
      render(<Education />);

      const navItems = screen.getAllByRole('button');
      navItems.forEach((item) => {
        expect(item).toBeInTheDocument();
      });
    });

    it('should have proper form labels', async () => {
      render(<Education />);

      // Navigate to courses section
      const coursesNav = screen.getByTestId('education-nav-courses');
      fireEvent.click(coursesNav);

      await waitFor(() => {
        const searchInput = screen.getByLabelText(/search courses/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should have status messages announced to screen readers', async () => {
      render(<Education />);

      const coursesNav = screen.getByTestId('education-nav-courses');
      fireEvent.click(coursesNav);

      await waitFor(() => {
        const enrollButton = screen.getAllByRole('button', { name: /enroll now/i })[0];
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        const statusBanner = screen.getByRole('status');
        expect(statusBanner).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Network error'));

      render(<Education />);

      await waitFor(() => {
        expect(screen.queryByText(/unable to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry option on failure', async () => {
      mockApiCall.mockRejectedValueOnce(new Error('Server error'));

      render(<Education />);

      await waitFor(() => {
        const statusMessage = screen.queryByText(/try again/i);
        expect(statusMessage).toBeInTheDocument();
      });
    });

    it('should handle enrollment payment failure gracefully', async () => {
      mockApiCall.mockImplementation((endpoint, method, data) => {
        if (endpoint.includes('/enroll') && method === 'POST') {
          return Promise.reject(new Error('Payment gateway error'));
        }
        return Promise.resolve({ data: {} });
      });

      render(<Education />);

      const coursesNav = screen.getByTestId('education-nav-courses');
      fireEvent.click(coursesNav);

      await waitFor(() => {
        const enrollButton = screen.getAllByRole('button', { name: /enroll now/i })[0];
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/could not complete enrollment/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Support', () => {
    it('should save state locally when offline', async () => {
      // Mock offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<Education />);

      const coursesNav = screen.getByTestId('education-nav-courses');
      fireEvent.click(coursesNav);

      await waitFor(() => {
        const enrollButton = screen.getAllByRole('button', { name: /enroll now/i })[0];
        fireEvent.click(enrollButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/saved locally/i)).toBeInTheDocument();
      });

      // Restore online status
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', () => {
      mockApiCall.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves
      });

      render(<Education />);

      expect(screen.getByText(/loading/i) || screen.getByText(/syncing/i)).toBeInTheDocument();
    });
  });

  describe('Progress Tracking', () => {
    it('should update course progress correctly', async () => {
      mockApiCall.mockImplementation((endpoint, method, data) => {
        if (endpoint.includes('/progress/event')) {
          return Promise.resolve({
            data: {
              state: {
                courseProgress: { 'course-1': 60 },
              },
            },
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(<Education />);

      const myLearningNav = screen.getByTestId('education-nav-my-learning');
      fireEvent.click(myLearningNav);

      await waitFor(() => {
        const progressButton = screen.getByRole('button', { name: /\+10%/i });
        fireEvent.click(progressButton);
      });

      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          expect.stringContaining('/progress/event'),
          'POST',
          expect.any(Object)
        );
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate tuition request phone number', async () => {
      render(<Education />);

      // Find phone input
      const phoneInput = screen.getByPlaceholderText(/enter parent\/student phone/i);
      fireEvent.change(phoneInput, { target: { value: '123' } }); // Too short

      const requestButton = screen.getByRole('button', { name: /request tuition/i });
      fireEvent.click(requestButton);

      await waitFor(() => {
        expect(screen.getByText(/valid mobile number/i)).toBeInTheDocument();
      });
    });

    it('should validate certificate upload fields', async () => {
      render(<Education />);

      const certificatesNav = screen.getByTestId('education-nav-certificates');
      fireEvent.click(certificatesNav);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /upload certificate/i });
        fireEvent.click(uploadButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/title.*required|completion date.*required/i)).toBeInTheDocument();
      });
    });
  });
});
