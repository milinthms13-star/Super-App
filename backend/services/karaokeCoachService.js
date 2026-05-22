const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLyricLine = (line = '') =>
  String(line || '')
    .replace(/^\s*[-*\u2022]+\s*/, '')
    .replace(/^\s*\d+[\).:-]\s*/, '')
    .trim();

const toPlainLines = (lyricsText = '') =>
  String(lyricsText || '')
    .split('\n')
    .map(normalizeLyricLine)
    .filter(Boolean);

const parseTimedLyrics = (lyricsText = '') =>
  String(lyricsText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [timePart, ...textParts] = line.split('|');
      const timeSec = Number(timePart);
      const text = textParts.join('|').trim();
      if (!Number.isFinite(timeSec) || !text) return null;
      return {
        timeSec: Math.max(0, Math.round(timeSec * 10) / 10),
        text,
      };
    })
    .filter(Boolean);

const generateLyricsSyncScript = ({
  lyricsText = '',
  bpm = 96,
  beatsPerLine = 8,
  startTimeSec = 0,
} = {}) => {
  const timedInput = parseTimedLyrics(lyricsText);
  if (timedInput.length >= 2) {
    const script = timedInput.map((item) => `${item.timeSec}|${item.text}`).join('\n');
    return {
      mode: 'already_timed',
      script,
      lyrics: timedInput,
      meta: {
        lineCount: timedInput.length,
        averageStepSec:
          timedInput.length > 1
            ? Math.round(
                ((timedInput[timedInput.length - 1].timeSec - timedInput[0].timeSec) /
                  (timedInput.length - 1)) *
                  10
              ) / 10
            : 0,
      },
    };
  }

  const lines = toPlainLines(lyricsText).slice(0, 80);
  const safeBpm = clamp(Math.round(asNumber(bpm, 96)), 40, 220);
  const safeBeatsPerLine = clamp(Math.round(asNumber(beatsPerLine, 8)), 2, 24);
  const safeStart = Math.max(0, asNumber(startTimeSec, 0));

  const secondsPerBeat = 60 / safeBpm;
  const lineStepSec = Math.max(1, Math.round(secondsPerBeat * safeBeatsPerLine * 10) / 10);

  const generated = lines.map((text, index) => ({
    timeSec: Math.round((safeStart + index * lineStepSec) * 10) / 10,
    text,
  }));

  const script = generated.map((item) => `${item.timeSec}|${item.text}`).join('\n');
  const estimatedDurationSec = generated.length
    ? Math.round((generated[generated.length - 1].timeSec + lineStepSec) * 10) / 10
    : 0;

  return {
    mode: 'generated',
    script,
    lyrics: generated,
    meta: {
      lineCount: generated.length,
      bpm: safeBpm,
      beatsPerLine: safeBeatsPerLine,
      lineStepSec,
      estimatedDurationSec,
    },
  };
};

const round = (value, precision = 1) => {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
};

const safeText = (value = '', fallback = '') => {
  const text = String(value || '').trim();
  return text || fallback;
};

const dedupeStrings = (items = []) =>
  Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => safeText(item))
        .filter(Boolean)
    )
  );

const toTimedLyrics = (lyrics = []) =>
  (Array.isArray(lyrics) ? lyrics : [])
    .map((line) => {
      const text = safeText(line?.text);
      const timeSec = asNumber(line?.timeSec, 0);
      if (!text) return null;
      return { text, timeSec: Math.max(0, round(timeSec, 1)) };
    })
    .filter(Boolean)
    .slice(0, 120);

const resolveMood = (rawMood = '') => {
  const normalized = safeText(rawMood, 'electric').toLowerCase();
  if (['romantic', 'love', 'soft'].includes(normalized)) return 'romantic';
  if (['retro', 'classic', 'disco'].includes(normalized)) return 'retro';
  if (['cinematic', 'epic', 'dramatic'].includes(normalized)) return 'cinematic';
  return 'electric';
};

