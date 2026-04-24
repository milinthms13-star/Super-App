const test = require('node:test');
const assert = require('node:assert/strict');

const diaryRoute = require('./diary');

const {
  parseDateValue,
  parseTimezoneOffsetMinutes,
  normalizeStartOfDay,
  buildDayWindow,
} =
  diaryRoute.__testables;

test('diary route keeps date-only inputs on the intended local day', () => {
  const parsedDate = parseDateValue('2026-04-25');

  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate.getFullYear(), 2026);
  assert.equal(parsedDate.getMonth(), 3);
  assert.equal(parsedDate.getDate(), 25);
});

test('normalizeStartOfDay zeroes the time without shifting the date-only input', () => {
  const normalizedDate = normalizeStartOfDay('2026-04-25');

  assert.ok(normalizedDate instanceof Date);
  assert.equal(normalizedDate.getFullYear(), 2026);
  assert.equal(normalizedDate.getMonth(), 3);
  assert.equal(normalizedDate.getDate(), 25);
  assert.equal(normalizedDate.getHours(), 0);
  assert.equal(normalizedDate.getMinutes(), 0);
});

test('buildDayWindow creates an exclusive end date on the next day', () => {
  const dayWindow = buildDayWindow('2026-04-25');

  assert.ok(dayWindow);
  assert.equal(dayWindow.start.getDate(), 25);
  assert.equal(dayWindow.end.getDate(), 26);
  assert.equal(dayWindow.end.getHours(), 0);
  assert.equal(dayWindow.end.getMinutes(), 0);
});

test('buildDayWindow respects the supplied browser timezone offset', () => {
  const dayWindow = buildDayWindow('2026-04-25', '-330');

  assert.ok(dayWindow);
  assert.equal(dayWindow.start.toISOString(), '2026-04-24T18:30:00.000Z');
  assert.equal(dayWindow.end.toISOString(), '2026-04-25T18:30:00.000Z');
  assert.equal(parseTimezoneOffsetMinutes('-330'), -330);
});

test('diary entry route is constrained to Mongo-style ids so static routes are not shadowed', () => {
  const routePaths = diaryRoute.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.ok(routePaths.includes('/:id([0-9a-fA-F]{24})'));
});
