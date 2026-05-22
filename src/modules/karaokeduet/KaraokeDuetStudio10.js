import React, { useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_BASE_URL, buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import {
  copyToClipboardSafe,
  createPlatformRecorder,
  getNetworkSnapshot,
  getRuntimeInfo,
  openExternalAsset,
  requestAudioStream,
  subscribeNetworkChanges,
} from "./karaokePlatformAdapter";
import "./KaraokeDuetStudio10.css";

const emptyStatus = { type: "", text: "" };

const readErrorMessage = (error) =>
  String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Export failed."
  );

const createObjectUrl = (file) => (file ? URL.createObjectURL(file) : "");

const CREATOR_MOODS = [
  { value: "electric", label: "Electric Stage" },
  { value: "romantic", label: "Romantic Spotlight" },
  { value: "retro", label: "Retro Cassette" },
  { value: "cinematic", label: "Cinematic Anthem" },
];

const resolveAssetUrl = (assetUrl = "") => {
  if (!assetUrl) return "";
  if (/^https?:\/\//i.test(assetUrl)) return assetUrl;
  if (assetUrl.startsWith("/")) return `${BACKEND_BASE_URL}${assetUrl}`;
  return assetUrl;
};

const KaraokeDuetStudio10 = () => {
  const token = getStoredAuthToken();

  const [track, setTrack] = useState(null);
  const [voiceA, setVoiceA] = useState(null);
  const [voiceB, setVoiceB] = useState(null);
  const [lyrics, setLyrics] = useState("");
  const [delayA, setDelayA] = useState("0");
  const [delayB, setDelayB] = useState("0");
  const [volumeA, setVolumeA] = useState("1");
  const [volumeB, setVolumeB] = useState("1");
  const [status, setStatus] = useState(emptyStatus);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [studioFeedback, setStudioFeedback] = useState(null);
  const [creatorMood, setCreatorMood] = useState("electric");
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorPack, setCreatorPack] = useState(null);
  const [runtimeInfo] = useState(getRuntimeInfo);
  const [networkState, setNetworkState] = useState(getNetworkSnapshot);
  const [warmupResult, setWarmupResult] = useState(null);
  const [warmupLoading, setWarmupLoading] = useState(false);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingTargetRef = useRef("A");

  const [recordingTarget, setRecordingTarget] = useState("");

  const trackPreview = useMemo(() => createObjectUrl(track), [track]);
  const voiceAPreview = useMemo(() => createObjectUrl(voiceA), [voiceA]);
  const voiceBPreview = useMemo(() => createObjectUrl(voiceB), [voiceB]);

  useEffect(() => {
    return () => {
      if (trackPreview) URL.revokeObjectURL(trackPreview);
    };
  }, [trackPreview]);

  useEffect(() => {
    return () => {
      if (voiceAPreview) URL.revokeObjectURL(voiceAPreview);
    };
  }, [voiceAPreview]);

  useEffect(() => {
    return () => {
      if (voiceBPreview) URL.revokeObjectURL(voiceBPreview);
    };
  }, [voiceBPreview]);

  useEffect(() => {
    const refreshNetwork = () => setNetworkState(getNetworkSnapshot());
    refreshNetwork();
    return subscribeNetworkChanges(refreshNetwork);
  }, []);

  const stopStreamTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((trackItem) => trackItem.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async (target) => {
    try {
      recordingTargetRef.current = target;
      chunksRef.current = [];
      setRecordingTarget(target);

      const stream = await requestAudioStream({ audio: true });
      streamRef.current = stream;

      const recorder = createPlatformRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `singer-${target}-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        if (target === "A") {
          setVoiceA(file);
        } else {
          setVoiceB(file);
        }

        stopStreamTracks();
        setRecordingTarget("");
        setStatus({ type: "success", text: `Singer ${target} recording saved.` });
      };

      recorder.start(500);
      setStatus({ type: "success", text: `Recording Singer ${target}...` });
    } catch (error) {
      stopStreamTracks();
      setRecordingTarget("");
      setStatus({ type: "error", text: readErrorMessage(error) });
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }
    recorderRef.current.stop();
  };

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch (_error) {
        // no-op
      }
      stopStreamTracks();
    };
  }, []);

  const exportDuet = async () => {
    if (!track || !voiceA || !voiceB) {
      setStatus({ type: "error", text: "Please add karaoke track and both singer voices." });
      return;
    }

    setIsExporting(true);
    setStatus({ type: "success", text: "Mixing duet audio..." });

    const formData = new FormData();
    formData.append("track", track);
    formData.append("voiceA", voiceA);
    formData.append("voiceB", voiceB);
    formData.append("delayA", String(delayA || 0));
    formData.append("delayB", String(delayB || 0));
    formData.append("volumeA", String(volumeA || 1));
    formData.append("volumeB", String(volumeB || 1));
    formData.append("lyrics", lyrics);

    try {
      const response = await fetch(buildApiUrl("/karaokeduet/export"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Mix export failed.");
      }

      setStatus({ type: "success", text: "Duet exported successfully." });
      if (data?.data?.outputUrl) {
        openExternalAsset(resolveAssetUrl(data.data.outputUrl));
      }
    } catch (error) {
      setStatus({ type: "error", text: readErrorMessage(error) });
    } finally {
      setIsExporting(false);
    }
  };

  const generateStudioFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const response = await fetch(buildApiUrl("/karaoke-duet/coach/studio-feedback"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          delayASeconds: Number(delayA || 0),
          delayBSeconds: Number(delayB || 0),
          volumeA: Number(volumeA || 1),
          volumeB: Number(volumeB || 1),
          hasTrack: Boolean(track),
          hasVoiceA: Boolean(voiceA),
          hasVoiceB: Boolean(voiceB),
          lyricsLength: String(lyrics || "").trim().length,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Unable to generate free studio feedback.");
      }

      setStudioFeedback(data.data || null);
      setStatus({ type: "success", text: "Free studio coach insights updated." });
    } catch (error) {
      setStatus({ type: "error", text: readErrorMessage(error) });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const generateStudioCreatorPack = async () => {
    setCreatorLoading(true);
    try {
      const response = await fetch(buildApiUrl("/karaoke-duet/coach/creator-pack"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: "Studio Karaoke Duet",
          karaokeTrackBpm: 96,
          mood: creatorMood,
          lyrics: String(lyrics || "")
            .split("\n")
            .map((line, index) => ({ text: String(line || "").trim(), timeSec: index * 4 }))
            .filter((line) => line.text),
          overallScore: studioFeedback?.scores?.overallScore || 0,
          fallbackScore: 74,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Unable to generate creator pack.");
      }
      setCreatorPack(data.data || null);
      setStatus({ type: "success", text: "Studio creator pack is ready." });
    } catch (error) {
      setStatus({ type: "error", text: readErrorMessage(error) });
    } finally {
      setCreatorLoading(false);
    }
  };

  const copyText = async (value, label = "content") => {
    const text = String(value || "").trim();
    if (!text) {
      setStatus({ type: "error", text: `No ${label} to copy.` });
      return;
    }
    try {
      const copied = await copyToClipboardSafe(text);
      if (!copied) {
        setStatus({ type: "error", text: "Clipboard is not available in this runtime." });
        return;
      }
      setStatus({ type: "success", text: `${label} copied.` });
    } catch (_error) {
      setStatus({ type: "error", text: `Failed to copy ${label}.` });
    }
  };

  const runStudioWarmup = async () => {
    setWarmupLoading(true);
    try {
      const checks = [];
      checks.push({
        label: "MediaRecorder support",
        ok: runtimeInfo.hasMediaRecorder,
        note: runtimeInfo.hasMediaRecorder ? "Recorder available." : "Recorder unavailable for this runtime.",
      });
      checks.push({
        label: "Microphone access",
        ok: false,
        note: "",
      });

      try {
        const stream = await requestAudioStream({ audio: true });
        checks[checks.length - 1].ok = true;
        checks[checks.length - 1].note = "Microphone permission granted.";
        stream?.getTracks?.().forEach((track) => track.stop());
      } catch (error) {
        checks[checks.length - 1].ok = false;
        checks[checks.length - 1].note = error?.message || "Microphone access failed.";
      }

      checks.push({
        label: "Network quality",
        ok: networkState.qualityLabel !== "weak",
        note: networkState.effectiveType
          ? `${networkState.effectiveType.toUpperCase()} / ${networkState.downlink || 0} Mbps`
          : "No connection metrics available.",
      });

      const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);
      setWarmupResult({ score, checks });
      setStatus({ type: score >= 67 ? "success" : "error", text: `Studio warmup complete (${score}%).` });
    } finally {
      setWarmupLoading(false);
    }
  };

  return (
    <section className="kd10-shell">
      <header className="kd10-hero">
        <div>
          <p className="kd10-tag">KaraokeDuet Studio 10</p>
          <h2>Track + Singer A/B + Sync + Final Export</h2>
          <p>
            Keep your remote duet room workflow and also create one-device studio duets with lyric notes,
            delay sync, volume balancing, and final MP3 export.
          </p>
          <div className="kd10-runtime-row">
            <span>Runtime: {runtimeInfo.isLikelyExpo ? "Expo-like" : runtimeInfo.isBrowser ? "Browser" : "Unknown"}</span>
            <span>Network: {networkState.qualityLabel}</span>
            <span>Recorder: {runtimeInfo.hasMediaRecorder ? "Yes" : "No"}</span>
          </div>
        </div>
      </header>

      {status.text ? <div className={`kd10-status ${status.type}`}>{status.text}</div> : null}

      <div className="kd10-grid">
        <article className="kd10-card">
          <h3>Karaoke Track</h3>
          <label className="kd10-upload">
            Upload music track
            <input type="file" accept="audio/*" hidden onChange={(event) => setTrack(event.target.files?.[0] || null)} />
          </label>
          <p>{track?.name || "No track selected"}</p>
          {trackPreview ? <audio controls src={trackPreview} /> : null}

          <label>
            Lyrics notes
            <textarea
              value={lyrics}
              onChange={(event) => setLyrics(event.target.value)}
              placeholder="Paste lyrics or cue lines for singers..."
            />
          </label>
        </article>

        <article className="kd10-card">
          <h3>Singer A</h3>
          <div className="kd10-actions">
            <button type="button" onClick={() => startRecording("A")} disabled={recordingTarget !== ""}>
              Record A
            </button>
            <button type="button" onClick={stopRecording} disabled={recordingTarget !== "A"}>
              Stop
            </button>
          </div>
          <label className="kd10-upload">
            Upload Singer A
            <input type="file" accept="audio/*" hidden onChange={(event) => setVoiceA(event.target.files?.[0] || null)} />
          </label>
          <p>{voiceA?.name || "No Singer A audio selected"}</p>
          {voiceAPreview ? <audio controls src={voiceAPreview} /> : null}
          <label>
            Delay A (seconds)
            <input type="number" step="0.1" value={delayA} onChange={(event) => setDelayA(event.target.value)} />
          </label>
          <label>
            Volume A
            <input type="range" min="0" max="2" step="0.1" value={volumeA} onChange={(event) => setVolumeA(event.target.value)} />
          </label>
        </article>

        <article className="kd10-card">
          <h3>Singer B</h3>
          <div className="kd10-actions">
            <button type="button" onClick={() => startRecording("B")} disabled={recordingTarget !== ""}>
              Record B
            </button>
            <button type="button" onClick={stopRecording} disabled={recordingTarget !== "B"}>
              Stop
            </button>
          </div>
          <label className="kd10-upload">
            Upload Singer B
            <input type="file" accept="audio/*" hidden onChange={(event) => setVoiceB(event.target.files?.[0] || null)} />
          </label>
          <p>{voiceB?.name || "No Singer B audio selected"}</p>
          {voiceBPreview ? <audio controls src={voiceBPreview} /> : null}
          <label>
            Delay B (seconds)
            <input type="number" step="0.1" value={delayB} onChange={(event) => setDelayB(event.target.value)} />
          </label>
          <label>
            Volume B
            <input type="range" min="0" max="2" step="0.1" value={volumeB} onChange={(event) => setVolumeB(event.target.value)} />
          </label>
        </article>
      </div>

      <div className="kd10-export">
        <button type="button" onClick={runStudioWarmup} disabled={warmupLoading}>
          {warmupLoading ? "Checking..." : "Warmup Check"}
        </button>
        <button type="button" onClick={generateStudioFeedback} disabled={feedbackLoading}>
          {feedbackLoading ? "Analyzing..." : "Free Mix Coach"}
        </button>
        <select value={creatorMood} onChange={(event) => setCreatorMood(event.target.value)}>
          {CREATOR_MOODS.map((mood) => (
            <option key={mood.value} value={mood.value}>
              {mood.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={generateStudioCreatorPack} disabled={creatorLoading}>
          {creatorLoading ? "Generating..." : "Canva Pack"}
        </button>
        <button type="button" onClick={exportDuet} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export Studio Duet"}
        </button>
      </div>

      {warmupResult ? (
        <section className="kd10-warmup">
          <h3>Studio Warmup</h3>
          <p>Readiness: {warmupResult.score}%</p>
          <ul>
            {(warmupResult.checks || []).map((check, index) => (
              <li key={`studio-warmup-${index}`}>
                <strong>{check.ok ? "OK" : "Fix"}:</strong> {check.label} - {check.note}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {studioFeedback?.scores ? (
        <section className="kd10-feedback">
          <h3>Zero-Cost Studio Feedback</h3>
          <div className="kd10-feedback-grid">
            <article>
              <h4>{studioFeedback.scores.overallScore ?? 0}%</h4>
              <p>Overall</p>
            </article>
            <article>
              <h4>{studioFeedback.scores.syncScore ?? 0}%</h4>
              <p>Sync</p>
            </article>
            <article>
              <h4>{studioFeedback.scores.balanceScore ?? 0}%</h4>
              <p>Balance</p>
            </article>
            <article>
              <h4>{studioFeedback.scores.readinessScore ?? 0}%</h4>
              <p>Readiness</p>
            </article>
            <article>
              <h4>{studioFeedback.scores.preparationScore ?? 0}%</h4>
              <p>Prep</p>
            </article>
          </div>
          {studioFeedback?.suggestions?.length ? (
            <ul>
              {studioFeedback.suggestions.map((item, index) => (
                <li key={`studio-tip-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {creatorPack ? (
        <section className="kd10-creator">
          <h3>Studio Canva Creator Pack</h3>
          <div className="kd10-creator-grid">
            <article>
              <h4>Titles</h4>
              <ul>
                {(creatorPack.posterTitles || []).map((item, index) => (
                  <li key={`studio-title-${index}`}>{item}</li>
                ))}
              </ul>
              <button type="button" onClick={() => copyText((creatorPack.posterTitles || []).join("\n"), "titles")}>
                Copy Titles
              </button>
            </article>
            <article>
              <h4>Captions</h4>
              <ul>
                {(creatorPack.shortCaptions || []).map((item, index) => (
                  <li key={`studio-caption-${index}`}>{item}</li>
                ))}
              </ul>
              <button type="button" onClick={() => copyText((creatorPack.shortCaptions || []).join("\n"), "captions")}>
                Copy Captions
              </button>
            </article>
            <article>
              <h4>Hashtags</h4>
              <p>{(creatorPack.hashtags || []).join(" ")}</p>
              <button type="button" onClick={() => copyText((creatorPack.hashtags || []).join(" "), "hashtags")}>
                Copy Hashtags
              </button>
            </article>
            <article>
              <h4>Theme</h4>
              <p>{creatorPack.theme?.name || "Theme"}</p>
              <p>{creatorPack.theme?.fontPair || ""}</p>
              <div className="kd10-palette">
                {(creatorPack.theme?.palette || []).map((swatch) => (
                  <span key={swatch} style={{ background: swatch }} title={swatch} />
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default KaraokeDuetStudio10;