const MOOD_THEMES = {
  electric: {
    name: 'Electric Stage',
    palette: ['#031633', '#0EA5E9', '#F59E0B', '#F8FAFC'],
    fontPair: 'Bebas Neue + DM Sans',
    texture: 'Neon glow with waveform ribbons',
    hashtagSet: ['#DuetDrop', '#KaraokeNight', '#StageEnergy'],
  },
  romantic: {
    name: 'Romantic Spotlight',
    palette: ['#2A112A', '#E11D48', '#FDBA74', '#FFF1F2'],
    fontPair: 'Playfair Display + Nunito Sans',
    texture: 'Soft spotlight and warm bloom',
    hashtagSet: ['#LoveDuet', '#HarmonyMoments', '#SingTogether'],
  },
  retro: {
    name: 'Retro Cassette',
    palette: ['#1B1B3A', '#FB7185', '#FACC15', '#F8FAFC'],
    fontPair: 'Bungee + Manrope',
    texture: 'Grainy gradient and cassette sticker look',
    hashtagSet: ['#RetroVibes', '#CassetteEra', '#ThrowbackDuet'],
  },
  cinematic: {
    name: 'Cinematic Anthem',
    palette: ['#081018', '#2563EB', '#34D399', '#ECFEFF'],
    fontPair: 'Cinzel + Source Sans 3',
    texture: 'Wide-screen framing and dramatic shadows',
    hashtagSet: ['#CinematicDuet', '#VocalAnthem', '#FinaleTake'],
  },
};

const buildCreatorPack = ({ room = null, context = {} } = {}) => {
  const roomCode = safeText(room?.roomCode, safeText(context?.roomCode, 'DUET'));
  const title = safeText(room?.title, safeText(context?.title, 'Remote Karaoke Duet'));
  const bpm = clamp(Math.round(asNumber(room?.karaokeTrackBpm ?? context?.karaokeTrackBpm, 96)), 40, 220);
  const mood = resolveMood(context?.mood);
  const theme = MOOD_THEMES[mood];
  const lyrics = toTimedLyrics(room?.lyrics || context?.lyrics || []);
  const score = clamp(
    Math.round(asNumber(context?.overallScore ?? context?.coachScore, context?.fallbackScore ?? 76)),
    0,
    100
  );

  const punchTag = score >= 86 ? 'Performance Locked' : score >= 70 ? 'Session Heat' : 'Raw Session Energy';
  const lyricHooks = dedupeStrings(
    lyrics
      .slice(0, 8)
      .map((line) => line.text)
      .filter((text) => text.length >= 8)
      .map((text) => text.slice(0, 64))
  ).slice(0, 4);

  const posterTitles = dedupeStrings([
    `${title}: ${punchTag}`,
    `${roomCode} Duet Premiere`,
    `${Math.max(1, Math.round(bpm))} BPM Harmony Drop`,
    `${theme.name} - Live Duo Cut`,
  ]).slice(0, 4);

  const captionCore = lyricHooks[0] ? `"${lyricHooks[0]}"` : 'From rehearsal to final take';
  const shortCaptions = [
    `${captionCore}. ${title} is now live with our ${theme.name.toLowerCase()} mood.`,
    `Room ${roomCode} just wrapped at ${bpm} BPM. Two voices, one final mix.`,
    `Zero-cost duet workflow, full-energy result. ${punchTag.toLowerCase()}.`,
  ];

  const hashtags = dedupeStrings([
    '#KaraokeDuet',
    '#RemoteSinging',
    '#MusicCreators',
    '#VocalCollab',
    ...theme.hashtagSet,
    `#${roomCode.replace(/[^A-Z0-9]/gi, '')}`,
  ]).slice(0, 10);

  const clipCues = (lyrics.length ? lyrics : [{ timeSec: 0, text: 'Duet starts now' }])
    .slice(0, 4)
    .map((line, index) => {
      const startSec = Math.max(0, round(line.timeSec, 1));
      return {
        label: `Clip ${index + 1}`,
        startSec,
        endSec: round(startSec + 4.5, 1),
        cueText: line.text,
      };
    });

  return {
    provider: 'zero_cost_heuristic',
    mode: 'offline',
    roomCode,
    title,
    bpm,
    mood,
    score,
    theme: {
      name: theme.name,
      palette: theme.palette,
      fontPair: theme.fontPair,
      texture: theme.texture,
    },
    posterTitles,
    shortCaptions,
    hashtags,
    lyricHooks,
    clipCues,
    checklist: [
      'Use a 4:5 cover and 9:16 story export for social posting.',
      `Apply theme colors: ${theme.palette.join(', ')}.`,
      'Keep title at top, singer names center, CTA at bottom.',
      'Export one static poster and one 15-second teaser video.',
    ],
    cta: 'Tag your duet partner and post your final mix link.',
  };
};

