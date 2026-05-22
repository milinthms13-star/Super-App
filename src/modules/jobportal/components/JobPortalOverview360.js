import React from "react";

const JobPortalOverview360 = ({ data, loading, error, onRefresh }) => {
  const marketplace = data?.marketplace || {};
  const candidate = data?.candidate || null;
  const employer = data?.employer || null;

  return (
    <section className="jp-panel">
      <div className="jp-panel-head">
        <div>
          <h2>Job Portal 360 Dashboard</h2>
          <p>Live hiring, candidate readiness, and marketplace health in one view.</p>
        </div>
        <button type="button" className="jp-btn jp-btn-muted" onClick={onRefresh}>Refresh</button>
      </div>

      {loading ? <p>Loading 360 dashboard...</p> : null}
      {error ? <p className="jp-error-text">{error}</p> : null}
      {!loading && !error && !data ? <p>No overview data available.</p> : null}

      {!loading && data ? (
        <>
          <div className="jp-stats-grid">
            <article>
              <h3>{marketplace.totalActiveJobs ?? 0}</h3>
              <p>Active jobs</p>
            </article>
            <article>
              <h3>{marketplace.verifiedEmployers ?? 0}</h3>
              <p>Verified employers</p>
            </article>
            <article>
              <h3>{marketplace.gulfJobs ?? 0}</h3>
              <p>Gulf jobs</p>
            </article>
            <article>
              <h3>{marketplace.itJobs ?? 0}</h3>
              <p>IT jobs</p>
            </article>
            <article>
              <h3>{marketplace.gigJobs ?? 0}</h3>
              <p>Gig jobs</p>
            </article>
          </div>

          <section className="jp-panel">
            <div className="jp-panel-head">
              <div>
                <h3>Marketplace Snapshot</h3>
                <p>Demand, salary benchmarks, and top roles in the portal.</p>
              </div>
              <button type="button" className="jp-btn jp-btn-muted" onClick={onRefresh}>Refresh</button>
            </div>
            <div className="jp-stats-grid">
              <article>
                <h3>{marketplace.averageSalaryMin ? `INR ${marketplace.averageSalaryMin}` : 'N/A'}</h3>
                <p>Avg min salary</p>
              </article>
              <article>
                <h3>{marketplace.averageSalaryMax ? `INR ${marketplace.averageSalaryMax}` : 'N/A'}</h3>
                <p>Avg max salary</p>
              </article>
              <article>
                <h3>{marketplace.jobsByType?.length ?? 0}</h3>
                <p>Job categories live</p>
              </article>
              <article>
                <h3>{marketplace.topRoles?.length ?? 0}</h3>
                <p>Top roles</p>
              </article>
              <article>
                <h3>{marketplace.newJobsLast7Days ?? 0}</h3>
                <p>New jobs last 7 days</p>
              </article>
            </div>
            {marketplace.salaryStats?.length ? (
              <div className="jp-table">
                <h4>Salary benchmarks</h4>
                {marketplace.salaryStats.map((stat) => (
                  <div key={stat.type} className="jp-row">
                    <div>
                      <p className="jp-row-count">{stat.type}</p>
                      <p>{stat.count} listings</p>
                    </div>
                    <div>
                      <p className="jp-inline-label">Min avg</p>
                      <p>INR {stat.averageMin}</p>
                    </div>
                    <div>
                      <p className="jp-inline-label">Max avg</p>
                      <p>INR {stat.averageMax}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {marketplace.topRoles?.length ? (
              <div className="jp-table">
                <h4>Top roles</h4>
                {marketplace.topRoles.map((role) => (
                  <div key={role.role} className="jp-row">
                    <div>
                      <p className="jp-row-count">{role.role}</p>
                    </div>
                    <div>
                      <p className="jp-inline-label">Open jobs</p>
                      <p>{role.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {candidate ? (
            <section className="jp-panel">
              <div className="jp-panel-head">
                <div>
                  <h3>Your Candidate Snapshot</h3>
                  <p>Track your readiness, match quality, and next actions.</p>
                </div>
                <button type="button" className="jp-btn jp-btn-muted" onClick={onRefresh}>Refresh</button>
              </div>
              <div className="jp-stats-grid">
                <article>
                  <h3>{candidate.profileCompleteness ?? 0}%</h3>
                  <p>Profile completeness</p>
                </article>
                <article>
                  <h3>{candidate.resumeScore ?? 0}%</h3>
                  <p>Resume score</p>
                </article>
                <article>
                  <h3>{candidate.savedJobsCount ?? 0}</h3>
                  <p>Saved jobs</p>
                </article>
                <article>
                  <h3>{candidate.applicationsCount ?? 0}</h3>
                  <p>Applications submitted</p>
                </article>
                <article>
                  <h3>{candidate.jobAlertsEnabled ? 'On' : 'Off'}</h3>
                  <p>Job alerts</p>
                </article>
              </div>
              {candidate.recommendedActions?.length ? (
                <div className="jp-table">
                  <h4>Recommended next steps</h4>
                  {candidate.recommendedActions.map((action, index) => (
                    <div key={index} className="jp-row">
                      <div>
                        <p>{action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {candidate.topSkillGaps?.length ? (
                <div className="jp-table">
                  <h4>High demand skills to add</h4>
                  {candidate.topSkillGaps.map((gap) => (
                    <div key={gap.skill} className="jp-row">
                      <div>
                        <p className="jp-row-count">{gap.skill}</p>
                      </div>
                      <div>
                        <p className="jp-inline-label">Open jobs</p>
                        <p>{gap.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {candidate.recentMatches?.length ? (
                <div className="jp-table">
                  <h4>Recent matched jobs</h4>
                  {candidate.recentMatches.map((job) => (
                    <div key={job.jobId} className="jp-row">
                      <div>
                        <p className="jp-row-count">{job.title}</p>
                        <p>{job.company} • {job.location}</p>
                      </div>
                      <div>
                        <p className="jp-inline-label">Match score</p>
                        <p>{job.matchScore}%</p>
                      </div>
                      <div>
                        <p className="jp-inline-label">Status</p>
                        <p>{job.applicationStatus || 'Open'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {employer ? (
            <section className="jp-panel">
              <div className="jp-panel-head">
                <div>
                  <h3>Employer Pulse</h3>
                  <p>Hiring funnel, response rate, and top postings from your company.</p>
                </div>
                <button type="button" className="jp-btn jp-btn-muted" onClick={onRefresh}>Refresh</button>
              </div>
              <div className="jp-stats-grid">
                <article>
                  <h3>{employer.activeJobs ?? 0}</h3>
                  <p>Active jobs</p>
                </article>
                <article>
                  <h3>{employer.totalApplications ?? 0}</h3>
                  <p>Total applications</p>
                </article>
                <article>
                  <h3>{employer.averageMatchScore ?? 0}%</h3>
                  <p>Average candidate match</p>
                </article>
                <article>
                  <h3>{employer.responseRate ?? 0}%</h3>
                  <p>Response rate</p>
                </article>
                <article>
                  <h3>{employer.hiringVelocityDays ?? 0}</h3>
                  <p>Hiring velocity (days)</p>
                </article>
              </div>
              {employer.recommendedActions?.length ? (
                <div className="jp-table">
                  <h4>Employer next steps</h4>
                  {employer.recommendedActions.map((action, index) => (
                    <div key={`${action}-${index}`} className="jp-row">
                      <div>
                        <p>{action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {employer.topJobs?.length ? (
                <div className="jp-table">
                  <h4>Top hiring jobs</h4>
                  {employer.topJobs.map((job) => (
                    <div key={job.jobId} className="jp-row">
                      <div>
                        <p className="jp-row-count">{job.title}</p>
                        <p>{job.company} • {job.location}</p>
                      </div>
                      <div>
                        <p className="jp-inline-label">Applications</p>
                        <p>{job.applicationCount}</p>
                      </div>
                      <div>
                        <p className="jp-inline-label">Avg match</p>
                        <p>{job.avgMatchScore}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="jp-panel">
            <div className="jp-panel-head">
              <h3>Marketplace Health</h3>
              <p>Job demand, top skills, and regional activity for the portal.</p>
            </div>
            <div className="jp-stats-grid">
              <article>
                <h3>{marketplace.jobsByType?.length ?? 0}</h3>
                <p>Job categories live</p>
              </article>
              <article>
                <h3>{marketplace.topSkills?.length ?? 0}</h3>
                <p>Top skills trending</p>
              </article>
              <article>
                <h3>{marketplace.topLocations?.length ?? 0}</h3>
                <p>Top locations</p>
              </article>
              <article>
                <h3>{marketplace.urgentJobs ?? 0}</h3>
                <p>Urgent job postings</p>
              </article>
              <article>
                <h3>{marketplace.newJobsLast7Days ?? 0}</h3>
                <p>New jobs last 7 days</p>
              </article>
              <article>
                <h3>{marketplace.projectedNewJobsNext7Days ?? 0}</h3>
                <p>Projected new jobs (next 7d)</p>
              </article>
              <article>
                <h3>{marketplace.demandTrend || "stable"}</h3>
                <p>Demand trend</p>
              </article>
            </div>
            {marketplace.funnel ? (
              <div className="jp-table">
                <h4>Conversion funnel (last 30 days)</h4>
                <div className="jp-row">
                  <div>
                    <p className="jp-row-count">View to Save</p>
                  </div>
                  <div>
                    <p>{marketplace.funnel.viewToSaveRate ?? 0}%</p>
                  </div>
                </div>
                <div className="jp-row">
                  <div>
                    <p className="jp-row-count">Save to Apply</p>
                  </div>
                  <div>
                    <p>{marketplace.funnel.saveToApplyRate ?? 0}%</p>
                  </div>
                </div>
                <div className="jp-row">
                  <div>
                    <p className="jp-row-count">Apply to Selection</p>
                  </div>
                  <div>
                    <p>{marketplace.funnel.applyToSelectionRate ?? 0}%</p>
                  </div>
                </div>
              </div>
            ) : null}
            {marketplace.moderation ? (
              <div className="jp-table">
                <h4>Trust and moderation</h4>
                <div className="jp-row">
                  <div>
                    <p className="jp-row-count">Pending reports</p>
                  </div>
                  <div>
                    <p>{marketplace.moderation.pendingReports ?? 0}</p>
                  </div>
                </div>
                <div className="jp-row">
                  <div>
                    <p className="jp-row-count">High risk reports</p>
                  </div>
                  <div>
                    <p>{marketplace.moderation.highRiskReports ?? 0}</p>
                  </div>
                </div>
              </div>
            ) : null}
            {marketplace.recommendedActions?.length ? (
              <div className="jp-table">
                <h4>Marketplace actions</h4>
                {marketplace.recommendedActions.map((action, index) => (
                  <div key={`${action}-${index}`} className="jp-row">
                    <div>
                      <p>{action}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {marketplace.topSkills?.length ? (
              <div className="jp-table">
                <h4>Top skills</h4>
                {marketplace.topSkills.map((skill) => (
                  <div key={skill.skill} className="jp-row">
                    <div>
                      <p className="jp-row-count">{skill.skill}</p>
                    </div>
                    <div>
                      <p className="jp-inline-label">Open jobs</p>
                      <p>{skill.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {marketplace.topLocations?.length ? (
              <div className="jp-table">
                <h4>Top locations</h4>
                {marketplace.topLocations.map((location) => (
                  <div key={location.location} className="jp-row">
                    <div>
                      <p className="jp-row-count">{location.location}</p>
                    </div>
                    <div>
                      <p className="jp-inline-label">Open jobs</p>
                      <p>{location.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  );
};

export default JobPortalOverview360;

