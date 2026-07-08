import React from "react";

const RemediesView = ({
  selectedSign,
  getRemedyTips,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Vedic remedies for {selectedSign}</h4>
      <ul>
        {getRemedyTips(selectedSign).map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Gemstone recommendation</h4>
      <div className="astro-remedy-card">
        <strong>Primary gemstone</strong>
        <p>Ruby (Manikya) - Strengthens Sun's influence</p>
        <ul>
          <li>Wear on ring finger</li>
          <li>Set in gold or copper</li>
          <li>Wear on Sunday morning</li>
          <li>Weight: 3-6 carats recommended</li>
        </ul>
        <p className="astrology-inline-message astrology-inline-message-warning">
          Consult an astrologer before wearing gemstones
        </p>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Mantra recommendation</h4>
      <div className="astro-remedy-card">
        <strong>Daily mantra</strong>
        <p>"Om Suryaya Namaha"</p>
        <ul>
          <li>Chant 108 times daily</li>
          <li>Best time: Sunrise</li>
          <li>Face east while chanting</li>
          <li>Use rudraksha mala</li>
        </ul>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Fasting recommendations</h4>
      <div className="astro-remedy-card">
        <strong>Vrat (Fasting)</strong>
        <ul>
          <li>Sunday fasting for Sun strength</li>
          <li>Consume only fruits and milk</li>
          <li>Wear red or orange clothes</li>
          <li>Donate wheat or jaggery</li>
        </ul>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Charity & donations</h4>
      <div className="astro-remedy-card">
        <strong>Daan (Donations)</strong>
        <ul>
          <li>Donate to educational causes</li>
          <li>Help visually impaired persons</li>
          <li>Feed cows on Sundays</li>
          <li>Offer food to the needy</li>
          <li>Support orphanages or old age homes</li>
        </ul>
      </div>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Temple visits & rituals</h4>
      <div className="astro-temples-grid">
        <div className="astro-temple-card">
          <strong>Sun temple visit</strong>
          <p>Visit Surya temple on Sundays</p>
          <p>Offer water to Sun at sunrise</p>
        </div>
        <div className="astro-temple-card">
          <strong>Hanuman temple</strong>
          <p>Visit on Tuesdays and Saturdays</p>
          <p>Offer sindoor and jasmine oil</p>
        </div>
        <div className="astro-temple-card">
          <strong>Navagraha temple</strong>
          <p>Visit during important transits</p>
          <p>Perform graha shanti puja</p>
        </div>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Colors to wear</h4>
      <div className="astro-colors-grid">
        <div className="astro-color-card" style={{ backgroundColor: "#ff6b6b", color: "white" }}>
          <strong>Sunday</strong>
          <span>Red, Orange</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#f0f0f0" }}>
          <strong>Monday</strong>
          <span>White, Cream</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#ff6b6b", color: "white" }}>
          <strong>Tuesday</strong>
          <span>Red, Maroon</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#51cf66" }}>
          <strong>Wednesday</strong>
          <span>Green</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#ffd43b" }}>
          <strong>Thursday</strong>
          <span>Yellow</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#f0f0f0" }}>
          <strong>Friday</strong>
          <span>White, Pink</span>
        </div>
        <div className="astro-color-card" style={{ backgroundColor: "#1c7ed6", color: "white" }}>
          <strong>Saturday</strong>
          <span>Blue, Black</span>
        </div>
      </div>
    </article>

    <article className="astrology-panel astro-result-card">
      <h4>Yantra recommendation</h4>
      <div className="astro-remedy-card">
        <strong>Surya Yantra</strong>
        <p>Install in pooja room facing east</p>
        <ul>
          <li>Energize on Sunday during sunrise</li>
          <li>Worship with red flowers</li>
          <li>Light ghee lamp daily</li>
        </ul>
      </div>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Daily routine suggestions</h4>
      <div className="astro-routine-timeline">
        <div className="astro-routine-item">
          <strong>5:00 AM - 6:00 AM</strong>
          <p>Wake up during Brahma Muhurta, meditation and pranayama</p>
        </div>
        <div className="astro-routine-item">
          <strong>6:00 AM - 7:00 AM</strong>
          <p>Sun salutation (Surya Namaskar) - 12 rounds</p>
        </div>
        <div className="astro-routine-item">
          <strong>Morning</strong>
          <p>Chant mantras, read spiritual texts, offer water to Sun</p>
        </div>
        <div className="astro-routine-item">
          <strong>Evening</strong>
          <p>Light lamp at sunset, evening prayers, gratitude practice</p>
        </div>
        <div className="astro-routine-item">
          <strong>Night</strong>
          <p>Reflect on the day, journal blessings, early sleep by 10 PM</p>
        </div>
      </div>
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Important notes</h4>
      <div className="astrology-inline-message astrology-inline-message-warning">
        <p><strong>Disclaimer:</strong> Remedies are meant to support your efforts, not replace them. Always consult a qualified astrologer for personalized remedies. Medical conditions should be treated by healthcare professionals. Gemstones should be purchased from certified dealers and worn after proper consultation.</p>
      </div>
    </article>
  </div>
);

export default RemediesView;
