const astrologyRouter = require('./astrology');

describe('astrology profile helpers', () => {
  test('replaces duplicate saved readings from the same sign on the same day', () => {
    const { mergeSavedReadings } = astrologyRouter.__testables;

    const mergedReadings = mergeSavedReadings(
      [
        {
          sign: 'aries',
          horoscope: 'Earlier reading',
          readingDate: '2026-04-23T05:00:00.000Z',
        },
      ],
      {
        sign: 'aries',
        horoscope: 'Latest reading',
        readingDate: '2026-04-23T12:00:00.000Z',
      }
    );

    expect(mergedReadings).toHaveLength(1);
    expect(mergedReadings[0]).toEqual(
      expect.objectContaining({
        sign: 'aries',
        horoscope: 'Latest reading',
      })
    );
  });

  test('keeps the newest saved readings first', () => {
    const { mergeSavedReadings } = astrologyRouter.__testables;

    const mergedReadings = mergeSavedReadings(
      [
        {
          sign: 'taurus',
          horoscope: 'Yesterday',
          readingDate: '2026-04-22T12:00:00.000Z',
        },
      ],
      {
        sign: 'aries',
        horoscope: 'Today',
        readingDate: '2026-04-23T12:00:00.000Z',
      }
    );

    expect(mergedReadings[0]).toEqual(
      expect.objectContaining({
        sign: 'aries',
        horoscope: 'Today',
      })
    );
    expect(mergedReadings[1]).toEqual(
      expect.objectContaining({
        sign: 'taurus',
        horoscope: 'Yesterday',
      })
    );
  });

  test('normalizeHexDigest lowercases and strips invalid characters', () => {
    const { normalizeHexDigest } = astrologyRouter.__testables;
    expect(normalizeHexDigest('AB:12-34_GH')).toBe('ab1234');
    expect(normalizeHexDigest('FFAA00')).toBe('ffaa00');
  });

  test('secureDigestEquals safely compares hex digests', () => {
    const { secureDigestEquals } = astrologyRouter.__testables;
    expect(secureDigestEquals('abcd1234', 'ABCD1234')).toBe(true);
    expect(secureDigestEquals('abcd1234', 'abcd1235')).toBe(false);
  });

  test('buildCompatibility returns a compatibility payload for valid signs', () => {
    const { buildCompatibility } = astrologyRouter.__testables;
    const result = buildCompatibility('aries', 'taurus');

    expect(result).toMatchObject({
      score: expect.any(Number),
      summary: expect.any(String),
      keyMatch: expect.any(String),
      quality: expect.objectContaining({
        source: 'template-engine',
        guidanceOnly: true,
      }),
    });
    expect(result.score).toBeGreaterThanOrEqual(58);
    expect(result.score).toBeLessThanOrEqual(96);
  });

  test('shouldUseDevStore returns false in production mode', () => {
    const { shouldUseDevStore } = astrologyRouter.__testables;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'production';
      expect(shouldUseDevStore()).toBe(false);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
