import React from 'react';
import { render, screen } from '@testing-library/react';
import JobPortalOverview360 from './JobPortalOverview360';

describe('JobPortalOverview360', () => {
  it('renders key marketplace, candidate, and employer sections', () => {
    const sampleData = {
      marketplace: {
        totalActiveJobs: 12,
        verifiedEmployers: 5,
        gulfJobs: 2,
        itJobs: 4,
        gigJobs: 1,
        urgentJobs: 3,
        newJobsLast7Days: 6,
        jobsByType: [{ type: 'it', count: 4 }],
        topRoles: [{ role: 'Backend Engineer', count: 5 }],
        topSkills: [{ skill: 'React', count: 8 }],
        topLocations: [{ location: 'Kochi', count: 5 }],
        salaryStats: [{ type: 'IT', count: 4, averageMin: 40000, averageMax: 90000 }],
      },
      candidate: {
        profileCompleteness: 78,
        resumeScore: 82,
        savedJobsCount: 3,
        applicationsCount: 5,
        recentMatches: [
          {
            jobId: '1',
            title: 'Frontend Developer',
            company: 'TechCo',
            location: 'Kochi',
            matchScore: 92,
            applicationStatus: 'Applied',
          },
        ],
        jobAlertsEnabled: true,
      },
      employer: {
        activeJobs: 4,
        totalApplications: 20,
        averageMatchScore: 70,
        responseRate: 88,
        hiringVelocityDays: 14,
        topJobs: [
          {
            jobId: 'job-1',
            title: 'Backend Engineer',
            company: 'TechCo',
            location: 'Kochi',
            applicationCount: 10,
            avgMatchScore: 78,
          },
        ],
      },
    };

    render(<JobPortalOverview360 data={sampleData} loading={false} error="" onRefresh={() => {}} />);

    expect(screen.getByText('Job Portal 360 Dashboard')).toBeInTheDocument();
    expect(screen.getAllByText('Active jobs').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Verified employers')).toBeInTheDocument();
    expect(screen.getByText('Profile completeness')).toBeInTheDocument();
    expect(screen.getByText('Resume score')).toBeInTheDocument();
    expect(screen.getByText('Response rate')).toBeInTheDocument();
    expect(screen.getByText('Salary benchmarks')).toBeInTheDocument();
    expect(screen.getByText('Employer Pulse')).toBeInTheDocument();
    expect(screen.getByText('Top skills')).toBeInTheDocument();
    expect(screen.getAllByText('Top locations').length).toBeGreaterThanOrEqual(2);
  });
});
