import React from "react";

const CareerView = ({
  selectedSign,
  getCareerAdvice,
  profileApi,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Career forecast</h4>
      <p>{getCareerAdvice(selectedSign)}</p>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Professional strengths</h4>
      <ul>
        <li>Natural leadership in team settings</li>
        <li>Strategic thinking and planning</li>
        <li>Strong communication skills</li>
        <li>Ability to handle pressure situations</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Career opportunities</h4>
      <ul>
        <li>Mid-year promotion prospects looking favorable</li>
        <li>New project assignments expected in Q2</li>
        <li>Networking events will open doors</li>
        <li>Skill development investments pay off</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Areas to focus</h4>
      <ul>
        <li>Build stronger relationships with mentors</li>
        <li>Enhance technical or domain expertise</li>
        <li>Take calculated risks in proposals</li>
        <li>Balance work demands with personal wellbeing</li>
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Best career periods</h4>
      <div className="astro-period-list">
        <div className="astro-period-item">
          <strong>March - May</strong>
          <p>Ideal for job changes or role transitions</p>
        </div>
        <div className="astro-period-item">
          <strong>August - September</strong>
          <p>Strong phase for negotiations and salary discussions</p>
        </div>
        <div className="astro-period-item">
          <strong>November - December</strong>
          <p>Recognition and achievement period</p>
        </div>
      </div>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Career action plan</h4>
      <div className="astro-action-checklist">
        <label>
          <input type="checkbox" />
          <span>Update resume and LinkedIn profile</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Identify 3 skill development courses</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Schedule mentorship meetings</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Research industry trends in your field</span>
        </label>
        <label>
          <input type="checkbox" />
          <span>Set quarterly career goals</span>
        </label>
      </div>
    </article>
  </div>
);

export default CareerView;
