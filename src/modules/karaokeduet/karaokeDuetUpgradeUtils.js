const DEFAULT_HASHTAGS = ["#KaraokeDuet", "#RemoteSinging", "#MusicCreators"];

const sanitizeText = (value = "") => String(value || "").trim();

export const parseTimedLyrics = (rawScript = "") =>
  String(rawScript || "")
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
      return {
        timeSec: Math.max(0, Math.round(timeSec * 10) / 10),
        text,
      };
    })
    .filter(Boolean);

export const summarizeDuetReadiness = ({
  hasTrack = false,
  hasHostTake = false,
  hasGuestTake = false,
  hasPeer = false,
  finalOutputCount = 0,
} = {}) => {
  const score = Math.max(
    0,
    Math.min(
      100,
      (hasTrack ? 25 : 0) +
        (hasPeer ? 20 : 0) +
        (hasHostTake ? 20 : 0) +
        (hasGuestTake ? 20 : 0) +
        (Number(finalOutputCount || 0) > 0 ? 15 : 0)
    )
  );

  const label = score >= 85 ? "Stage-ready" : score >= 60 ? "Almost ready" : "Warm-up needed";
  return { score, label };
};

export const createCreatorPackShareText = ({
  title = "Remote Karaoke Duet",
  roomCode = "",
  captions = [],
  hashtags = [],
} = {}) => {
  const safeTitle = sanitizeText(title) || "Remote Karaoke Duet";
  const safeRoomCode = sanitizeText(roomCode);
  const safeCaption = sanitizeText(Array.isArray(captions) ? captions[0] : "");
  const safeTags = Array.from(
    new Set([...(Array.isArray(hashtags) ? hashtags : []), ...DEFAULT_HASHTAGS].map(sanitizeText).filter(Boolean))
  );

  return [
    safeTitle,
    safeRoomCode ? `Room: ${safeRoomCode}` : "",
    safeCaption || "Two voices, one final mix.",
    safeTags.join(" "),
  ]
    .filter(Boolean)
    .join("\n");
};
