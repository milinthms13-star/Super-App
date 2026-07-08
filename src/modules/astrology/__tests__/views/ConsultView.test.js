import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsultView from '../../views/ConsultView';

describe('ConsultView', () => {
  const mockProps = {
    consultApi: {
      consultants: [
        {
          id: 'c1',
          name: 'Madhav Acharya',
          specialty: 'Kerala Jathakam',
          rate: '₹1,200 / 15 min',
          amountInr: 1200,
          availableSlots: [
            { id: 'slot1', label: 'Today 4:00 PM', date: 'today' },
            { id: 'slot2', label: 'Today 5:30 PM', date: 'today' },
          ],
          rating: 4.8,
        },
        {
          id: 'c2',
          name: 'Priya Nambiar',
          specialty: 'Kundli Analysis',
          rate: '₹950 / 15 min',
          amountInr: 950,
          availableSlots: [],
          rating: 4.6,
        },
      ],
      selectedConsultant: null,
      selectedSlot: null,
      bookingNotes: '',
      loading: false,
      error: '',
      bookingSuccess: false,
      onSelectConsultant: jest.fn(),
      onSelectSlot: jest.fn(),
      onNotesChange: jest.fn(),
      onSubmitBooking: jest.fn(),
    },
    language: 'en',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render list of consultants', () => {
    render(<ConsultView {...mockProps} />);

    expect(screen.getByText('Madhav Acharya')).toBeInTheDocument();
    expect(screen.getByText('Priya Nambiar')).toBeInTheDocument();
  });

  it('should display consultant specialties and rates', () => {
    render(<ConsultView {...mockProps} />);

    expect(screen.getByText(/Kerala Jathakam/i)).toBeInTheDocument();
    expect(screen.getByText(/₹1,200/i)).toBeInTheDocument();
    expect(screen.getByText(/Kundli Analysis/i)).toBeInTheDocument();
  });

  it('should show available slots for consultants', () => {
    render(<ConsultView {...mockProps} />);

    expect(screen.getByText('Today 4:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Today 5:30 PM')).toBeInTheDocument();
  });

  it('should call onSelectConsultant when consultant is clicked', () => {
    render(<ConsultView {...mockProps} />);

    const consultantCard = screen.getByText('Madhav Acharya').closest('button');
    fireEvent.click(consultantCard);

    expect(mockProps.consultApi.onSelectConsultant).toHaveBeenCalledWith('c1');
  });

  it('should highlight selected consultant', () => {
    const propsWithSelection = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        selectedConsultant: 'c1',
      },
    };

    render(<ConsultView {...propsWithSelection} />);

    const selectedCard = screen.getByText('Madhav Acharya').closest('button');
    expect(selectedCard).toHaveClass('is-selected');
  });

  it('should call onSelectSlot when slot is clicked', () => {
    const propsWithSelection = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        selectedConsultant: 'c1',
      },
    };

    render(<ConsultView {...propsWithSelection} />);

    const slotButton = screen.getByText('Today 4:00 PM');
    fireEvent.click(slotButton);

    expect(mockProps.consultApi.onSelectSlot).toHaveBeenCalledWith('slot1');
  });

  it('should allow entering booking notes', () => {
    const propsWithSelection = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        selectedConsultant: 'c1',
        selectedSlot: 'slot1',
      },
    };

    render(<ConsultView {...propsWithSelection} />);

    const notesTextarea = screen.getByPlaceholderText(/additional notes/i);
    fireEvent.change(notesTextarea, { target: { value: 'Test booking note' } });

    expect(mockProps.consultApi.onNotesChange).toHaveBeenCalledWith('Test booking note');
  });

  it('should call onSubmitBooking when book button clicked', async () => {
    const propsWithCompleteSelection = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        selectedConsultant: 'c1',
        selectedSlot: 'slot1',
        bookingNotes: 'Test note',
      },
    };

    render(<ConsultView {...propsWithCompleteSelection} />);

    const bookButton = screen.getByRole('button', { name: /book consultation/i });
    fireEvent.click(bookButton);

    await waitFor(() => {
      expect(mockProps.consultApi.onSubmitBooking).toHaveBeenCalled();
    });
  });

  it('should disable book button when no consultant selected', () => {
    render(<ConsultView {...mockProps} />);

    const bookButton = screen.getByRole('button', { name: /book consultation/i });
    expect(bookButton).toBeDisabled();
  });

  it('should show loading state during booking', () => {
    const propsWithLoading = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        loading: true,
      },
    };

    render(<ConsultView {...propsWithLoading} />);

    expect(screen.getByText(/booking/i)).toBeInTheDocument();
  });

  it('should display error message when booking fails', () => {
    const propsWithError = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        error: 'Failed to book consultation',
      },
    };

    render(<ConsultView {...propsWithError} />);

    expect(screen.getByText(/Failed to book consultation/i)).toBeInTheDocument();
  });

  it('should display success message when booking succeeds', () => {
    const propsWithSuccess = {
      ...mockProps,
      consultApi: {
        ...mockProps.consultApi,
        bookingSuccess: true,
      },
    };

    render(<ConsultView {...propsWithSuccess} />);

    expect(screen.getByText(/consultation booked successfully/i)).toBeInTheDocument();
  });

  it('should show no slots message for consultants without availability', () => {
    render(<ConsultView {...mockProps} />);

    const priyaCard = screen.getByText('Priya Nambiar').closest('.consultant-card');
    expect(priyaCard).toHaveTextContent(/no slots available/i);
  });

  it('should display consultant ratings', () => {
    render(<ConsultView {...mockProps} />);

    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
    expect(screen.getByText(/4\.6/)).toBeInTheDocument();
  });
});
