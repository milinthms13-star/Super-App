import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeautySelfieGallery from '../../components/BeautySelfieGallery';
import { mockSelfies } from '../../data/beautyaiMockData';

describe('BeautySelfieGallery', () => {
  const mockOnDelete = jest.fn();
  const mockOnSelect = jest.fn();

  const defaultProps = {
    selfies: mockSelfies,
    onDelete: mockOnDelete,
    onSelect: mockOnSelect,
    isDeleting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('renders gallery with selfies', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    expect(screen.getByText(`My Selfies (${mockSelfies.length})`)).toBeInTheDocument();
  });

  it('displays empty state when no selfies', () => {
    render(<BeautySelfieGallery {...defaultProps} selfies={[]} />);
    expect(screen.getByText('No Selfies Yet')).toBeInTheDocument();
    expect(screen.getByText(/Upload a selfie/i)).toBeInTheDocument();
  });

  it('sorts selfies by date desc by default', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const sortSelect = screen.getByDisplayValue('Newest First');
    expect(sortSelect).toBeInTheDocument();
  });

  it('changes sort order', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const sortSelect = screen.getByDisplayValue('Newest First');
    
    fireEvent.change(sortSelect, { target: { value: 'score-desc' } });
    
    expect(sortSelect.value).toBe('score-desc');
  });

  it('toggles between grid and list view', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const listViewButton = screen.getByLabelText('List view');
    
    fireEvent.click(listViewButton);
    
    const gallery = screen.getByText(`My Selfies (${mockSelfies.length})`).closest('section');
    expect(gallery.querySelector('.list-view')).toBeInTheDocument();
  });

  it('calls onSelect when selfie is clicked', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const selfieCards = screen.getAllByRole('img');
    
    fireEvent.click(selfieCards[0].closest('.selfie-card'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSelfies[0]);
  });

  it('calls onDelete with confirmation', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText('Delete selfie');
    
    fireEvent.click(deleteButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDelete).toHaveBeenCalledWith(mockSelfies[0]._id);
  });

  it('does not delete when confirmation is cancelled', () => {
    window.confirm = jest.fn(() => false);
    render(<BeautySelfieGallery {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText('Delete selfie');
    
    fireEvent.click(deleteButtons[0]);
    
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('displays selfie analysis information', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    expect(screen.getByText(`Score: ${mockSelfies[0].analysis.skinScore}/100`)).toBeInTheDocument();
  });

  it('opens detail modal when selfie is clicked', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const selfieCard = screen.getAllByRole('img')[0].closest('.selfie-card');
    
    fireEvent.click(selfieCard);
    
    expect(screen.getByText('Analysis Results')).toBeInTheDocument();
  });

  it('closes detail modal when close button is clicked', () => {
    render(<BeautySelfieGallery {...defaultProps} />);
    const selfieCard = screen.getAllByRole('img')[0].closest('.selfie-card');
    fireEvent.click(selfieCard);
    
    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Analysis Results')).not.toBeInTheDocument();
  });

  it('disables delete button when isDeleting is true', () => {
    render(<BeautySelfieGallery {...defaultProps} isDeleting={true} />);
    const deleteButtons = screen.getAllByLabelText('Delete selfie');
    
    expect(deleteButtons[0]).toBeDisabled();
  });
});
