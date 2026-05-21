import {
  MAX_DANCE_VIDEO_MB,
  createShareText,
  formatFileSize,
  getDanceReadinessScore,
  validateDanceVideoFile,
} from './danceDuetUpgradeUtils';

describe('danceDuetUpgradeUtils', () => {
  test('formatFileSize formats MB correctly', () => {
    expect(formatFileSize(0)).toBe('0 MB');
    expect(formatFileSize(1024 * 1024 * 2)).toBe('2.0 MB');
  });

  test('validateDanceVideoFile rejects missing and invalid files', () => {
    expect(validateDanceVideoFile(null).ok).toBe(false);
    expect(validateDanceVideoFile({ type: 'image/png', size: 10 }).ok).toBe(false);
  });

  test('validateDanceVideoFile enforces max upload size', () => {
    const tooLargeSize = (MAX_DANCE_VIDEO_MB + 1) * 1024 * 1024;
    const result = validateDanceVideoFile({ type: 'video/mp4', size: tooLargeSize });
    expect(result.ok).toBe(false);
    expect(result.message).toContain(String(MAX_DANCE_VIDEO_MB));
  });

  test('validateDanceVideoFile accepts valid video', () => {
    const result = validateDanceVideoFile({ type: 'video/mp4', size: 5 * 1024 * 1024 });
    expect(result.ok).toBe(true);
  });

  test('getDanceReadinessScore returns high score for ready setup', () => {
    const summary = getDanceReadinessScore({
      video1File: { name: 'a.mp4' },
      video2File: { name: 'b.mp4' },
      removeBackground: false,
      stageMode: 'auto',
      outputFormat: 'reel',
    });
    expect(summary.score).toBeGreaterThanOrEqual(70);
    expect(summary.label).toBeTruthy();
    expect(Array.isArray(summary.tips)).toBe(true);
  });

  test('createShareText uses absolute URL when relative output provided', () => {
    const shareText = createShareText('/uploads/dance-duet/outputs/demo.mp4');
    expect(shareText).toContain(window.location.origin);
    expect(shareText).toContain('/uploads/dance-duet/outputs/demo.mp4');
  });
});
