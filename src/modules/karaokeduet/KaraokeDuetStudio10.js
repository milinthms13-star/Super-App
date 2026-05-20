import React, { useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_BASE_URL, buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
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

  const stopStreamTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((trackItem) => trackItem.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async (target) => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setStatus({ type: "error", text: "Microphone recording is not supported in this browser." });
        return;
      }

      recordingTargetRef.current = target;
      chunksRef.current = [];
      setRecordingTarget(target);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
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
        window.open(resolveAssetUrl(data.data.outputUrl), "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      setStatus({ type: "error", text: readErrorMessage(error) });
    } finally {
      setIsExporting(false);
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
        <button type="button" onClick={exportDuet} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export Studio Duet"}
        </button>
      </div>
    </section>
  );
};

export default KaraokeDuetStudio10;
