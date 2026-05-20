export const DANCE_STAGE_MODES = [
  { value: 'auto', label: 'Auto Best Merge', helper: 'Recommended. Aligns duration, size, audio and stage automatically.' },
  { value: 'side-by-side', label: 'Side-by-side Duet', helper: 'Best when both videos have normal backgrounds.' },
  { value: 'same-background', label: 'Same Stage Merge', helper: 'Best when videos are shot on green/blue screen.' },
  { value: 'spotlight-stage', label: 'Spotlight Stage', helper: 'Premium stage look with both dancers placed on one canvas.' },
  { value: 'vertical-reel', label: 'Instagram Reel 9:16', helper: 'Creates vertical mobile reel output.' },
];

export const DANCE_OUTPUT_FORMATS = [
  { value: 'landscape', label: 'YouTube / Landscape' },
  { value: 'reel', label: 'Reel / Shorts 9:16' },
];

export const MAX_DANCE_VIDEO_MB = 180;
export const IDEAL_DURATION_SECONDS = 30;

export const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 MB';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const validateDanceVideoFile = (file) => {
  if (!file) return { ok: false, message: 'Video is required.' };
  if (!String(file.type || '').startsWith('video/')) {
    return { ok: false, message: 'Please upload a valid video file.' };
  }
  if (file.size > MAX_DANCE_VIDEO_MB * 1024 * 1024) {
    return { ok: false, message: `Video must be below ${MAX_DANCE_VIDEO_MB} MB.` };
  }
  return { ok: true, message: 'Video looks good.' };
};

export const getDanceReadinessScore = ({ video1File, video2File, removeBackground, stageMode, outputFormat }) => {
  let score = 0;
  const tips = [];

  if (video1File) score += 25; else tips.push('Upload primary dancer video.');
  if (video2File) score += 25; else tips.push('Upload secondary dancer video.');
  if (stageMode) score += 15;
  if (outputFormat) score += 10;
  if (removeBackground) {
    score += 15;
    tips.push('Use green/blue screen videos for best same-stage output.');
  } else {
    tips.push('For true same-stage merge, shoot both dancers on green/blue background.');
  }
  score += 10;

  return {
    score: Math.min(score, 100),
    label: score >= 80 ? 'Ready for premium duet' : score >= 55 ? 'Good for demo merge' : 'Needs setup',
    tips: tips.slice(0, 3),
  };
};

export const createShareText = (outputUrl) => {
  const url = outputUrl?.startsWith('http') ? outputUrl : `${window.location.origin}${outputUrl}`;
  return `Check my AI dance duet created in NilaHub: ${url}`;
};

export const openWhatsAppShare = (outputUrl) => {
  const message = encodeURIComponent(createShareText(outputUrl));
  window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
};
