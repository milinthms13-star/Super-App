import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import YearlyView from '../../views/YearlyView';

describe('YearlyView', () => {
  const mockProps = {
    yearlyHoroscopeContent: {
      overview: 'This year brings great opportunities for growth.',
      monthlyPredictions: [
        { month: 'January', prediction: 'Start with clarity and planning.' },
        { month: 'February', prediction: 'Focus on relationships.' },
      ],
      careerOutlook: 'Career prospects are excellent this year.',
      loveOutlook: 'Romance flourishes in the second half.',
      financeOutlook: 'Financial stability improves gradually.',
      healthOutlook: 'Maintain a balanced lifestyle.',
    },
    downloadingHoroscopePeriod: null,
    onDownloadHoroscope: jest.fn(),
    language: 'en',
  };

  it('should render yearly horoscope overview', () => {
    render(<YearlyView {...mockProps} />);

    expect(screen.getByText(/This year brings great opportunities/i)).toBeInTheDocument();
  });

  it('should render monthly predictions', () => {
    render(<YearlyView {...mockProps} />);

    expect(screen.getByText(/January/i)).toBeInTheDocument();
    expect(screen.getByText(/Start with clarity and planning/i)).toBeInTheDocument();
    expect(screen.getByText(/February/i)).toBeInTheDocument();
  });

  it('should render life area outlooks', () => {
    render(<YearlyView {...mockProps} />);

    expect(screen.getByText(/Career prospects are excellent/i)).toBeInTheDocument();
    expect(screen.getByText(/Romance flourishes/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial stability improves/i)).toBeInTheDocument();
    expect(screen.getByText(/Maintain a balanced lifestyle/i)).toBeInTheDocument();
  });

  it('should show download button', () => {
    render(<YearlyView {...mockProps} />);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('should call onDownloadHoroscope when download button clicked', () => {
    render(<YearlyView {...mockProps} />);

    const downloadButton = screen.getByRole('button', { name: /download/i });
    fireEvent.click(downloadButton);

    expect(mockProps.onDownloadHoroscope).toHaveBeenCalledWith('yearly');
  });

  it('should disable download button when downloading', () => {
    const propsWithDownloading = {
      ...mockProps,
      downloadingHoroscopePeriod: 'yearly',
    };

    render(<YearlyView {...propsWithDownloading} />);

    const downloadButton = screen.getByRole('button', { name: /downloading/i });
    expect(downloadButton).toBeDisabled();
  });

  it('should render empty state when no content', () => {
    const propsWithoutContent = {
      ...mockProps,
      yearlyHoroscopeContent: null,
    };

    render(<YearlyView {...propsWithoutContent} />);

    expect(screen.getByText(/generate your yearly horoscope/i)).toBeInTheDocument();
  });

  it('should render Malayalam labels when language is ml', () => {
    const propsWithMalayalam = {
      ...mockProps,
      language: 'ml',
    };

    render(<YearlyView {...propsWithMalayalam} />);

    // Should contain Malayalam text
    expect(screen.getByText(/വാർഷിക/i)).toBeInTheDocument();
  });
});
