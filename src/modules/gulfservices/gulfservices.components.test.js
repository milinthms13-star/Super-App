import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TimelinePanel from './components/panels/TimelinePanel';
import RequestsDashboard from './components/panels/RequestsDashboard';

describe('GulfServices shared components', () => {
  test('TimelinePanel shows empty state when no entries exist', () => {
    render(<TimelinePanel timelineEntries={[]} />);
    expect(screen.getByText(/No timeline updates yet/i)).toBeInTheDocument();
  });

  test('TimelinePanel renders status and note for timeline entries', () => {
    render(
      <TimelinePanel
        timelineEntries={[
          {
            status: 'Visa Processing',
            note: 'Documents verified by operations.',
            date: '2026-05-20T08:00:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByText('Visa Processing')).toBeInTheDocument();
    expect(screen.getByText('Documents verified by operations.')).toBeInTheDocument();
  });

  test('RequestsDashboard triggers action callback when Open is clicked', () => {
    const onRequestAction = jest.fn();
    const item = {
      requestId: 'ATT-2026-001',
      fullName: 'Test User',
      status: 'document_received',
      createdAt: '2026-05-18T12:00:00.000Z',
    };

    render(<RequestsDashboard requests={[item]} onRequestAction={onRequestAction} />);

    fireEvent.click(screen.getByRole('button', { name: /Open/i }));
    expect(onRequestAction).toHaveBeenCalledWith(item);
  });
});
