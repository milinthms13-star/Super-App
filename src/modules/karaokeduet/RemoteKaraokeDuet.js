import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { BACKEND_BASE_URL, buildApiUrl } from "../../utils/api";
import { getStoredAuthToken } from "../../utils/auth";
import "./RemoteKaraokeDuet.css";

const DEFAULT_LYRICS = `0|Duet starts now...
5|Singer A line one
10|Singer B line one
15|Sing together`;

const iceServers = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
};

const decodeJwtSubject = (token = "") => {
  try {
    const payloadSegment = String(token || "").split(".")[1];
    if (!payloadSegment) return "";
    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(window.atob(padded));
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
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [room, setRoom] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [localTakeBlob, setLocalTakeBlob] = useState(null);
  const [localTakeSeconds, setLocalTakeSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [finalOutputs, setFinalOutputs] = useState([]);

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
    const stream = await navigator.mediaDevices.getUserMedia({
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
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("karaoke:signal", {
          roomCode: room?.roomCode,
          targetUserId: peerUserIdRef.current,
          type: "answer",
          payload: answer,
        });
      } else if (type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));
      } else if (type === "ice") {
        await pc.addIceCandidate(new RTCIceCandidate(payload));
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

    const pc = new RTCPeerConnection(iceServers);
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
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to create room.");
      }
    });
  }, [api, lyricsSource, setBanner, startSocket, title, trackBpm, trackUrl, withBusy]);

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
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to join room.");
      }
    });
  }, [api, inviteTokenInput, roomCodeInput, setBanner, startSocket, withBusy]);

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

    const stream = await ensureMicStream();
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
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
        setBanner("success", "Take uploaded. Wait for both singers, then finalize mix.");
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Failed to upload take.");
      }
    });
  }, [api, loadRoom, localTakeBlob, localTakeSeconds, room?.roomCode, setBanner, withBusy]);

  const finalizeMix = useCallback(async () => {
    if (!room?.roomCode) return;
    await withBusy("finalize-mix", async () => {
      try {
        const response = await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/finalize`));
        setFinalOutputs(response.data.outputs || []);
        await loadRoom(room.roomCode);
        setBanner("success", "Final duet mix generated.");
      } catch (error) {
        setBanner("error", error?.response?.data?.message || "Mix generation failed.");
      }
    });
  }, [api, loadRoom, room?.roomCode, setBanner, withBusy]);

  useEffect(() => {
    const subject = decodeJwtSubject(token);
    if (subject) {
      currentUserIdRef.current = subject;
    }
  }, [token]);

  useEffect(() => {
    startSocket();
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
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
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    syncIntervalRef.current = window.setInterval(async () => {
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

      try {
        await api.post(buildApiUrl(`/karaoke-duet/rooms/${room.roomCode}/sync`), {
          latestTimecodeMs: localElapsed,
          beatCount: Math.floor(localElapsed / 500),
        });
      } catch (_error) {
        // Keep local timer running even if sync write fails.
      }
    }, 1000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [api, room?.roomCode]);

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

  return (
    <section className="karaoke-shell">
      <header className="karaoke-hero">
        <h1>Remote Karaoke Duet</h1>
        <p>
          Live duet feel + separate local recording + server-side sync/mixing. Two singers in two locations,
          one final song export.
        </p>
      </header>

      {status.text ? <div className={`karaoke-status ${status.type}`}>{status.text}</div> : null}

      <div className="karaoke-grid">
        <article className="karaoke-card">
          <h2>Create Room</h2>
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
            Lyrics sync script (`seconds|line`)
            <textarea
              rows={5}
              value={lyricsSource}
              onChange={(event) => setLyricsSource(event.target.value)}
            />
          </label>
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
          </div>

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