const buildSessionFeedback = ({ room = null, context = {} } = {}) => {
  const participants = Array.isArray(room?.participants) ? room.participants : [];
  const takes = Array.isArray(room?.takes) ? room.takes : [];
  const outputs = Array.isArray(room?.finalOutputs) ? room.finalOutputs : [];

  const hostTake = takes.find((take) => take.singerRole === 'host');
  const guestTake = takes.find((take) => take.singerRole === 'guest');
  const bothTakesUploaded = Boolean(hostTake && guestTake);
  const hasGuest = participants.some((participant) => participant.role === 'guest');

  const latestTimecodeMs = asNumber(room?.realtimeState?.latestTimecodeMs, 0);
  const lastSyncAt = room?.realtimeState?.lastSyncAt ? new Date(room.realtimeState.lastSyncAt).getTime() : 0;
  const syncFreshnessSec = lastSyncAt > 0 ? Math.max(0, (Date.now() - lastSyncAt) / 1000) : 999;
  const syncScore = clamp(Math.round(100 - syncFreshnessSec * 4), 0, 100);

  const hostDurationSec = asNumber(hostTake?.durationMs, 0) / 1000;
  const guestDurationSec = asNumber(guestTake?.durationMs, 0) / 1000;
  const durationDiffSec = bothTakesUploaded ? Math.abs(hostDurationSec - guestDurationSec) : 0;
  const timingScore = bothTakesUploaded
    ? clamp(Math.round(100 - Math.min(100, durationDiffSec * 5)), 0, 100)
    : clamp(Math.round(syncScore * 0.8), 0, 100);

  const collaborationScore = clamp(
    Math.round(
      (hasGuest ? 55 : 20) +
        (bothTakesUploaded ? 25 : 0) +
        (Boolean(context?.peerConnected) ? 10 : 0) +
        (Boolean(context?.liveMonitorEnabled) ? 10 : 0)
    ),
    0,
    100
  );

  const completionScore = clamp(
    Math.round(
      (room?.status === 'completed' ? 60 : 20) +
        (bothTakesUploaded ? 20 : 0) +
        (outputs.length > 0 ? 20 : 0)
    ),
    0,
    100
  );

  const overallScore = clamp(
    Math.round((timingScore * 0.35 + collaborationScore * 0.3 + completionScore * 0.35)),
    0,
    100
  );

  const nextSteps = [];
  if (!hasGuest) nextSteps.push('Invite a guest singer to complete the duet pair.');
  if (hasGuest && room?.status === 'waiting') nextSteps.push('Start the duet clock to lock timing for both singers.');
  if (!bothTakesUploaded) nextSteps.push('Record and upload both host and guest takes before finalizing.');
  if (bothTakesUploaded && outputs.length === 0) nextSteps.push('Finalize the mix to generate MP3/WAV exports.');
  if (outputs.length > 0) nextSteps.push('Review the final export and note timing offsets for the next session.');
  if (timingScore < 70) nextSteps.push('Try one dry rehearsal pass to match phrasing lengths before recording.');
  if (syncScore < 65) nextSteps.push('Keep both singers on stable Wi-Fi to reduce sync drift.');

  const diagnostics = {
    status: room?.status || 'idle',
    participantCount: participants.length,
    hasGuest,
    takesUploaded: takes.length,
    bothTakesUploaded,
    finalExports: outputs.length,
    latestTimecodeSec: round(latestTimecodeMs / 1000, 1),
    syncFreshnessSec: round(syncFreshnessSec, 1),
    durationDiffSec: round(durationDiffSec, 1),
  };

  return {
    provider: 'zero_cost_heuristic',
    mode: 'offline',
    scores: {
      overallScore,
      timingScore,
      collaborationScore,
      completionScore,
      syncScore,
    },
    diagnostics,
    nextSteps: Array.from(new Set(nextSteps)).slice(0, 8),
  };
};

