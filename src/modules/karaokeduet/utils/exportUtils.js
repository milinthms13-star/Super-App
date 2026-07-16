/**
 * Export Utilities for Karaoke Duet
 * Handle file downloads and data exports
 */

/**
 * Download a blob as a file
 */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Download text as a file
 */
export const downloadText = (text, filename, mimeType = 'text/plain') => {
  const blob = new Blob([text], { type: mimeType });
  downloadBlob(blob, filename);
};

/**
 * Download JSON data
 */
export const downloadJSON = (data, filename) => {
  const json = JSON.stringify(data, null, 2);
  downloadText(json, filename, 'application/json');
};

/**
 * Export session data
 */
export const exportSession = async (session, recordings, options = {}) => {
  const {
    includeAudio = false,
    format = 'json',
  } = options;

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    session: {
      ...session,
      trackBlob: includeAudio ? await blobToBase64(session.trackBlob) : null,
    },
    recordings: await Promise.all(
      recordings.map(async (recording) => ({
        ...recording,
        audioBlob: includeAudio ? await blobToBase64(recording.audioBlob) : null,
      }))
    ),
  };

  if (format === 'json') {
    downloadJSON(exportData, `karaoke-session-${session.id}.json`);
  }

  return exportData;
};

/**
 * Export lyrics in various formats
 */
export const exportLyrics = (lyricsData, format = 'txt') => {
  let content = '';
  let filename = '';
  let mimeType = 'text/plain';

  switch (format) {
    case 'lrc':
      content = toLRCFormat(lyricsData.syncedLyrics || []);
      filename = `${sanitizeFilename(lyricsData.songTitle || 'lyrics')}.lrc`;
      break;

    case 'srt':
      content = toSRTFormat(lyricsData.syncedLyrics || []);
      filename = `${sanitizeFilename(lyricsData.songTitle || 'lyrics')}.srt`;
      mimeType = 'application/x-subrip';
      break;

    case 'json':
      content = JSON.stringify(lyricsData, null, 2);
      filename = `${sanitizeFilename(lyricsData.songTitle || 'lyrics')}.json`;
      mimeType = 'application/json';
      break;

    case 'txt':
    default:
      content = lyricsData.lyrics || '';
      filename = `${sanitizeFilename(lyricsData.songTitle || 'lyrics')}.txt`;
      break;
  }

  downloadText(content, filename, mimeType);
};

/**
 * Export project/mixed audio
 */
export const exportProject = (project, format = 'mp3') => {
  if (!project.mixedAudioBlob) {
    throw new Error('No mixed audio available');
  }

  const filename = `${sanitizeFilename(project.title || 'duet-mix')}.${format}`;
  downloadBlob(project.mixedAudioBlob, filename);
};

/**
 * Export all data as backup
 */
export const exportBackup = async (allData) => {
  const backup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    data: allData,
  };

  downloadJSON(backup, `karaoke-duet-backup-${new Date().toISOString().split('T')[0]}.json`);
};

/**
 * Import backup data
 */
export const importBackup = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid backup file format'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Convert blob to base64 (for export)
 */
const blobToBase64 = (blob) => {
  if (!blob) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Convert base64 to blob (for import)
 */
export const base64ToBlob = (base64) => {
  if (!base64) return null;

  const parts = base64.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

/**
 * Convert synced lyrics to LRC format
 */
const toLRCFormat = (syncedLyrics) => {
  return syncedLyrics
    .map((lyric) => {
      const minutes = Math.floor(lyric.time / 60);
      const seconds = Math.floor(lyric.time % 60);
      const centiseconds = Math.floor((lyric.time % 1) * 100);

      const mm = String(minutes).padStart(2, '0');
      const ss = String(seconds).padStart(2, '0');
      const cc = String(centiseconds).padStart(2, '0');

      return `[${mm}:${ss}.${cc}]${lyric.text}`;
    })
    .join('\n');
};

/**
 * Convert synced lyrics to SRT format
 */
const toSRTFormat = (syncedLyrics) => {
  return syncedLyrics
    .map((lyric, index) => {
      const startTime = formatSRTTime(lyric.time);
      const endTime = formatSRTTime(lyric.time + (lyric.duration || 3));

      return `${index + 1}\n${startTime} --> ${endTime}\n${lyric.text}\n`;
    })
    .join('\n');
};

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
const formatSRTTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .substring(0, 50);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

/**
 * Share data using Web Share API (if available)
 */
export const shareProject = async (project) => {
  if (!navigator.share) {
    throw new Error('Web Share API not supported');
  }

  const file = new File(
    [project.mixedAudioBlob],
    `${sanitizeFilename(project.title)}.mp3`,
    { type: 'audio/mp3' }
  );

  try {
    await navigator.share({
      title: project.title || 'Karaoke Duet',
      text: 'Check out my karaoke duet!',
      files: [file],
    });
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      return false; // User cancelled
    }
    throw error;
  }
};

export default {
  downloadBlob,
  downloadText,
  downloadJSON,
  exportSession,
  exportLyrics,
  exportProject,
  exportBackup,
  importBackup,
  base64ToBlob,
  formatFileSize,
  formatDuration,
  shareProject,
};
