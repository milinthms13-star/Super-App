const { getDailyHoroscope, normalizeSign } = require('../utils/astrologyData');

describe('Astrology Daily Logic Determinism Testing', () => {
  test('Should consistently generate identical text mappings for the same sign and timestamp window', () => {
    const targetSign = 'aries';
    const specificDate = new Date('2026-05-22T00:00:00.000Z');

    const generationResultOne = getDailyHoroscope(targetSign, specificDate);
    const generationResultTwo = getDailyHoroscope(targetSign, specificDate);

    expect(generationResultOne.horoscope).toBeDefined();
    expect(generationResultOne.horoscope).toEqual(generationResultTwo.horoscope);
  });

  test('Should accurately fall back and evaluate mixed casing string mutations gracefully', () => {
    const rawInput = 'ScOrPiO';
    const normalized = normalizeSign(rawInput);
    expect(normalized).toBe('scorpio');
  });
});
