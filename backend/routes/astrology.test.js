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
});
