const diaryRoute = require('./diary');

const {
  parseDateValue,
  parseTimezoneOffsetMinutes,
  normalizeStartOfDay,
  buildDayWindow,
} = diaryRoute.__testables;

describe('diary route helpers', () => {
  test('keeps date-only inputs on the intended local day', () => {
    const parsedDate = parseDateValue('2026-04-25');

    expect(parsedDate).toBeInstanceOf(Date);
    expect(parsedDate.getFullYear()).toBe(2026);
    expect(parsedDate.getMonth()).toBe(3);
    expect(parsedDate.getDate()).toBe(25);
  });

  test('normalizeStartOfDay zeroes the time without shifting the date-only input', () => {
    const normalizedDate = normalizeStartOfDay('2026-04-25');

    expect(normalizedDate).toBeInstanceOf(Date);
    expect(normalizedDate.getFullYear()).toBe(2026);
    expect(normalizedDate.getMonth()).toBe(3);
    expect(normalizedDate.getDate()).toBe(25);
    expect(normalizedDate.getHours()).toBe(0);
    expect(normalizedDate.getMinutes()).toBe(0);
  });

  test('buildDayWindow creates an exclusive end date on the next day', () => {
    const dayWindow = buildDayWindow('2026-04-25');

    expect(dayWindow).toBeTruthy();
    expect(dayWindow.start.getDate()).toBe(25);
    expect(dayWindow.end.getDate()).toBe(26);
    expect(dayWindow.end.getHours()).toBe(0);
    expect(dayWindow.end.getMinutes()).toBe(0);
  });

  test('buildDayWindow respects the supplied browser timezone offset', () => {
    const dayWindow = buildDayWindow('2026-04-25', '-330');

    expect(dayWindow).toBeTruthy();
    expect(dayWindow.start.toISOString()).toBe('2026-04-24T18:30:00.000Z');
    expect(dayWindow.end.toISOString()).toBe('2026-04-25T18:30:00.000Z');
    expect(parseTimezoneOffsetMinutes('-330')).toBe(-330);
  });

  test('diary entry route is constrained to Mongo-style ids so static routes are not shadowed', () => {
    const routePaths = diaryRoute.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    expect(routePaths).toContain('/:id([0-9a-fA-F]{24})');
  });
});
