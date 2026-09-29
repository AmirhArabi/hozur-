/**
 * Jalali (Shamsi) Calendar Algorithms & Persian Utilities
 * Accurate leap year calculations and Gregorian <-> Jalali conversions.
 */

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

// 2820-year cycle breakpoints for the Iranian calendar
const JALAALI_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
];

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.floor(a / b) * b;
}

/**
 * Calculates leap status and March equinox offset for a Jalali year.
 */
export function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = JALAALI_BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = JALAALI_BREAKS[0];
  let jump = 0;

  if (jy < jp || jy >= JALAALI_BREAKS[bl - 1]) {
    throw new Error(`Jalaali year ${jy} is outside supported range (-61 to 3177)`);
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = JALAALI_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;

  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

/**
 * Checks if a Jalali year is a leap year (سال کبیسه).
 */
export function isJalaliLeap(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

/**
 * Returns number of days in a given Jalali month (1-12).
 */
export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) {
    return isJalaliLeap(jy) ? 30 : 29;
  }
  return 30;
}

/**
 * Converts Gregorian date to Julian Day Number.
 */
function gregorianToJd(gy: number, gm: number, gd: number): number {
  return Math.floor(Date.UTC(gy, gm - 1, gd) / 86400000) + 2440588;
}

/**
 * Converts Julian Day Number to Gregorian date.
 */
function jdToGregorian(jdn: number): GregorianDate {
  const d = new Date((jdn - 2440588) * 86400000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

/**
 * Converts Jalali date to Julian Day Number.
 */
export function jalaliToJd(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return gregorianToJd(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

/**
 * Converts Julian Day Number to Jalali date.
 */
export function jdToJalali(jdn: number): JalaliDate {
  const gy = jdToGregorian(jdn).year;
  let jy = gy - 621;
  let r = jalCal(jy);
  let jdn1f = gregorianToJd(gy, 3, r.march);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) {
      return {
        year: jy,
        month: 1 + div(k, 31),
        day: mod(k, 31) + 1
      };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    r = jalCal(jy);
    jdn1f = gregorianToJd(r.gy, 3, r.march);
    k = jdn - jdn1f;
    if (k <= 185) {
      return {
        year: jy,
        month: 1 + div(k, 31),
        day: mod(k, 31) + 1
      };
    } else {
      k -= 186;
    }
  }

  return {
    year: jy,
    month: 7 + div(k, 30),
    day: mod(k, 30) + 1
  };
}

/**
 * Converts Gregorian date to Jalali date.
 */
export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return jdToJalali(gregorianToJd(gy, gm, gd));
}

/**
 * Converts Jalali date to Gregorian date.
 */
export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return jdToGregorian(jalaliToJd(jy, jm, jd));
}

/**
 * Persian Month Names
 */
export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند'
];

/**
 * Persian Weekday Names (Week starts on Saturday = index 0)
 */
export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه'
];

export const PERSIAN_WEEKDAYS_SHORT = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج'
];

/**
 * Returns Persian weekday index for a Jalali date (0 = شنبه, 6 = جمعه).
 */
export function getJalaliDayOfWeek(jy: number, jm: number, jd: number): number {
  const g = toGregorian(jy, jm, jd);
  const d = new Date(Date.UTC(g.year, g.month - 1, g.day));
  const gDay = d.getUTCDay(); // 0 is Sunday, 6 is Saturday
  return (gDay + 1) % 7; // 0 is Saturday, 6 is Friday
}

/**
 * Formats digits to Persian numerals (۰-۹).
 */
export function toPersianDigits(input: string | number): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Formats a Jalali date as YYYY/MM/DD with 2-digit padding.
 */
export function formatJalaliDate(jy: number, jm: number, jd: number): string {
  const m = String(jm).padStart(2, '0');
  const d = String(jd).padStart(2, '0');
  return `${jy}/${m}/${d}`;
}

/**
 * Parses YYYY/MM/DD into { year, month, day }.
 */
export function parseJalaliDate(dateStr: string): JalaliDate {
  const parts = dateStr.split('/');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
}

/**
 * Returns current Jalali date based on local device time.
 */
export function getCurrentJalaliDate(): JalaliDate {
  const now = new Date();
  return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Returns current local time in HH:mm format.
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Converts HH:mm to minutes from midnight.
 */
export function timeStringToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converts minutes from midnight to HH:mm.
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats duration in minutes to Persian representation:
 * e.g. "۸ ساعت و ۳۰ دقیقه" or "۰۸:۳۰"
 */
export function formatMinutesToPersianHM(totalMinutes: number): string {
  const isNegative = totalMinutes < 0;
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isNegative ? '-' : '';

  if (h === 0) {
    return `${sign}${toPersianDigits(m)} دقیقه`;
  }
  if (m === 0) {
    return `${sign}${toPersianDigits(h)} ساعت`;
  }
  return `${sign}${toPersianDigits(h)} ساعت و ${toPersianDigits(m)} دقیقه`;
}

/**
 * Formats duration in compact digital format: ۰۸:۳۰
 */
export function formatMinutesToDigital(totalMinutes: number): string {
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const str = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return (totalMinutes < 0 ? '-' : '') + toPersianDigits(str);
}
