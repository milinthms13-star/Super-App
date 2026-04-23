const { getDailyHoroscope, getReadingDateKey } = require('./astrologyData');

describe('astrologyData daily readings', () => {
  test('keeps the same reading for the same sign on the same India date', () => {
    const morningReading = getDailyHoroscope('aries', '2026-04-23T04:00:00.000Z');
    const eveningReading = getDailyHoroscope('aries', '2026-04-23T10:00:00.000Z');

    expect(morningReading.readingDate).toBe('2026-04-23');
    expect(eveningReading.readingDate).toBe('2026-04-23');
    expect(morningReading.horoscope).toBe(eveningReading.horoscope);
  });

  test('changes the reading when the India date changes', () => {
    const firstDayReading = getDailyHoroscope('aries', '2026-04-23T10:00:00.000Z');
    const secondDayReading = getDailyHoroscope('aries', '2026-04-24T10:00:00.000Z');

    expect(firstDayReading.readingDate).toBe('2026-04-23');
    expect(secondDayReading.readingDate).toBe('2026-04-24');
    expect(firstDayReading.horoscope).not.toBe(secondDayReading.horoscope);
  });

  test('computes the reading date using India time', () => {
    expect(getReadingDateKey('2026-04-23T20:00:00.000Z')).toBe('2026-04-24');
  });
});
