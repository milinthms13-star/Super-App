import React, { useMemo, useState } from "react";
import { buildApiUrl } from "../../utils/api";
import { calculateProgressScore, DEFAULT_WEEK } from "./beautyAiUpgradeUtils";

const SNAPSHOT_STORAGE_KEY = "beauty_ai_weekly_snapshots_v1";

const readSnapshots = () => {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SNAPSHOT_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

const writeSnapshots = (snapshots) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
};

const buildEntriesFromLogs = (logs = []) =>
  DEFAULT_WEEK.map((entry) => {
    const found = logs.find((log) => Number(log.day) === Number(entry.day));
    return found
      ? {
          ...entry,
          completed: Boolean(found.done),
          note: found.note || "",
          score: Number(found.skinScore || 0),
        }
      : entry;
  });

const BeautyProgressTracker = ({
  request,
  logs = [],
  latestScore = 0,
  selfiePreview = "",
  pushStatus,
  onEntriesUpdate,
}) => {
  const [entries, setEntries] = useState(() => buildEntriesFromLogs(logs));
  const [snapshots, setSnapshots] = useState(() => readSnapshots());
  const [savingDay, setSavingDay] = useState(0);

  const completionScore = useMemo(() => calculateProgressScore(entries), [entries]);
  const completedCount = useMemo(
    () => entries.filter((entry) => entry.completed).length,
    [entries]
  );
  const scoreHistory = useMemo(
    () =>
      logs
        .filter((entry) => Number(entry.skinScore || 0) > 0)
        .sort((left, right) => new Date(left.updatedAt || 0) - new Date(right.updatedAt || 0)),
    [logs]
  );
  const firstScore = Number(scoreHistory[0]?.skinScore || 0);
  const currentScore = Number(scoreHistory[scoreHistory.length - 1]?.skinScore || latestScore || 0);
  const trend = currentScore && firstScore ? currentScore - firstScore : 0;

  const persistDay = async (day, nextDone) => {
    setSavingDay(day);
    try {
      await request.post(buildApiUrl("/beauty-ai/progress-log"), {
        day,
        done: nextDone,
        note: nextDone ? "Challenge completed" : "",
        skinScore: Number(latestScore || 0),
      });
      pushStatus?.("success", `Day ${day} progress saved.`);
    } catch (error) {
      pushStatus?.("error", error?.response?.data?.message || "Could not save progress update.");
      throw error;
    } finally {
      setSavingDay(0);
    }
  };

  const toggle = async (day) => {
    const current = entries.find((entry) => Number(entry.day) === Number(day));
    const nextDone = !current?.completed;
    const nextEntries = entries.map((entry) =>
      Number(entry.day) === Number(day) ? { ...entry, completed: nextDone } : entry
    );
    setEntries(nextEntries);
    onEntriesUpdate?.(nextEntries);

    try {
      await persistDay(day, nextDone);
    } catch (_error) {
      const rolledBack = entries.map((entry) =>
        Number(entry.day) === Number(day) ? { ...entry, completed: Boolean(current?.completed) } : entry
      );
      setEntries(rolledBack);
      onEntriesUpdate?.(rolledBack);
    }
  };

  const saveWeeklySnapshot = () => {
    if (!selfiePreview) {
      pushStatus?.("error", "Upload a selfie and generate a plan before saving weekly snapshot.");
      return;
    }
    const nextSnapshots = [
      ...snapshots,
      {
        id: `snapshot-${Date.now()}`,
        capturedAt: new Date().toISOString(),
        score: Number(latestScore || 0),
        image: selfiePreview,
      },
    ].slice(-6);

    setSnapshots(nextSnapshots);
    writeSnapshots(nextSnapshots);
    pushStatus?.("success", "Weekly selfie snapshot saved for comparison.");
  };

  const firstSnapshot = snapshots[0] || null;
  const latestSnapshot = snapshots[snapshots.length - 1] || null;

  return (
    <section className="beauty-progress-card">
      <div className="beauty-progress-header">
        <h3>7-Day Glow Challenge</h3>
        <span>{completionScore}% complete</span>
      </div>

      <div className="beauty-progress-grid">
        {entries.map((entry) => (
          <button
            key={entry.day}
            type="button"
            className={entry.completed ? "done" : ""}
            disabled={savingDay === entry.day}
            onClick={() => toggle(entry.day)}
          >
            {entry.completed ? "Done" : "Pending"} Day {entry.day}
          </button>
        ))}
      </div>

      <p>Completed: {completedCount}/7</p>

      <div className="beauty-progress-comparison">
        <h4>Week comparison</h4>
        <p>
          Score trend: {firstScore || 0} to {currentScore || 0}
          {trend ? ` (${trend > 0 ? "+" : ""}${trend})` : ""}
        </p>

        <button type="button" onClick={saveWeeklySnapshot}>
          Save weekly selfie snapshot
        </button>

        {firstSnapshot && latestSnapshot ? (
          <div className="beauty-progress-images">
            <figure>
              <img src={firstSnapshot.image} alt="Week one selfie snapshot" />
              <figcaption>Week 1 (Score {Number(firstSnapshot.score || 0)})</figcaption>
            </figure>
            <figure>
              <img src={latestSnapshot.image} alt="Latest selfie snapshot" />
              <figcaption>Latest (Score {Number(latestSnapshot.score || 0)})</figcaption>
            </figure>
          </div>
        ) : (
          <p>Save at least two snapshots to view side-by-side comparison.</p>
        )}
      </div>
    </section>
  );
};

export default BeautyProgressTracker;
