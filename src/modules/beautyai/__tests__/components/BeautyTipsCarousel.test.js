import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeautyTipsCarousel from '../../components/BeautyTipsCarousel';
import { mockTips } from '../../data/beautyaiMockData';

describe('BeautyTipsCarousel', () => {
  const defaultProps = {
    tips: mockTips,
    todaysTip: mockTips[0],
    language: 'en',
  };

  it('renders the carousel with tips', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    expect(screen.getByText('✨ Beauty Tips of the Day')).toBeInTheDocument();
    expect(screen.getByText(mockTips[0].title)).toBeInTheDocument();
  });

  it('displays featured today badge for today\'s tip', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    expect(screen.getByText('Featured Today')).toBeInTheDocument();
  });

  it('navigates to next tip on next button click', async () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    const nextButton = screen.getByLabelText('Next tip');
    
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(mockTips[1].title)).toBeInTheDocument();
    });
  });

  it('navigates to previous tip on previous button click', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    const prevButton = screen.getByLabelText('Previous tip');
    
    fireEvent.click(prevButton);
    
    expect(screen.getByText(mockTips[mockTips.length - 1].title)).toBeInTheDocument();
  });

  it('filters tips by category', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    const skinCareButton = screen.getByText('Skin Care');
    
    fireEvent.click(skinCareButton);
    
    const skinCareTips = mockTips.filter(tip => tip.category === 'skin-care');
    expect(screen.getByText(skinCareTips[0].title)).toBeInTheDocument();
  });

  it('displays empty state when no tips available', () => {
    render(<BeautyTipsCarousel tips={[]} todaysTip={null} language="en" />);
    expect(screen.getByText(/No tips available/i)).toBeInTheDocument();
  });

  it('auto-plays by default', async () => {
    jest.useFakeTimers();
    render(<BeautyTipsCarousel {...defaultProps} />);
    
    const initialTitle = mockTips[0].title;
    expect(screen.getByText(initialTitle)).toBeInTheDocument();
    
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(screen.getByText(mockTips[1].title)).toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });

  it('pauses autoplay when pause button clicked', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    const pauseButton = screen.getByText('⏸ Pause');
    
    fireEvent.click(pauseButton);
    
    expect(screen.getByText('▶ Play')).toBeInTheDocument();
  });

  it('shows correct tip counter', () => {
    render(<BeautyTipsCarousel {...defaultProps} />);
    expect(screen.getByText(`1 / ${mockTips.length}`)).toBeInTheDocument();
  });
});
