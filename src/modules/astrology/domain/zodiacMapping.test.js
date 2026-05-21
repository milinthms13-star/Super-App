import {
  HEURISTIC_PREVIEW_FLAGS,
  detectSignFromBirthDate,
  getCanonicalNakshatraName,
  getLagnaFromTime,
  getSignFromRashi,
  getTodayEnergyScore,
  normalizeZodiacKey,
} from "./zodiacMapping";

describe("zodiacMapping domain", () => {
  test("normalizes zodiac keys and aliases", () => {
    expect(normalizeZodiacKey("Aries")).toBe("aries");
    expect(normalizeZodiacKey("mesha")).toBe("aries");
    expect(normalizeZodiacKey("KARKATA")).toBe("cancer");
  });

  test("maps nakshatra aliases to canonical names", () => {
    expect(getCanonicalNakshatraName("aswathy")).toBe("Ashwini");
    expect(getCanonicalNakshatraName("Thiruvonam")).toBe("Shravana");
    expect(getCanonicalNakshatraName("Revati")).toBe("Revati");
  });

  test("gets sign from rashi", () => {
    expect(getSignFromRashi("Mesha")).toBe("aries");
    expect(getSignFromRashi("Kumbha")).toBe("aquarius");
  });

  test("lagna heuristics handle boundary hours consistently", () => {
    expect(getLagnaFromTime("03:59")).toBe("Meena");
    expect(getLagnaFromTime("04:00")).toBe("Mesha");
    expect(getLagnaFromTime("07:59")).toBe("Mesha");
    expect(getLagnaFromTime("08:00")).toBe("Vrishabha");
    expect(getLagnaFromTime("12:00")).toBe("Karkata");
    expect(getLagnaFromTime("20:00")).toBe("Tula");
  });

  test("energy score heuristic returns bounded non-zero value", () => {
    const fixedDate = new Date("2026-05-21T00:00:00.000Z");
    const score = getTodayEnergyScore("leo", fixedDate);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(10);
    expect(HEURISTIC_PREVIEW_FLAGS.dailyEnergyScore).toBe(true);
    expect(HEURISTIC_PREVIEW_FLAGS.lagnaFromTimeBuckets).toBe(true);
  });

  test("detects sign from birth date", () => {
    expect(detectSignFromBirthDate("1990-03-21")).toBe("aries");
    expect(detectSignFromBirthDate("1990-12-25")).toBe("capricorn");
    expect(detectSignFromBirthDate("invalid")).toBe("");
  });
});

