import { DEFAULT_BIRTH_TIME_ZONE } from "../data/astrologyConstants";

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const sinDeg = (degrees) => Math.sin(toRadians(degrees));

export const normalizeAngle = (degrees) => ((degrees % 360) + 360) % 360;

export const normalizeTimeZoneValue = (value) =>
  String(value || "").trim() || DEFAULT_BIRTH_TIME_ZONE;

export const parseUtcOffsetMinutes = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  if (![hours, minutes].every(Number.isFinite) || hours > 14 || minutes > 59) {
    return null;
  }
  return sign * (hours * 60 + minutes);
};

export const isValidIanaTimeZone = (timeZone) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch (_error) {
    return false;
  }
};

export const getTimeZoneOffsetMinutes = (utcDate, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const partAsNumber = (type) => Number(parts.find((entry) => entry.type === type)?.value || 0);
  const year = partAsNumber("year");
  const month = partAsNumber("month");
  const day = partAsNumber("day");
  let hour = partAsNumber("hour");
  const minute = partAsNumber("minute");
  const second = partAsNumber("second");
  if (hour === 24) hour = 0;
  const asUtcMillis = Date.UTC(year, month - 1, day, hour, minute, second);
  return (asUtcMillis - utcDate.getTime()) / 60000;
};

export const getUtcMillisFromLocalBirthDetails = (dateString, timeString, timeZone) => {
  if (!dateString) return null;
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  const [hour = 0, minute = 0] = String(timeString || "00:00").split(":").map(Number);
  if (![hour, minute].every(Number.isFinite)) return null;

  const normalizedTimeZone = normalizeTimeZoneValue(timeZone);
  const offsetMinutes = parseUtcOffsetMinutes(normalizedTimeZone);
  if (offsetMinutes !== null) {
    return Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60000;
  }

  const safeTimeZone = isValidIanaTimeZone(normalizedTimeZone)
    ? normalizedTimeZone
    : DEFAULT_BIRTH_TIME_ZONE;
  const guessUtcMillis = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffsetMinutes = getTimeZoneOffsetMinutes(new Date(guessUtcMillis), safeTimeZone);
  let correctedUtcMillis = guessUtcMillis - firstOffsetMinutes * 60000;
  const secondOffsetMinutes = getTimeZoneOffsetMinutes(new Date(correctedUtcMillis), safeTimeZone);
  if (secondOffsetMinutes !== firstOffsetMinutes) {
    correctedUtcMillis = guessUtcMillis - secondOffsetMinutes * 60000;
  }
  return correctedUtcMillis;
};

export const getJulianDayFromBirthDetails = (dateString, timeString, timeZone) => {
  const utcMs = getUtcMillisFromLocalBirthDetails(dateString, timeString, timeZone);
  if (!Number.isFinite(utcMs)) return null;
  const date = new Date(utcMs);
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;
  let y = Y;
  let m = M;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    D +
    B -
    1524.5
  );
};

export const getMoonEclipticLongitude = (jd) => {
  const D = jd - 2451545.0;
  const T = D / 36525.0;
  const L0 = normalizeAngle(
    218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000
  );
  const M = normalizeAngle(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000
  );
  const Mprime = normalizeAngle(
    357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000
  );
  const Dprime = normalizeAngle(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000
  );
  const F = normalizeAngle(
    93.272095 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000
  );

  let lon = L0;
  lon += 6.289 * sinDeg(M);
  lon += 1.274 * sinDeg(2 * Dprime - M);
  lon += 0.658 * sinDeg(2 * Dprime);
  lon += 0.214 * sinDeg(2 * M);
  lon += -0.186 * sinDeg(Mprime);
  lon += -0.059 * sinDeg(2 * Dprime - 2 * M);
  lon += -0.057 * sinDeg(2 * Dprime - Mprime - M);
  lon += 0.053 * sinDeg(2 * Dprime + M);
  lon += 0.046 * sinDeg(2 * Dprime - Mprime);
  lon += 0.041 * sinDeg(Mprime - M);
  lon += -0.035 * sinDeg(Dprime);
  lon += -0.031 * sinDeg(M + Mprime);
  lon += 0.015 * sinDeg(2 * F - 2 * Dprime);
  lon += 0.011 * sinDeg(2 * Dprime - 4 * M);
  return normalizeAngle(lon);
};

export const getLahiriAyanamsa = (jd) => {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsaAtJ2000 = 23.853222;
  const precessionArcSeconds = 5028.796195 * T + 1.1054348 * T * T;
  return ayanamsaAtJ2000 + precessionArcSeconds / 3600;
};

export const calculateBirthAstroProfile = (
  birthDate,
  birthTime,
  timeZone,
  nakshatraNames = [],
  rashiNames = []
) => {
  const jd = getJulianDayFromBirthDetails(birthDate, birthTime, timeZone);
  if (!jd) return { nakshatra: "", rashi: "" };
  const moonLongitude = getMoonEclipticLongitude(jd);
  const siderealMoonLongitude = normalizeAngle(moonLongitude - getLahiriAyanamsa(jd));
  const nakshatraIndex = Math.floor(siderealMoonLongitude / (360 / 27));
  const rashiIndex = Math.floor(siderealMoonLongitude / 30);
  return {
    nakshatra: nakshatraNames[nakshatraIndex] || "",
    rashi: rashiNames[rashiIndex] || "",
  };
};

export const calculateNakshatra = (birthDate, birthTime, timeZone, nakshatraNames = [], rashiNames = []) =>
  calculateBirthAstroProfile(birthDate, birthTime, timeZone, nakshatraNames, rashiNames).nakshatra;

