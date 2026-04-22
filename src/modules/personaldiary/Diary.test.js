import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Diary from './Diary';

// Mock services
jest.mock('../../services/diaryService', () => ({
  fetchDiaryEntries: jest.fn(),
  createDiaryEntry: jest.fn(),
  fetchTags: jest.fn(),
  fetchMoodStats: jest.fn(),
}));

const mockEntries = [
  {
    _id: '1',
    title: 'Test Entry',
    content: 'Test content',
    mood: 'happy',
    category: 'Personal',
  },
];

describe('Diary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders diary page with new entry button', () => {
    render(<Diary />);
    expect(screen.getByText('My Diary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new entry/i })).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<Diary />);
    expect(screen.getByText('Loading your entries...')).toBeInTheDocument();
  });

  test('displays empty state when no entries', async () => {
    render(<Diary />);
    await waitFor(() => {
      expect(screen.getByText('No entries found')).toBeInTheDocument();
    });
  });

  test('filters entries by category', async () => {
    render(<Diary />);
    // Simulate loaded entries
    // Additional filter test logic
    fireEvent.click(screen.getByText('Work'));
    // Expect filtered results
  });

  test('switches view modes', () => {
    render(<Diary />);
    fireEvent.click(screen.getByText('Calendar'));
    expect(screen.getByText('Sun')).toBeInTheDocument(); // Calendar header
  });
});

describe('DiaryEditor', () => {
  test('DiaryEditor form validation', () => {
    const mockOnSave = jest.fn();
    const { getByLabelText, getByRole } = render(
      <DiaryEditor onSave={mockOnSave} onClose={() => {}} />
    );
    
    fireEvent.click(getByRole('button', { name: /save entry/i }));
    expect(getByText('Title is required')).toBeInTheDocument();
  });
});

