import React, { useMemo, useState } from "react";
import { calculateProgressScore } from "./beautyAiUpgradeUtils";

const DEFAULT_WEEK = [
  "Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"
].map((label) => ({ label, completed: false, note: "" }));

export default function BeautyProgressTracker() {
  const [entries, setEntries] = useState(DEFAULT_WEEK);
  const score = useMemo(() => calculateProgressScore(entries), [entries]);

  const toggle = (index) => {
    setEntries((prev) => prev.map((entry, i) => i === index ? { ...entry, completed: !entry.completed } : entry));
  };

  return (
    <section className="beauty-progress-card">
      <div className="beauty-progress-header">
        <h3>7-Day Glow Challenge</h3>
        <span>{score}% completed</span>
      </div>
      <div className="beauty-progress-grid">
        {entries.map((entry, index) => (
          <button key={entry.label} type="button" className={entry.completed ? "done" : ""} onClick={() => toggle(index)}>
            {entry.completed ? "✓" : "○"} {entry.label}
          </button>
        ))}
      </div>
      <p>Upload weekly selfie and compare progress later with your image AI API.</p>
    </section>
  );
}
