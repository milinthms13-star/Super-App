import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import TimelinePanel from './components/panels/TimelinePanel';
import RequestsDashboard from './components/panels/RequestsDashboard';
import GulfModalShell from './components/modals/GulfModalShell';
import GulfModal from './components/GulfModal';

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

  test('GulfModal renders children only when active', () => {
    const { rerender } = render(
      <GulfModal activeModal={null}>
        <p>Hidden modal</p>
      </GulfModal>
    );
    expect(screen.queryByText('Hidden modal')).toBeNull();

    rerender(
      <GulfModal activeModal="visa">
        <p>Visible modal</p>
      </GulfModal>
    );
    expect(screen.getByText('Visible modal')).toBeInTheDocument();
  });

  test('GulfModalShell renders visa modal and handles close', () => {
    const closeModal = jest.fn();
    const submitVisa = jest.fn((event) => event.preventDefault());

    render(
      <GulfModalShell
        activeModal="visa"
        closeModal={closeModal}
        loading={false}
        submitVisa={submitVisa}
        visaForm={{ fullName: 'A', email: 'a@test.com', phone: '+919999999999', country: 'UAE', visaType: 'Visit', urgency: 'normal', currentLocation: 'Kerala', message: '' }}
        setVisaForm={jest.fn()}
        submitJobApplication={jest.fn()}
        selectedCountry="UAE"
        setSelectedCountry={jest.fn()}
        availableCountries={['UAE']}
        availableJobCategories={['Hospitality']}
        jobFilters={{ category: '', salaryMin: '', salaryMax: '', visaType: '', accommodation: null, food: null, urgentOnly: false }}
        setJobFilters={jest.fn()}
        filteredJobs={[]}
        selectedJob={null}
        setSelectedJob={jest.fn()}
        getRecruiterDetails={jest.fn()}
        jobApplicationForm={{}}
        setJobApplicationForm={jest.fn()}
        handleInputChange={() => jest.fn()}
        handleFileChange={jest.fn()}
        submitAttestation={jest.fn()}
        attestationForm={{ documentType: 'degree', urgency: 'standard' }}
        setAttestationForm={jest.fn()}
        submitLead={jest.fn()}
        leadForm={{ serviceType: 'visa', country: 'UAE', fullName: '', email: '', phone: '', message: '' }}
        setLeadForm={jest.fn()}
        supportWhatsapp="919999999999"
        submitFraudReport={jest.fn()}
        fraudForm={{ phone: '', recruiterId: '', issueDescription: '' }}
        setFraudForm={jest.fn()}
        modalContainerRef={React.createRef()}
      />
    );

    expect(screen.getByText(/Visa Enquiry & Support/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Close visa support dialog/i }));
    expect(closeModal).toHaveBeenCalled();
  });
});
