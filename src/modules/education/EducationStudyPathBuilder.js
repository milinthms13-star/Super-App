import React, { useMemo, useState } from "react";
import { buildEducationStudyPath } from "./educationUpgradeUtils";

const EducationStudyPathBuilder = ({ onApplyPath }) => {
  const [profile, setProfile] = useState({
    classLevel: "Class 10",
    goal: "SSLC high score",
    dailyHours: "2",
    language: "Malayalam + English",
  });

  const path = useMemo(() => buildEducationStudyPath(profile), [profile]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="education-study-path-card">
      <div className="education-section-heading compact">
        <h2>AI Study Path Builder</h2>
        <p>Create a weekly learning path based on class, goal and study time.</p>
      </div>

      <div className="education-study-path-form">
        <label className="education-field">
          <span>Class / level</span>
          <select value={profile.classLevel} onChange={(e) => updateField("classLevel", e.target.value)}>
            <option>Class 8</option>
            <option>Class 9</option>
            <option>Class 10</option>
            <option>Plus One</option>
            <option>Plus Two</option>
            <option>College</option>
            <option>Job seeker</option>
          </select>
        </label>

        <label className="education-field">
          <span>Learning goal</span>
          <select value={profile.goal} onChange={(e) => updateField("goal", e.target.value)}>
            <option>SSLC high score</option>
            <option>Plus Two exam prep</option>
            <option>Spoken English</option>
            <option>Computer basics</option>
            <option>Coding career</option>
            <option>Gulf job readiness</option>
            <option>Government exam prep</option>
          </select>
        </label>

        <label className="education-field">
          <span>Daily study hours</span>
          <input
            type="number"
            min="1"
            max="8"
            value={profile.dailyHours}
            onChange={(e) => updateField("dailyHours", e.target.value)}
          />
        </label>

        <label className="education-field">
          <span>Preferred language</span>
          <select value={profile.language} onChange={(e) => updateField("language", e.target.value)}>
            <option>Malayalam + English</option>
            <option>Malayalam</option>
            <option>English</option>
            <option>Hindi</option>
          </select>
        </label>
      </div>

      <div className="education-study-plan-preview">
        <h3>{path.title}</h3>
        <p>{path.summary}</p>
        <ul>
          {path.weekPlan.map((item) => (
            <li key={item.day}>
              <strong>{item.day}:</strong> {item.task}
            </li>
          ))}
        </ul>
        <div className="education-study-plan-actions">
          <button type="button" className="education-primary-button" onClick={() => onApplyPath?.(path)}>
            Add to My Learning
          </button>
        </div>
      </div>
    </section>
  );
};

export default EducationStudyPathBuilder;
