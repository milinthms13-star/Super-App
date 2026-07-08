import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BeautyConsent from '../../components/BeautyConsent';
import { mockConsentStatus } from '../../data/beautyaiMockData';

describe('BeautyConsent', () => {
  const mockOnGrantConsent = jest.fn();
  const mockOnRevokeConsent = jest.fn();

  const defaultProps = {
    consentStatus: mockConsentStatus,
    onGrantConsent: mockOnGrantConsent,
    onRevokeConsent: mockOnRevokeConsent,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('renders privacy and consent settings', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText('Privacy & Consent Settings')).toBeInTheDocument();
  });

  it('displays consent version', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText(`Consent Version: ${mockConsentStatus.consentVersion}`)).toBeInTheDocument();
  });

  it('shows granted status for selfie analysis', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText('📸 Selfie Analysis')).toBeInTheDocument();
    const badges = screen.getAllByText('Granted');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows granted status for plan generation', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText('📋 Beauty Plan Generation')).toBeInTheDocument();
  });

  it('toggles consent details when show details is clicked', () => {
    render(<BeautyConsent {...defaultProps} />);
    const showDetailsButtons = screen.getAllByText('Show Details');
    
    fireEvent.click(showDetailsButtons[0]);
    
    expect(screen.getByText('What we collect:')).toBeInTheDocument();
    expect(screen.getByText('How we use it:')).toBeInTheDocument();
    expect(screen.getByText('Your rights:')).toBeInTheDocument();
  });

  it('hides details when hide details is clicked', () => {
    render(<BeautyConsent {...defaultProps} />);
    const showDetailsButtons = screen.getAllByText('Show Details');
    fireEvent.click(showDetailsButtons[0]);
    
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);
    
    expect(screen.queryByText('What we collect:')).not.toBeInTheDocument();
  });

  it('calls onRevokeConsent with confirmation when revoke is clicked', () => {
    render(<BeautyConsent {...defaultProps} />);
    const revokeButtons = screen.getAllByText('Revoke Consent');
    
    fireEvent.click(revokeButtons[0]);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnRevokeConsent).toHaveBeenCalledWith('selfieAnalysis');
  });

  it('does not revoke consent when confirmation is cancelled', () => {
    window.confirm = jest.fn(() => false);
    render(<BeautyConsent {...defaultProps} />);
    const revokeButtons = screen.getAllByText('Revoke Consent');
    
    fireEvent.click(revokeButtons[0]);
    
    expect(mockOnRevokeConsent).not.toHaveBeenCalled();
  });

  it('calls onGrantConsent when grant consent is clicked', () => {
    const notGrantedStatus = {
      ...mockConsentStatus,
      selfieAnalysis: { granted: false, grantedAt: null },
    };
    render(<BeautyConsent {...defaultProps} consentStatus={notGrantedStatus} />);
    
    const grantButtons = screen.getAllByText('Grant Consent');
    fireEvent.click(grantButtons[0]);
    
    expect(mockOnGrantConsent).toHaveBeenCalledWith('selfieAnalysis');
  });

  it('disables buttons when isLoading is true', () => {
    render(<BeautyConsent {...defaultProps} isLoading={true} />);
    const buttons = screen.getAllByRole('button');
    const actionButtons = buttons.filter(btn => 
      btn.textContent.includes('Consent') || btn.textContent.includes('Revoke')
    );
    
    actionButtons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('displays granted date when consent is granted', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText(/Granted on:/)).toBeInTheDocument();
  });

  it('shows privacy note at the bottom', () => {
    render(<BeautyConsent {...defaultProps} />);
    expect(screen.getByText(/Your privacy is important to us/i)).toBeInTheDocument();
  });

  it('includes contact support link', () => {
    render(<BeautyConsent {...defaultProps} />);
    const contactLink = screen.getByText('Contact Support');
    expect(contactLink).toHaveAttribute('href', '/support');
  });
});
