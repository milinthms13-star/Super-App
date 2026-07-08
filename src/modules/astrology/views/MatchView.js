import React from "react";

const MatchView = ({
  selectedSign,
  setSelectedSign,
  signs,
  kundliApi,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Marriage compatibility check</h4>
      <p>Check compatibility based on zodiac signs and birth chart analysis. This includes Guna Milan, Nakshatr Porutham, and planetary compatibility.</p>
      <div className="astrology-form-grid">
        <label className="astrology-field">
          <span>Your sign</span>
          <select value={selectedSign} onChange={(event) => setSelectedSign(event.target.value)}>
            {signs.map((item) => (
              <option key={item.sign} value={item.sign}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="astrology-field">
          <span>Partner sign</span>
          <select value={kundliApi.partnerSign} onChange={(event) => kundliApi.setPartnerSign(event.target.value)}>
            {signs.map((item) => (
              <option key={item.sign} value={item.sign}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="astrology-save-button" onClick={kundliApi.handleCompatibilitySubmit}>
        Check porutham
      </button>
    </article>

    {kundliApi.compatibility ? (
      <>
        <article className="astrology-panel astro-result-card">
          <h4>Overall compatibility score</h4>
          <div className="astro-compatibility-score">
            <div className="astro-score-circle">
              <span className="astro-score-value">{Number(kundliApi.compatibility.score || 0)}%</span>
            </div>
            <p className="astro-score-label">
              {Number(kundliApi.compatibility.score || 0) >= 75 ? "Excellent Match" :
               Number(kundliApi.compatibility.score || 0) >= 60 ? "Good Match" :
               Number(kundliApi.compatibility.score || 0) >= 40 ? "Average Match" : "Challenging Match"}
            </p>
          </div>
        </article>

        <article className="astrology-panel astro-result-card">
          <h4>Compatibility summary</h4>
          <p>{kundliApi.compatibility.summary}</p>
          {kundliApi.compatibility?.quality?.note ? (
            <p className="astrology-inline-message astrology-inline-message-warning">
              {kundliApi.compatibility.quality.note}
            </p>
          ) : null}
        </article>

        <article className="astrology-panel astro-result-card astro-span-2">
          <h4>Detailed analysis</h4>
          <div className="astro-compatibility-details">
            <div className="astro-compatibility-aspect">
              <strong>Emotional compatibility</strong>
              <div className="astro-compatibility-bar">
                <div className="astro-compatibility-fill" style={{ width: "75%" }} />
              </div>
              <span>75%</span>
            </div>
            <div className="astro-compatibility-aspect">
              <strong>Mental compatibility</strong>
              <div className="astro-compatibility-bar">
                <div className="astro-compatibility-fill" style={{ width: "82%" }} />
              </div>
              <span>82%</span>
            </div>
            <div className="astro-compatibility-aspect">
              <strong>Physical compatibility</strong>
              <div className="astro-compatibility-bar">
                <div className="astro-compatibility-fill" style={{ width: "68%" }} />
              </div>
              <span>68%</span>
            </div>
            <div className="astro-compatibility-aspect">
              <strong>Financial compatibility</strong>
              <div className="astro-compatibility-bar">
                <div className="astro-compatibility-fill" style={{ width: "70%" }} />
              </div>
              <span>70%</span>
            </div>
          </div>
        </article>

        <article className="astrology-panel astro-result-card">
          <h4>Strengths</h4>
          <ul>
            <li>Shared values and life goals</li>
            <li>Strong emotional understanding</li>
            <li>Complementary personality traits</li>
            <li>Good communication foundation</li>
          </ul>
        </article>

        <article className="astrology-panel astro-result-card">
          <h4>Areas to work on</h4>
          <ul>
            <li>Financial planning discussions needed</li>
            <li>Different approaches to conflict resolution</li>
            <li>Balance personal space and togetherness</li>
            <li>Align expectations on family matters</li>
          </ul>
        </article>

        <article className="astrology-panel astro-result-card astro-span-2">
          <h4>Recommendations for harmony</h4>
          <ul>
            <li>Schedule regular quality time together without distractions</li>
            <li>Practice active listening during disagreements</li>
            <li>Celebrate each other's successes and support during challenges</li>
            <li>Create shared rituals and traditions</li>
            <li>Maintain individual interests while nurturing shared hobbies</li>
            <li>Seek counsel from elders or counselors when needed</li>
          </ul>
        </article>
      </>
    ) : (
      <article className="astrology-panel astro-result-card astro-span-2">
        <h4>How compatibility works</h4>
        <p>Our compatibility analysis considers multiple astrological factors:</p>
        <ul>
          <li><strong>Guna Milan:</strong> Traditional point-based compatibility system</li>
          <li><strong>Nakshatra Porutham:</strong> Birth star compatibility</li>
          <li><strong>Planetary positions:</strong> Venus, Mars, and Moon placements</li>
          <li><strong>Dasha compatibility:</strong> Current planetary periods</li>
          <li><strong>Elemental balance:</strong> Fire, Earth, Air, Water harmony</li>
        </ul>
      </article>
    )}
  </div>
);

export default MatchView;
