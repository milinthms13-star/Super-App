import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { BACKEND_BASE_URL, buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import KaraokeDuetStudio10 from "./KaraokeDuetStudio10";
import {
  clearRepeatingTask,
  copyToClipboardSafe,
  createIceCandidate,
  createPlatformPeerConnection,
  createPlatformRecorder,
  createSessionDescription,
  decodeJwtPayloadSegment,
  getNetworkSnapshot,
  getRuntimeInfo,
  requestAudioStream,
  setRepeatingTask,
  subscribeNetworkChanges,
} from "./karaokePlatformAdapter";
import "./RemoteKaraokeDuet.css";

const DEFAULT_LYRICS = `0|Duet starts now...
5|Singer A line one
10|Singer B line one
15|Sing together`;

const CREATOR_MOODS = [
  { value: "electric", label: "Electric Stage" },
  { value: "romantic", label: "Romantic Spotlight" },
  { value: "retro", label: "Retro Cassette" },
  { value: "cinematic", label: "Cinematic Anthem" },
];

const SESSION_TEMPLATES = [
  {
    id: "electric",
    label: "Electric Stage",
    title: "Friday Neon Duet",
    bpm: 112,
    mood: "electric",
    lyrics: "0|Lights up, heartbeat starts\n6|Verse one takes the stage\n12|Harmony in the chorus\n18|Finale together",
  },
  {
    id: "romantic",
    label: "Romantic Spotlight",
    title: "Moonlight Harmony",
    bpm: 84,
    mood: "romantic",
    lyrics: "0|Soft piano begins\n6|Whispered first line\n12|Warm harmony lift\n18|Hold the last note",
  },
  {
    id: "retro",
    label: "Retro Cassette",
    title: "Retro Rewind Duet",
    bpm: 96,
    mood: "retro",
    lyrics: "0|Tape spins and snaps in\n6|Groove line one\n12|Call and response hook\n18|Retro chorus burst",
  },
];

const iceServers = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

const decodeJwtSubject = (token = "") => {
  try {
    const payloadSegment = String(token || "").split(".")[1];
    if (!payloadSegment) return "";
    const payload = decodeJwtPayloadSegment(payloadSegment);
    return String(payload?.sub || payload?._id || payload?.id || "").trim();
  } catch (_error) {
    return "";
  }
};

const toLyricsPayload = (rawValue = "") =>
  String(rawValue || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, ...textParts] = line.split("|");
      const timeSec = Number(timePart);
      const text = textParts.join("|").trim();
      if (!Number.isFinite(timeSec) || !text) {
        return null;
      }
      return { timeSec, text };
    })
    .filter(Boolean);

