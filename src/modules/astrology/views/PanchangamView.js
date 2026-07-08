import React from "react";

const PanchangamView = ({
  panchangam,
  panchangamLoading,
  panchangamNotice,
  festivals,
  getNakshatraDisplayName,
  language,
}) => (
  <div className="astro-card-grid">
    <article className="astrology-panel astro-result-card">
      <h4>Panchangam today</h4>
      {panchangamLoading ? (
        <p className="astrology-inline-message">Loading...</p>
      ) : (
        <>
          <ul>
            <li>Tithi: {panchangam?.tithi || "Shukla Paksha Tritiya"}</li>
            <li>Nakshatra: {getNakshatraDisplayName(panchangam?.nakshatra || "Revati", language)}</li>
            <li>Yoga: {panchangam?.yoga || "Siddha"}</li>
            <li>Karana: {panchangam?.karana || "Bava"}</li>
            <li>Sunrise: {panchangam?.sunrise || "06:02 AM"}</li>
            <li>Sunset: {panchangam?.sunset || "06:40 PM"}</li>
            <li>Rahu Kalam: {panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</li>
            <li>Yamagandam: {panchangam?.yamagandam || "03:00 PM - 04:30 PM"}</li>
            <li>Gulika: {panchangam?.gulika || "07:30 AM - 09:00 AM"}</li>
          </ul>
          {panchangam?._meta?.note ? (
            <p className="astrology-inline-message astrology-inline-message-warning">{panchangam._meta.note}</p>
          ) : null}
        </>
      )}
      {panchangamNotice ? (
        <p className="astrology-inline-message astrology-inline-message-warning">{panchangamNotice}</p>
      ) : null}
    </article>
    
    <article className="astrology-panel astro-result-card">
      <h4>Festival updates</h4>
      {festivals.length ? (
        <ul>
          {festivals.map((festival) => (
            <li key={festival.name}>
              <strong>{festival.name}</strong> - {festival.date}
              {festival.note ? <p className="astro-festival-note">{festival.note}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No festival updates.</p>
      )}
      {festivals?.[0]?._meta?.note ? (
        <p className="astrology-inline-message astrology-inline-message-warning">{festivals[0]._meta.note}</p>
      ) : null}
    </article>

    <article className="astrology-panel astro-result-card astro-span-2">
      <h4>Auspicious timings today</h4>
      <div className="astro-timings-grid">
        <div className="astro-timing-card astro-timing-positive">
          <strong>Abhijit Muhurtam</strong>
          <p>11:45 AM - 12:33 PM</p>
          <span>Best for important starts</span>
        </div>
        <div className="astro-timing-card astro-timing-caution">
          <strong>Avoid Rahu Kalam</strong>
          <p>{panchangam?.rahuKalam || "10:30 AM - 12:00 PM"}</p>
          <span>Inauspicious period</span>
        </div>
        <div className="astro-timing-card astro-timing-positive">
          <strong>Brahma Muhurtam</strong>
          <p>04:30 AM - 05:30 AM</p>
          <span>Meditation & prayers</span>
        </div>
        <div className="astro-timing-card astro-timing-neutral">
          <strong>Godhuli Lagna</strong>
          <p>{panchangam?.sunset ? `Around ${panchangam.sunset}` : "Around 6:40 PM"}</p>
          <span>Evening prayers</span>
        </div>
      </div>
    </article>
  </div>
);

export default PanchangamView;
