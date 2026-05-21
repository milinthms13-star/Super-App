import {
  calculateBirthAstroProfile,
  getJulianDayFromBirthDetails,
  getLahiriAyanamsa,
  getMoonEclipticLongitude,
  normalizeTimeZoneValue,
  parseUtcOffsetMinutes,
} from "./astroMath";
import { NAKSHATRA_NAMES, RASHI_NAMES } from "./zodiacMapping";

describe("astroMath domain", () => {
  test("normalizes timezone value with default fallback", () => {
    expect(normalizeTimeZoneValue("")).toBe("Asia/Kolkata");
    expect(normalizeTimeZoneValue("America/New_York")).toBe("America/New_York");
  });

  test("parses utc offset minutes", () => {
    expect(parseUtcOffsetMinutes("+0530")).toBe(330);
    expect(parseUtcOffsetMinutes("-04:00")).toBe(-240);
    expect(parseUtcOffsetMinutes("invalid")).toBeNull();
  });

  test("computes deterministic Julian day from birth details", () => {
    const jd = getJulianDayFromBirthDetails("1990-01-01", "10:30", "Asia/Kolkata");
    expect(Number.isFinite(jd)).toBe(true);
    expect(jd).toBeGreaterThan(2447000);
    expect(jd).toBeLessThan(2449000);
  });

  test("computes moon longitude and ayanamsa in expected ranges", () => {
    const jd = getJulianDayFromBirthDetails("1994-11-08", "06:15", "Asia/Kolkata");
    const moonLongitude = getMoonEclipticLongitude(jd);
    const ayanamsa = getLahiriAyanamsa(jd);
    expect(moonLongitude).toBeGreaterThanOrEqual(0);
    expect(moonLongitude).toBeLessThan(360);
    expect(ayanamsa).toBeGreaterThan(20);
    expect(ayanamsa).toBeLessThan(30);
  });

  test("calculates birth astro profile from pure math module", () => {
    const profile = calculateBirthAstroProfile(
      "1998-04-17",
      "14:05",
      "Asia/Kolkata",
      NAKSHATRA_NAMES,
      RASHI_NAMES
    );
    expect(NAKSHATRA_NAMES).toContain(profile.nakshatra);
    expect(RASHI_NAMES).toContain(profile.rashi);
  });
});