const resolveAssetUrl = (assetUrl = "") => {
  if (!assetUrl) return "";
  if (/^https?:\/\//i.test(assetUrl)) return assetUrl;
  if (assetUrl.startsWith("/")) return `${BACKEND_BASE_URL}${assetUrl}`;
  return assetUrl;
};

const roleForUser = (room, userId) => {
  const participant = (room?.participants || []).find(
    (entry) => String(entry.userId) === String(userId)
  );
  return participant?.role || "guest";
};

const RemoteKaraokeDuet = () => {
  const token = getStoredAuthToken();
  const [status, setStatus] = useState({ type: "", text: "" });
  const [busyKey, setBusyKey] = useState("");

  const [title, setTitle] = useState("Weekend Duet Session");
  const [trackUrl, setTrackUrl] = useState("");
  const [trackBpm, setTrackBpm] = useState(96);
  const [lyricsSource, setLyricsSource] = useState(DEFAULT_LYRICS);
  const [plainLyricsSource, setPlainLyricsSource] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [room, setRoom] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [localTakeBlob, setLocalTakeBlob] = useState(null);
  const [localTakeSeconds, setLocalTakeSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [finalOutputs, setFinalOutputs] = useState([]);

  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [userRooms, setUserRooms] = useState([]);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [creatorPack, setCreatorPack] = useState(null);
  const [creatorPackLoading, setCreatorPackLoading] = useState(false);
  const [creatorMood, setCreatorMood] = useState("electric");
  const [selectedTemplateId, setSelectedTemplateId] = useState(SESSION_TEMPLATES[0].id);
  const [warmupResult, setWarmupResult] = useState(null);
  const [warmupRunning, setWarmupRunning] = useState(false);
  const [networkState, setNetworkState] = useState(getNetworkSnapshot);
  const [runtimeInfo] = useState(getRuntimeInfo);
  const [takeHistory, setTakeHistory] = useState([]);

  const [peerConnected, setPeerConnected] = useState(false);
  const [liveMonitorEnabled, setLiveMonitorEnabled] = useState(true);

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(0);
  const syncIntervalRef = useRef(null);
  const currentUserIdRef = useRef("");
  const roomStartedAtMsRef = useRef(0);
  const peerUserIdRef = useRef("");

  const api = useMemo(
    () =>
      axios.create({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );

  const setBanner = useCallback((type, text) => setStatus({ type, text }), []);

  const withBusy = useCallback(async (key, fn) => {
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey("");
    }
  }, []);

  const loadRoom = useCallback(
    async (roomCode) => {
      const response = await api.get(buildApiUrl(`/karaoke-duet/rooms/${roomCode}`));
      setRoom(response.data.room);
      setFinalOutputs(response.data.room?.finalOutputs || []);
    },
    [api]
  );

  const loadAnalyticsOverview = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');

    try {
      const response = await api.get(buildApiUrl('/karaoke-duet/analytics/overview'));
      if (response.data?.success) {
        setAnalyticsOverview(response.data.overview);
      } else {
        throw new Error(response.data?.message || 'Unable to load duet analytics.');
      }
    } catch (error) {
      setAnalyticsError(error?.response?.data?.message || error?.message || 'Failed to load analytics.');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [api]);

  const loadUserRooms = useCallback(async () => {
    try {
      const response = await api.get(buildApiUrl('/karaoke-duet/rooms/mine'));
      if (response.data?.success) {
        setUserRooms(response.data.rooms || []);
      }
    } catch (_error) {
      // ignore silently; analytics remains best-effort
    }
  }, [api]);

  const applySessionTemplate = useCallback(() => {
    const selected = SESSION_TEMPLATES.find((template) => template.id === selectedTemplateId);
    if (!selected) return;
    setTitle(selected.title);
    setTrackBpm(selected.bpm);
    setLyricsSource(selected.lyrics);
    setPlainLyricsSource(
      selected.lyrics
        .split("\n")
        .map((line) => String(line || "").split("|").slice(1).join("|"))
        .join("\n")
    );
    setCreatorMood(selected.mood);
    setBanner("success", `Applied ${selected.label} template.`);
  }, [selectedTemplateId, setBanner]);

  const runDeviceWarmup = useCallback(async () => {
    setWarmupRunning(true);

    try {
      const checks = [];

      checks.push({
        label: "Runtime compatibility",
        ok: runtimeInfo.hasMediaDevices && runtimeInfo.hasMediaRecorder,
        note: runtimeInfo.isLikelyExpo
          ? "Expo-like runtime detected. Native audio adapter may be required."
          : "Browser media stack available.",
      });

      checks.push({
        label: "WebRTC availability",
        ok: runtimeInfo.hasWebRTC,
        note: runtimeInfo.hasWebRTC ? "Peer connection APIs available." : "WebRTC APIs unavailable in current runtime.",
      });

      const micTest = { label: "Microphone access", ok: false, note: "Not tested." };
      try {
        const stream = await requestAudioStream({ audio: true, video: false });
        micTest.ok = Boolean(stream);
        micTest.note = "Microphone permission granted.";
        stream?.getTracks?.().forEach((track) => track.stop());
        localStreamRef.current = null;
      } catch (error) {
        micTest.ok = false;
        micTest.note = error?.message || "Microphone permission denied.";
      }
      checks.push(micTest);

      checks.push({
        label: "Track source ready",
        ok: Boolean(String(trackUrl || "").trim()),
        note: String(trackUrl || "").trim()
          ? "Karaoke track URL is configured."
          : "Add karaoke track URL before recording.",
      });

      checks.push({
        label: "Network quality",
        ok: networkState.qualityLabel !== "weak",
        note: networkState.effectiveType
          ? `${networkState.effectiveType.toUpperCase()} / ${networkState.downlink || 0} Mbps`
          : "No connection metrics exposed by runtime.",
      });

      const okCount = checks.filter((check) => check.ok).length;
      const score = Math.round((okCount / checks.length) * 100);
      const result = { score, checks };
      setWarmupResult(result);
      setBanner(score >= 70 ? "success" : "error", `Warmup complete (${score}%).`);
    } finally {
      setWarmupRunning(false);
    }
  }, [networkState.downlink, networkState.effectiveType, networkState.qualityLabel, runtimeInfo, setBanner, trackUrl]);

  const generateZeroCostLyricsSync = useCallback(async () => {
    const sourceText = String(plainLyricsSource || lyricsSource || '').trim();
    if (!sourceText) {
      setBanner('error', 'Add plain lyrics text first.');
      return;
    }

    await withBusy('lyrics-sync', async () => {
      try {
        const response = await api.post(buildApiUrl('/karaoke-duet/coach/lyrics-sync'), {
          lyricsText: sourceText,
          bpm: Number(trackBpm || 0) || 96,
          beatsPerLine: 8,
          startTimeSec: 0,
        });

        if (!response.data?.success || !response.data?.data?.script) {
          throw new Error(response.data?.message || 'Unable to generate lyric sync script.');
        }

        setLyricsSource(response.data.data.script);
        setBanner('success', 'Free lyric sync script generated.');
      } catch (error) {
        setBanner('error', error?.response?.data?.message || error?.message || 'Failed to generate lyric sync script.');
      }
    });
  }, [api, lyricsSource, plainLyricsSource, setBanner, trackBpm, withBusy]);

  const loadSessionCoachFeedback = useCallback(
    async (roomSnapshot = room) => {
      if (!roomSnapshot?.roomCode) {
        setCoachFeedback(null);
        return;
      }

      setCoachLoading(true);
      try {
        const response = await api.post(buildApiUrl('/karaoke-duet/coach/session-feedback'), {
          roomCode: roomSnapshot.roomCode,
          context: {
            peerConnected,
            liveMonitorEnabled,
            localTakeSeconds,
          },
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Failed to load duet coaching feedback.');
        }
        setCoachFeedback(response.data?.data || null);
      } catch (_error) {
        // Keep coaching as best effort in zero-cost mode.
      } finally {
        setCoachLoading(false);
      }
    },
    [api, liveMonitorEnabled, localTakeSeconds, peerConnected, room]
  );

  const loadCreatorPack = useCallback(
    async (roomSnapshot = room, mood = creatorMood, fallbackScore = 76) => {
      if (!roomSnapshot?.roomCode) {
        setCreatorPack(null);
        return;
      }

      setCreatorPackLoading(true);
      try {
        const response = await api.post(buildApiUrl("/karaoke-duet/coach/creator-pack"), {
          roomCode: roomSnapshot.roomCode,
          mood,
          overallScore: coachFeedback?.scores?.overallScore,
          fallbackScore,
        });

        if (!response.data?.success) {
          throw new Error(response.data?.message || "Failed to generate creator pack.");
        }
        setCreatorPack(response.data?.data || null);
      } catch (_error) {
        // Keep creator pack best effort in zero-cost mode.
      } finally {
        setCreatorPackLoading(false);
      }
    },
    [api, coachFeedback?.scores?.overallScore, creatorMood, room]
  );

  const teardownPeer = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setPeerConnected(false);
  }, []);

  const ensureMicStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await requestAudioStream({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const startSocket = useCallback(() => {
    if (!token || socketRef.current) return;

    const socket = io(BACKEND_BASE_URL, {
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("connect", () => {
      setBanner("success", "Realtime duet channel connected.");
    });

    socket.on("connect_error", (error) => {
      setBanner("error", error?.message || "Unable to connect realtime duet channel.");
    });

    socket.on("karaoke:error", (payload) => {
      setBanner("error", payload?.message || "Karaoke realtime error.");
    });

    socket.on("karaoke:peer:joined", (payload) => {
      if (payload?.userId) {
        peerUserIdRef.current = String(payload.userId);
      }
      setBanner("success", "Peer joined duet room.");
    });

    socket.on("karaoke:room:joined", (payload) => {
      if (payload?.userId) {
        currentUserIdRef.current = String(payload.userId);
      }
    });

    socket.on("karaoke:peer:left", () => {
      setPeerConnected(false);
      setBanner("error", "Peer left the duet room.");
    });

    socket.on("karaoke:signal", async (signal) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      const type = String(signal?.type || "");
      const payload = signal?.payload || {};

      if (signal?.fromUserId) {
        peerUserIdRef.current = String(signal.fromUserId);
      }

      if (type === "offer") {
        await pc.setRemoteDescription(createSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("karaoke:signal", {
          roomCode: room?.roomCode,
          targetUserId: peerUserIdRef.current,
          type: "answer",
          payload: answer,
        });
      } else if (type === "answer") {
        await pc.setRemoteDescription(createSessionDescription(payload));
      } else if (type === "ice") {
        await pc.addIceCandidate(createIceCandidate(payload));
      }
    });

    socket.on("karaoke:sync", (payload) => {
      if (!payload?.timecodeMs || roomStartedAtMsRef.current <= 0) return;
      setElapsedMs(Number(payload.timecodeMs));
    });

    socket.on("karaoke:recording-state", (payload) => {
      const state = payload?.state || "idle";
      setBanner("success", `Peer recording state: ${state}`);
    });

    socketRef.current = socket;
  }, [room?.roomCode, token, setBanner]);

  const setupPeerConnection = useCallback(async () => {
    startSocket();
    const socket = socketRef.current;
    if (!socket) {
      setBanner("error", "Socket not connected.");
      return;
    }

    const stream = await ensureMicStream();
    teardownPeer();

    const pc = createPlatformPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams?.[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.muted = !liveMonitorEnabled;
      }
      setPeerConnected(true);
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit("karaoke:signal", {
        roomCode: room?.roomCode,
        targetUserId: peerUserIdRef.current || undefined,
        type: "ice",
        payload: event.candidate,
      });
    };
  }, [ensureMicStream, liveMonitorEnabled, room?.roomCode, setBanner, startSocket, teardownPeer]);

  const joinSocketRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !room?.roomCode) return;
    socket.emit("karaoke:room:join", { roomCode: room.roomCode });
  }, [room?.roomCode]);

  const createRoom = useCallback(async () => {
    await withBusy("create-room", async () => {
      try {
        const lyrics = toLyricsPayload(lyricsSource);
        const response = await api.post(buildApiUrl("/karaoke-duet/rooms"), {
          title,
          karaokeTrackUrl: trackUrl,
          karaokeTrackBpm: Number(trackBpm || 0),
          lyrics,
        });

        setRoom(response.data.room);
        setInviteInfo(response.data.invite);
        roomStartedAtMsRef.current = Number(response.data.room?.startedAtMs || 0);
        setFinalOutputs([]);
        setBanner("success", "Room created. Share invite code and link.");
        startSocket();
        void loadAnalyticsOverview();
        void loadUserRooms();
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to create room.");
      }
    });
  }, [api, lyricsSource, setBanner, startSocket, title, trackBpm, trackUrl, withBusy, loadAnalyticsOverview, loadUserRooms]);

  const joinRoom = useCallback(async () => {
    const normalizedCode = String(roomCodeInput || "").trim().toUpperCase();
    if (!normalizedCode) {
      setBanner("error", "Room code is required.");
      return;
    }

    await withBusy("join-room", async () => {
      try {
        const response = await api.post(buildApiUrl(`/karaoke-duet/rooms/${normalizedCode}/join`), {
          inviteToken: inviteTokenInput.trim(),
        });
        setRoom(response.data.room);
        roomStartedAtMsRef.current = Number(response.data.room?.startedAtMs || 0);
        setFinalOutputs(response.data.room?.finalOutputs || []);
        setBanner("success", "Joined duet room.");
        startSocket();
        void loadAnalyticsOverview();
        void loadUserRooms();
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to join room.");
      }
    });
  }, [api, inviteTokenInput, roomCodeInput, setBanner, startSocket, withBusy, loadAnalyticsOverview, loadUserRooms]);

  const startDuet = useCallback(async () => {
    if (!room?.roomCode) return;

    await withBusy("start-duet", async () => {
      try {
        const response = await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/start`));
        setRoom(response.data.room);
        roomStartedAtMsRef.current = Number(response.data.startedAtMs || 0);
        setElapsedMs(0);
        setBanner("success", "Duet clock started.");
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to start duet.");
      }
    });
  }, [api, room?.roomCode, setBanner, withBusy]);

  const startLiveLink = useCallback(async () => {
    if (!room?.roomCode) {
      setBanner("error", "Join a room first.");
      return;
    }

    try {
      await setupPeerConnection();
      joinSocketRoom();

      const pc = peerConnectionRef.current;
      const socket = socketRef.current;
      if (!pc || !socket) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("karaoke:signal", {
        roomCode: room.roomCode,
        targetUserId: peerUserIdRef.current || undefined,
        type: "offer",
        payload: offer,
      });

      setBanner("success", "Live duet link started. Waiting for peer answer...");
    } catch (error) {
      setBanner("error", error.message || "Failed to start live link.");
    }
  }, [joinSocketRoom, room?.roomCode, setBanner, setupPeerConnection]);

  const toggleMonitorAudio = useCallback(() => {
    setLiveMonitorEnabled((prev) => !prev);
  }, []);

  const beginRecording = useCallback(async () => {
    if (!room?.roomCode) {
      setBanner("error", "Join a room first.");
      return;
    }

    try {
      const stream = await ensureMicStream();
      const recorder = createPlatformRecorder(stream, { mimeType: "audio/webm" });
      recordingChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        setLocalTakeBlob(blob);
        const seconds = Math.max(0, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        setLocalTakeSeconds(seconds);
        setTakeHistory((prev) => [
          {
            id: `local-${Date.now()}`,
            source: "local",
            seconds,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8));
        setBanner("success", `Local take recorded (${seconds}s). Upload when ready.`);
      };

      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      recorder.start(1000);
      setIsRecording(true);

      socketRef.current?.emit("karaoke:recording-state", {
        roomCode: room.roomCode,
        state: "recording",
        mutedPeerMonitor: !liveMonitorEnabled,
      });
    } catch (error) {
      setBanner("error", error?.message || "Unable to start local recording on this runtime.");
    }
  }, [ensureMicStream, liveMonitorEnabled, room?.roomCode, setBanner]);

  const stopRecording = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    recorderRef.current.stop();
    setIsRecording(false);
    socketRef.current?.emit("karaoke:recording-state", {
      roomCode: room?.roomCode,
      state: "stopped",
      mutedPeerMonitor: !liveMonitorEnabled,
    });
  }, [liveMonitorEnabled, room?.roomCode]);

  const uploadTake = useCallback(async () => {
    if (!localTakeBlob || !room?.roomCode) {
      setBanner("error", "Record a local take first.");
      return;
    }

    await withBusy("upload-take", async () => {
      try {
        const formData = new FormData();
        formData.append("take", localTakeBlob, `duet-take-${Date.now()}.webm`);
        formData.append("localStartedAtMs", String(recordingStartedAtRef.current || Date.now()));
        formData.append("durationMs", String(Math.max(0, localTakeSeconds * 1000)));
        formData.append("trackOffsetMs", "0");

        await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/takes`), formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await loadRoom(room.roomCode);
        setTakeHistory((prev) => [
          {
            id: `upload-${Date.now()}`,
            source: "uploaded",
            seconds: localTakeSeconds,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 8));
        setBanner("success", "Take uploaded. Wait for both singers, then finalize mix.");
        void loadAnalyticsOverview();
        void loadUserRooms();
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to upload take.");
      }
    });
  }, [api, loadRoom, localTakeBlob, localTakeSeconds, room?.roomCode, setBanner, withBusy, loadAnalyticsOverview, loadUserRooms]);

  const finalizeMix = useCallback(async () => {
    if (!room?.roomCode) return;
    await withBusy("finalize-mix", async () => {
      try {
        const response = await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/finalize`));
        setFinalOutputs(response.data.outputs || []);
        await loadRoom(room.roomCode);
        setBanner("success", "Final duet mix generated.");
        void loadAnalyticsOverview();
        void loadUserRooms();
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Mix generation failed.");
      }
    });
  }, [api, loadAnalyticsOverview, loadRoom, loadUserRooms, room?.roomCode, setBanner, withBusy]);

  useEffect(() => {
    const subject = decodeJwtSubject(token);
    if (subject) {
      currentUserIdRef.current = subject;
    }
  }, [token]);

  useEffect(() => {
    void loadAnalyticsOverview();
    void loadUserRooms();
  }, [loadAnalyticsOverview, loadUserRooms]);

  useEffect(() => {
    const refreshNetwork = () => setNetworkState(getNetworkSnapshot());
    refreshNetwork();
    return subscribeNetworkChanges(refreshNetwork);
  }, []);

  useEffect(() => {
    if (!room?.roomCode) {
      setCoachFeedback(null);
      setCreatorPack(null);
      return;
    }
    void loadSessionCoachFeedback(room);
  }, [
    liveMonitorEnabled,
    loadSessionCoachFeedback,
    localTakeSeconds,
    peerConnected,
    room,
  ]);

  useEffect(() => {
    if (!room?.roomCode) return;
    void loadCreatorPack(room, creatorMood, 76);
  }, [creatorMood, loadCreatorPack, room]);

  useEffect(() => {
    startSocket();
    return () => {
      if (syncIntervalRef.current) {
        clearRepeatingTask(syncIntervalRef.current);
      }
      teardownPeer();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [startSocket, teardownPeer]);

  useEffect(() => {
    if (!room?.roomCode || !roomStartedAtMsRef.current) {
      if (syncIntervalRef.current) {
        clearRepeatingTask(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    if (syncIntervalRef.current) {
      clearRepeatingTask(syncIntervalRef.current);
    }

    const syncTickMs = networkState.qualityLabel === "weak" ? 1500 : 1000;
    let syncWriteCounter = 0;

    syncIntervalRef.current = setRepeatingTask(async () => {
      const now = Date.now();
      const localElapsed = Math.max(0, now - roomStartedAtMsRef.current);
      setElapsedMs(localElapsed);

      const socket = socketRef.current;
      if (socket) {
        socket.emit("karaoke:sync", {
          roomCode: room.roomCode,
          timecodeMs: localElapsed,
          beatCount: Math.floor(localElapsed / 500),
          trackPositionMs: localElapsed,
        });
      }

      syncWriteCounter += 1;
      if (syncWriteCounter % 2 === 0 || networkState.qualityLabel !== "weak") {
        try {
          await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/sync`), {
            latestTimecodeMs: localElapsed,
            beatCount: Math.floor(localElapsed / 500),
          });
        } catch (_error) {
          // Keep local timer running even if sync write fails.
        }
      }
    }, syncTickMs);

    return () => {
      if (syncIntervalRef.current) {
        clearRepeatingTask(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [api, networkState.qualityLabel, room?.roomCode]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !liveMonitorEnabled;
    }
  }, [liveMonitorEnabled]);

  const activeLyricsLine = useMemo(() => {
    const lyrics = room?.lyrics || [];
    if (!lyrics.length) return "";
    const sec = elapsedMs / 1000;
    let current = lyrics[0]?.text || "";
    for (let i = 0; i < lyrics.length; i += 1) {
      if (sec >= Number(lyrics[i].timeSec || 0)) {
        current = lyrics[i].text;
      } else {
        break;
      }
    }
    return current;
  }, [elapsedMs, room?.lyrics]);

  const userRole = useMemo(() => roleForUser(room, currentUserIdRef.current), [room]);
  const takesByRole = useMemo(() => {
    const hostTake = (room?.takes || []).find((take) => take.singerRole === "host");
    const guestTake = (room?.takes || []).find((take) => take.singerRole === "guest");
    return { hostTake, guestTake };
  }, [room?.takes]);

  const roomSummary = useMemo(() => {
    if (!room) return null;

    const participants = Array.isArray(room.participants) ? room.participants : [];
    const participantCount = participants.length;
    const hasGuest = participants.some((participant) => participant.role === 'guest');
    const hasHostTake = Boolean(takesByRole.hostTake);
    const hasGuestTake = Boolean(takesByRole.guestTake);
    const progressSteps = [participantCount >= 1, participantCount >= 2, hasHostTake && hasGuestTake, room.status === 'completed'];
    const progress = Math.round((progressSteps.filter(Boolean).length / progressSteps.length) * 100);
    const isReadyToMix = hasHostTake && hasGuestTake && room.status !== 'mixing';
    const activeTimeSec = room.startedAtMs ? Math.max(0, Math.round((Date.now() - room.startedAtMs) / 1000)) : 0;
    const nextActions = [];

    if (!hasGuest) {
      nextActions.push('Invite a duet partner so the session can begin.');
    }
    if (room.status === 'waiting' && hasGuest) {
      nextActions.push('Start the duet clock to sync both singers.');
    }
    if (!hasHostTake || !hasGuestTake) {
      nextActions.push('Upload or record both singer takes for the final mix.');
    }
    if (isReadyToMix) {
      nextActions.push('Finalize the mix to generate your duet export.');
    }
    if (room.status === 'mixing') {
      nextActions.push('Mix is processing. Wait for the final export to appear.');
    }
    if (room.status === 'completed') {
      nextActions.push('Download your final duet mix and share it with your partner.');
    }

    return {
      participantCount,
      hasGuest,
      hasHostTake,
      hasGuestTake,
      isReadyToMix,
      progress,
      nextActions,
      activeTimeSec,
      lyricLine: activeLyricsLine || 'Waiting for singers...',
      roomHealthScore: Math.min(100, 50 + participantCount * 10 + (hasHostTake ? 15 : 0) + (hasGuestTake ? 15 : 0) + (room.status === 'completed' ? 10 : 0)),
    };
  }, [activeLyricsLine, room, takesByRole]);

  const exportCreatorPackBundle = useCallback(() => {
    if (!creatorPack) {
      setBanner("error", "Generate creator pack first.");
      return;
    }
    if (typeof document === "undefined" || typeof URL === "undefined") {
      setBanner("error", "Bundle export is unavailable in this runtime.");
      return;
    }

    const payload = {
      roomCode: room?.roomCode || "",
      title: room?.title || title,
      generatedAt: new Date().toISOString(),
      creatorPack,
      warmupResult,
      networkState,
    };

    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonAnchor = document.createElement("a");
    jsonAnchor.href = jsonUrl;
    jsonAnchor.download = `karaoke-creator-pack-${room?.roomCode || "session"}.json`;
    jsonAnchor.click();
    URL.revokeObjectURL(jsonUrl);

    const captionText = [
      ...(creatorPack.posterTitles || []),
      "",
      ...(creatorPack.shortCaptions || []),
      "",
      (creatorPack.hashtags || []).join(" "),
      creatorPack.cta || "",
    ]
      .filter(Boolean)
      .join("\n");
    const txtBlob = new Blob([captionText], { type: "text/plain" });
    const txtUrl = URL.createObjectURL(txtBlob);
    const txtAnchor = document.createElement("a");
    txtAnchor.href = txtUrl;
    txtAnchor.download = `karaoke-social-copy-${room?.roomCode || "session"}.txt`;
    txtAnchor.click();
    URL.revokeObjectURL(txtUrl);

    setBanner("success", "Creator pack bundle downloaded.");
  }, [creatorPack, networkState, room?.roomCode, room?.title, setBanner, title, warmupResult]);

  const copyText = useCallback(
    async (value, label = "content") => {
      const text = String(value || "").trim();
      if (!text) {
        setBanner("error", `No ${label} to copy yet.`);
        return;
      }
      try {
        const copied = await copyToClipboardSafe(text);
        if (!copied) {
          setBanner("error", "Clipboard access is not available in this runtime.");
          return;
        }
        setBanner("success", `${label} copied.`);
      } catch (_error) {
        setBanner("error", `Failed to copy ${label}.`);
      }
    },
    [setBanner]
  );

  return (
    <section className="karaoke-shell">
      <header className="karaoke-hero">
        <h1>Remote Karaoke Duet</h1>
        <p>
          Live duet feel + separate local recording + server-side sync/mixing. Two singers in two locations,
          one final song export.
        </p>
        <div className="karaoke-runtime-row">
          <span>
            Runtime: {runtimeInfo.isLikelyExpo ? "Expo-like" : runtimeInfo.isBrowser ? "Browser" : "Unknown"}
          </span>
          <span>
            Network: {networkState.qualityLabel} {networkState.effectiveType ? `(${networkState.effectiveType})` : ""}
          </span>
          <span>MediaRecorder: {runtimeInfo.hasMediaRecorder ? "Yes" : "No"}</span>
          <span>WebRTC: {runtimeInfo.hasWebRTC ? "Yes" : "No"}</span>
        </div>
      </header>

      {status.text ? <div className={`karaoke-status ${status.type}`}>{status.text}</div> : null}
      <KaraokeDuetStudio10 />

      {(analyticsOverview || analyticsLoading) && (
        <section className="karaoke-analytics-panel">
          <div className="karaoke-analytics-head">
            <h2>Duet 360 Insights</h2>
            <p>Track your room performance, completed mixes, and recent duet sessions.</p>
          </div>
          <div className="karaoke-analytics-grid">
            <article>
              <h3>{analyticsOverview ? analyticsOverview.totalRooms : '-'}</h3>
              <p>Rooms created</p>
            </article>
            <article>
              <h3>{analyticsOverview ? analyticsOverview.activeRooms : '-'}</h3>
              <p>Active rooms</p>
            </article>
            <article>
              <h3>{analyticsOverview ? analyticsOverview.completedRooms : '-'}</h3>
              <p>Completed duets</p>
            </article>
            <article>
              <h3>{analyticsOverview ? analyticsOverview.totalMixExports : '-'}</h3>
              <p>Final exports</p>
            </article>
            <article>
              <h3>{analyticsOverview ? `${analyticsOverview.averageBpm} BPM` : '-'}</h3>
              <p>Average track tempo</p>
            </article>
          </div>

          {analyticsError ? <p className="karaoke-error-text">{analyticsError}</p> : null}

          {userRooms.length > 0 ? (
            <div className="karaoke-recent-rooms">
              <h3>Recent duet sessions</h3>
              <div className="karaoke-recent-grid">
                {userRooms.map((roomSummaryItem) => (
                  <article key={roomSummaryItem.roomCode}>
                    <p className="karaoke-room-label">{roomSummaryItem.title}</p>
                    <p>{roomSummaryItem.roomCode} | {roomSummaryItem.status}</p>
                    <p>{roomSummaryItem.takeUploadCount} takes | {roomSummaryItem.finalOutputCount} exports</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      <div className="karaoke-grid">
        <article className="karaoke-card">
          <h2>Create Room</h2>
          <label>
            Session template
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              {SESSION_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={applySessionTemplate}>
            Apply Template
          </button>
          <label>
            Room title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Karaoke track URL (instrumental)
            <input
              placeholder="https://.../karaoke-track.mp3"
              value={trackUrl}
              onChange={(event) => setTrackUrl(event.target.value)}
            />
          </label>
          <label>
            BPM
            <input
              type="number"
              min="0"
              value={trackBpm}
              onChange={(event) => setTrackBpm(Number(event.target.value || 0))}
            />
          </label>
          <label>
            Plain lyrics (optional)
            <textarea
              rows={4}
              value={plainLyricsSource}
              onChange={(event) => setPlainLyricsSource(event.target.value)}
              placeholder="Paste untimed lyrics. We will generate free sync timing."
            />
          </label>
          <label>
            Lyrics sync script (`seconds|line`)
            <textarea
              rows={5}
              value={lyricsSource}
              onChange={(event) => setLyricsSource(event.target.value)}
            />
          </label>
          <button onClick={generateZeroCostLyricsSync} disabled={busyKey === "lyrics-sync"}>
            {busyKey === "lyrics-sync" ? "Generating..." : "Auto Sync Lyrics (Free)"}
          </button>
          <button onClick={createRoom} disabled={busyKey === "create-room"}>
            {busyKey === "create-room" ? "Creating..." : "Create Karaoke Room"}
          </button>
          {inviteInfo ? (
            <div className="karaoke-invite">
              <p><strong>Code:</strong> {inviteInfo.code}</p>
              <p><strong>Token:</strong> {inviteInfo.token}</p>
              <p className="invite-link">{inviteInfo.joinUrl}</p>
            </div>
          ) : null}
        </article>

        <article className="karaoke-card">
          <h2>Join Room</h2>
          <label>
            Room code
            <input
              value={roomCodeInput}
              onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
            />
          </label>
          <label>
            Invite token (optional if room is open)
            <input value={inviteTokenInput} onChange={(event) => setInviteTokenInput(event.target.value)} />
          </label>
          <button onClick={joinRoom} disabled={busyKey === "join-room"}>
            {busyKey === "join-room" ? "Joining..." : "Join Karaoke Room"}
          </button>
        </article>
      </div>

      {room ? (
        <section className="karaoke-card">
          <h2>Duet Room: {room.roomCode}</h2>
          <div className="karaoke-room-meta">
            <span>Status: {room.status}</span>
            <span>Participants: {(room.participants || []).length}/2</span>
            <span>Role: {userRole}</span>
            <span>Peer link: {peerConnected ? "Connected" : "Not connected"}</span>
            <span>Network: {networkState.qualityLabel}</span>
          </div>

          {roomSummary ? (
            <div className="karaoke-room-summary">
              <div>
                <h4>Session score</h4>
                <p>{roomSummary.roomHealthScore}% healthy</p>
              </div>
              <div>
                <h4>Duet readiness</h4>
                <p>{roomSummary.isReadyToMix ? 'Ready to finalize' : 'Waiting on takes or partner'}</p>
              </div>
              <div>
                <h4>Progress</h4>
                <p>{roomSummary.progress}% complete</p>
              </div>
              <div>
                <h4>Live time</h4>
                <p>{Math.floor(roomSummary.activeTimeSec / 60)}m {roomSummary.activeTimeSec % 60}s</p>
              </div>
            </div>
          ) : null}

          <div className="karaoke-warmup-panel">
            <div className="karaoke-warmup-head">
              <h4>Device Warmup</h4>
              <button type="button" onClick={() => void runDeviceWarmup()} disabled={warmupRunning}>
                {warmupRunning ? "Checking..." : "Run Device Check"}
              </button>
            </div>
            {warmupResult ? (
              <>
                <p className="karaoke-warmup-score">Readiness: {warmupResult.score}%</p>
                <ul className="karaoke-warmup-list">
                  {(warmupResult.checks || []).map((check, index) => (
                    <li key={`warmup-${index}`}>
                      <strong>{check.ok ? "OK" : "Fix"}:</strong> {check.label} - {check.note}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="karaoke-coach-placeholder">
                Run a quick device check before starting live duet.
              </p>
            )}
          </div>

          <div className="karaoke-coach-panel">
            <div className="karaoke-coach-head">
              <h4>Free Duet Coach (Zero Cost)</h4>
              <button
                type="button"
                onClick={() => {
                  void loadSessionCoachFeedback(room);
                }}
                disabled={coachLoading}
              >
                {coachLoading ? 'Refreshing...' : 'Refresh Coach'}
              </button>
            </div>
            {coachFeedback?.scores ? (
              <div className="karaoke-coach-grid">
                <article>
                  <h5>{coachFeedback.scores.overallScore ?? 0}%</h5>
                  <p>Overall</p>
                </article>
                <article>
                  <h5>{coachFeedback.scores.timingScore ?? 0}%</h5>
                  <p>Timing</p>
                </article>
                <article>
                  <h5>{coachFeedback.scores.collaborationScore ?? 0}%</h5>
                  <p>Collaboration</p>
                </article>
                <article>
                  <h5>{coachFeedback.scores.completionScore ?? 0}%</h5>
                  <p>Completion</p>
                </article>
                <article>
                  <h5>{coachFeedback.scores.syncScore ?? 0}%</h5>
                  <p>Sync Health</p>
                </article>
              </div>
            ) : (
              <p className="karaoke-coach-placeholder">
                {coachLoading ? 'Analyzing current session...' : 'Coach feedback appears after room activity.'}
              </p>
            )}
            {coachFeedback?.nextSteps?.length ? (
              <ul className="karaoke-coach-actions">
                {coachFeedback.nextSteps.map((step, index) => (
                  <li key={`coach-step-${index}`}>{step}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="karaoke-creator-panel">
            <div className="karaoke-creator-head">
              <h4>Canva Creator Pack (Zero Cost)</h4>
              <div className="karaoke-creator-controls">
                <select
                  value={creatorMood}
                  onChange={(event) => setCreatorMood(event.target.value)}
                >
                  {CREATOR_MOODS.map((mood) => (
                    <option key={mood.value} value={mood.value}>
                      {mood.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    void loadCreatorPack(room, creatorMood, roomSummary?.roomHealthScore || 76);
                  }}
                  disabled={creatorPackLoading}
                >
                  {creatorPackLoading ? "Generating..." : "Refresh Pack"}
                </button>
                <button type="button" onClick={exportCreatorPackBundle}>
                  Export Bundle
                </button>
              </div>
            </div>

            {creatorPack ? (
              <div className="karaoke-creator-grid">
                <article>
                  <h5>Poster Titles</h5>
                  <ul>
                    {(creatorPack.posterTitles || []).map((item, index) => (
                      <li key={`poster-title-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => copyText((creatorPack.posterTitles || []).join("\n"), "poster titles")}
                  >
                    Copy Titles
                  </button>
                </article>

                <article>
                  <h5>Captions</h5>
                  <ul>
                    {(creatorPack.shortCaptions || []).map((item, index) => (
                      <li key={`caption-${index}`}>{item}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => copyText((creatorPack.shortCaptions || []).join("\n"), "captions")}
                  >
                    Copy Captions
                  </button>
                </article>

                <article>
                  <h5>Hashtags + CTA</h5>
                  <p className="karaoke-creator-hash">{(creatorPack.hashtags || []).join(" ")}</p>
                  <p className="karaoke-creator-cta">{creatorPack.cta}</p>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `${(creatorPack.hashtags || []).join(" ")}\n${creatorPack.cta || ""}`.trim(),
                        "hashtags"
                      )
                    }
                  >
                    Copy Hashtags
                  </button>
                </article>

                <article>
                  <h5>Theme Direction</h5>
                  <p>{creatorPack.theme?.name || "Theme"}</p>
                  <p>{creatorPack.theme?.fontPair || ""}</p>
                  <div className="karaoke-creator-palette">
                    {(creatorPack.theme?.palette || []).map((swatch) => (
                      <span
                        key={swatch}
                        style={{ background: swatch }}
                        title={swatch}
                        aria-label={`Color ${swatch}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        `${creatorPack.theme?.name || ""}\n${creatorPack.theme?.fontPair || ""}\n${(
                          creatorPack.theme?.palette || []
                        ).join(", ")}`.trim(),
                        "theme brief"
                      )
                    }
                  >
                    Copy Theme
                  </button>
                </article>
              </div>
            ) : (
              <p className="karaoke-coach-placeholder">
                {creatorPackLoading
                  ? "Preparing creator pack..."
                  : "Creator pack appears after room data is available."}
              </p>
            )}
          </div>

          {roomSummary?.nextActions?.length ? (
            <div className="karaoke-actions-panel">
              <h4>Recommended next steps</h4>
              <ul>
                {roomSummary.nextActions.map((action, index) => (
                  <li key={`action-${index}`}>{action}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="karaoke-actions">
            <button onClick={joinSocketRoom}>Join Realtime Channel</button>
            <button onClick={startDuet} disabled={busyKey === "start-duet"}>
              {busyKey === "start-duet" ? "Starting..." : "Start Duet Clock"}
            </button>
            <button onClick={startLiveLink}>Start Live Duet Link</button>
            <button onClick={toggleMonitorAudio}>
              {liveMonitorEnabled ? "Mute Peer Monitor" : "Unmute Peer Monitor"}
            </button>
          </div>

          <div className="karaoke-live-panel">
            <div>
              <p className="karaoke-timecode">Timecode: {(elapsedMs / 1000).toFixed(1)}s</p>
              <p className="karaoke-lyrics-line">{activeLyricsLine || "Waiting for lyrics..."}</p>
            </div>
            <audio ref={remoteAudioRef} autoPlay controls />
          </div>

          <div className="karaoke-record-grid">
            <article>
              <h3>Local Recording</h3>
              <div className="karaoke-actions">
                {!isRecording ? (
                  <button onClick={beginRecording}>Start Local Recording</button>
                ) : (
                  <button onClick={stopRecording}>Stop Recording</button>
                )}
                <button onClick={uploadTake} disabled={!localTakeBlob || busyKey === "upload-take"}>
                  {busyKey === "upload-take" ? "Uploading..." : "Upload My Take"}
                </button>
              </div>
              <p>Latest take: {localTakeBlob ? `${localTakeSeconds}s captured` : "No local take yet"}</p>
            </article>

            <article>
              <h3>Server Takes</h3>
              <p>Host take: {takesByRole.hostTake ? "Uploaded" : "Pending"}</p>
              <p>Guest take: {takesByRole.guestTake ? "Uploaded" : "Pending"}</p>
              <button onClick={finalizeMix} disabled={busyKey === "finalize-mix"}>
                {busyKey === "finalize-mix" ? "Mixing..." : "Generate Final Mix"}
              </button>
            </article>
          </div>

          {takeHistory.length ? (
            <div className="karaoke-take-history">
              <h4>Take Timeline</h4>
              <ul>
                {takeHistory.map((item) => (
                  <li key={item.id}>
                    {item.source} take - {item.seconds}s at{" "}
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="karaoke-final">
            <h3>Final Output</h3>
            {finalOutputs.length === 0 ? (
              <p>No exports yet.</p>
            ) : (
              <ul>
                {finalOutputs.map((output) => (
                  <li key={`${output.format}-${output.outputUrl}`}>
                    <a href={resolveAssetUrl(output.outputUrl)} target="_blank" rel="noreferrer">
                      Download {String(output.format || "").toUpperCase()}
                    </a>
                    <span>
                      {" "}
                      ({Math.round(Number(output.fileSizeBytes || 0) / 1024)} KB)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default RemoteKaraokeDuet;
