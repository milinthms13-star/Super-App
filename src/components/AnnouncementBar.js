import React from "react";
import { getTranslation } from "../data/translations";
import "../styles/AnnouncementBar.css";

const AnnouncementBar = ({ language = "en" }) => {
  const { announcement, direction } = getTranslation(language);
  const tickerMessages = [...(announcement.offers || []), ...(announcement.messages || [])];
  const marqueeItems = [...tickerMessages, ...tickerMessages];

  return (
    <div className="announcement-stack" aria-label="Important updates" dir={direction}>
      <div className="announcement-ticker-strip">
        <div className="announcement-ticker-track">
          {marqueeItems.map((message, index) => (
            <span key={`${message}-${index}`}>{message}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBar;