const buildStudioFeedback = ({
  delayASeconds = 0,
  delayBSeconds = 0,
  volumeA = 1,
  volumeB = 1,
  hasTrack = false,
  hasVoiceA = false,
  hasVoiceB = false,
  lyricsLength = 0,
} = {}) => {
  const safeDelayA = Math.max(0, asNumber(delayASeconds, 0));
  const safeDelayB = Math.max(0, asNumber(delayBSeconds, 0));
  const safeVolumeA = clamp(asNumber(volumeA, 1), 0, 2);
  const safeVolumeB = clamp(asNumber(volumeB, 1), 0, 2);

  const delayGap = Math.abs(safeDelayA - safeDelayB);
  const volumeGap = Math.abs(safeVolumeA - safeVolumeB);

  const syncScore = clamp(Math.round(100 - Math.min(100, delayGap * 40)), 0, 100);
  const balanceScore = clamp(Math.round(100 - Math.min(100, volumeGap * 80)), 0, 100);
  const readinessScore = clamp(
    Math.round((hasTrack ? 40 : 0) + (hasVoiceA ? 30 : 0) + (hasVoiceB ? 30 : 0)),
    0,
    100
  );
  const preparationScore = clamp(
    Math.round((lyricsLength >= 20 ? 60 : 25) + (lyricsLength >= 100 ? 40 : 0)),
    0,
    100
  );

  const overallScore = clamp(
    Math.round(syncScore * 0.35 + balanceScore * 0.35 + readinessScore * 0.2 + preparationScore * 0.1),
    0,
    100
  );

  const suggestions = [];
  if (!hasTrack) suggestions.push('Upload an instrumental track before export.');
  if (!hasVoiceA) suggestions.push('Add Singer A recording for a complete duet.');
  if (!hasVoiceB) suggestions.push('Add Singer B recording for a complete duet.');
  if (delayGap > 0.5) suggestions.push('Large delay gap detected. Align singer delays within 0.3s for tighter sync.');
  if (volumeGap > 0.35) suggestions.push('Volume balance is uneven. Keep both singer volumes within 0.2 to avoid masking.');
  if (safeVolumeA > 1.6 || safeVolumeB > 1.6) suggestions.push('High vocal gain may clip. Try singer volumes between 0.9 and 1.3.');
  if (lyricsLength < 20) suggestions.push('Add lyric cue notes to improve phrase alignment during recording.');
  if (overallScore >= 85) suggestions.push('Mix settings look solid. Export and review with headphones.');

  return {
    provider: 'zero_cost_heuristic',
    mode: 'offline',
    scores: {
      overallScore,
      syncScore,
      balanceScore,
      readinessScore,
      preparationScore,
    },
    diagnostics: {
      delayASeconds: round(safeDelayA, 2),
      delayBSeconds: round(safeDelayB, 2),
      delayGapSeconds: round(delayGap, 2),
      volumeA: round(safeVolumeA, 2),
      volumeB: round(safeVolumeB, 2),
      volumeGap: round(volumeGap, 2),
      lyricsLength: Math.max(0, Math.round(lyricsLength)),
    },
    suggestions: Array.from(new Set(suggestions)).slice(0, 8),
  };
};

module.exports = {
  generateLyricsSyncScript,
  buildSessionFeedback,
  buildStudioFeedback,
  buildCreatorPack,
};
