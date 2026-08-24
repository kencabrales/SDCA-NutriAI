// lib/dateUtils.js
//
// Every "what day is it" / "what week is this" calculation in the app should
// go through these helpers instead of raw `new Date()` + `.toISOString()`.
// That combination is what caused the Sunday/Monday mismatch: a Date built
// from local calendar components (correct in Philippine time) gets shifted
// back a day the moment `.toISOString()` converts it to UTC, specifically
// during PH's early-morning hours (00:00–07:59), since PH is UTC+8.
//
// Strategy used here:
//  1. To find "what calendar day is it right now in the Philippines", we use
//     Intl.DateTimeFormat with an explicit timeZone: 'Asia/Manila'. This is
//     correct regardless of what timezone the browser or server happens to
//     be running in.
//  2. Once we have a "YYYY-MM-DD" string, all further day-math (add days,
//     find day-of-week, format labels) is done by anchoring it to NOON UTC
//     and only ever reading/writing back via getUTC*/setUTC* methods. This
//     keeps the calendar date fixed and immune to timezone/DST drift, since
//     we never again ask "what does this instant look like locally".

const PH_TIMEZONE = 'Asia/Manila';

/** { year, month, day } for the given instant, as seen in Philippine time. */
export function getPHDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PH_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const map = {};
  formatter.formatToParts(date).forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

/** "YYYY-MM-DD" for the given instant, as seen in Philippine time. */
export function getPHDateString(date = new Date()) {
  const { year, month, day } = getPHDateParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Today's date, "YYYY-MM-DD", in Philippine time. */
export function getTodayPH() {
  return getPHDateString(new Date());
}

export function dateStringToUTCAnchor(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Turns a UTC-anchored Date back into "YYYY-MM-DD". */
export function utcAnchorToDateString(anchor) {
  const y = anchor.getUTCFullYear();
  const m = String(anchor.getUTCMonth() + 1).padStart(2, '0');
  const d = String(anchor.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds N days (can be negative) to a UTC-anchored Date. Returns a new Date. */
export function addDaysUTC(anchor, days) {
  const copy = new Date(anchor.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Day of week for a UTC-anchored Date: 0 = Sunday .. 6 = Saturday. */
export function getUTCDayOfWeek(anchor) {
  return anchor.getUTCDay();
}

/** "SUN" / "MON" / ... short weekday label for a "YYYY-MM-DD" string. */
export function getWeekdayLabel(dateStr, locale = 'en-US') {
  const anchor = dateStringToUTCAnchor(dateStr);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' })
    .format(anchor)
    .toUpperCase();
}

/** "Aug 23" style label for a "YYYY-MM-DD" string. */
export function getMonthDayLabel(dateStr, locale = 'en-US') {
  const anchor = dateStringToUTCAnchor(dateStr);
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(anchor);
}

/** "August 2026" style label for a "YYYY-MM-DD" string. */
export function getMonthYearLabel(dateStr, locale = 'en-US') {
  const anchor = dateStringToUTCAnchor(dateStr);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(anchor);
}

/** Short month label ("Jan".."Dec") for a 0-indexed month number. */
export function getShortMonthLabel(monthIndex0, locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, monthIndex0, 1)));
}