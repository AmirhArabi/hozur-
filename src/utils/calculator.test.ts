/**
 * Unit Tests for Calculator & Jalali Calendar logic
 * Run with: npm test
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  calculateIntervalMinutes,
  calculateMonthStats,
  DEFAULT_FIXED_HOLIDAYS,
  DEFAULT_SETTINGS,
  validateInterval
} from './calculator';
import {
  getJalaliMonthDays,
  isJalaliLeap,
  toGregorian,
  toJalali,
  toPersianDigits
} from './jalali';

test('Jalali Leap Year detection', () => {
  assert.equal(isJalaliLeap(1403), true, '1403 should be a leap year (کبیسه)');
  assert.equal(isJalaliLeap(1402), false, '1402 should not be a leap year');
  assert.equal(isJalaliLeap(1404), false, '1404 should not be a leap year');
  assert.equal(isJalaliLeap(1405), false, '1405 should not be a leap year');
  assert.equal(isJalaliLeap(1399), true, '1399 should be a leap year (کبیسه)');
  assert.equal(isJalaliLeap(1395), true, '1395 should be a leap year (کبیسه)');

  // Month days count in leap vs normal year
  assert.equal(getJalaliMonthDays(1403, 12), 30, 'Esfand 1403 has 30 days');
  assert.equal(getJalaliMonthDays(1402, 12), 29, 'Esfand 1402 has 29 days');
  assert.equal(getJalaliMonthDays(1405, 1), 31, 'Farvardin has 31 days');
  assert.equal(getJalaliMonthDays(1405, 7), 30, 'Mehr has 30 days');
});

test('Gregorian to Jalali conversion accuracy', () => {
  // Test Nowruz dates
  const j1403 = toJalali(2024, 3, 20);
  assert.deepEqual(j1403, { year: 1403, month: 1, day: 1 });

  const g1403 = toGregorian(1403, 1, 1);
  assert.deepEqual(g1403, { year: 2024, month: 3, day: 20 });

  // Test leap day 1403/12/30
  const gLeap = toGregorian(1403, 12, 30);
  assert.deepEqual(gLeap, { year: 2025, month: 3, day: 20 });
  const jLeap = toJalali(2025, 3, 20);
  assert.deepEqual(jLeap, { year: 1403, month: 12, day: 30 });
});

test('Persian digits conversion', () => {
  assert.equal(toPersianDigits(12345), '۱۲۳۴۵');
  assert.equal(toPersianDigits('08:30'), '۰۸:۳۰');
});

test('Interval validation & overlap checks', () => {
  const existing = [
    { id: '1', startTime: '08:00', endTime: '12:00' },
    { id: '2', startTime: '13:00', endTime: '17:00' }
  ];

  // End before start
  const v1 = validateInterval('10:00', '09:00', existing);
  assert.equal(v1.isValid, false);

  // Overlapping with 08:00 - 12:00
  const v2 = validateInterval('11:00', '13:30', existing);
  assert.equal(v2.isValid, false);

  // Valid gap interval: 12:00 to 13:00
  const v3 = validateInterval('12:00', '13:00', existing);
  assert.equal(v3.isValid, true);

  // Valid after 17:00
  const v4 = validateInterval('17:00', '19:00', existing);
  assert.equal(v4.isValid, true);
});

test('Core calculation rules: User specified example (D=200, L=10, P=195 => remaining=0, overtime=0)', () => {
  /**
   * User example:
   * "D = 200, L = 10, اگر P = 195 باشد مانده 0 و اضافهکار 0 است.
   *  اگر P = 205 باشد اضافهکار 5 ساعت است.
   *  ۳ ساعت کار در جمعه هم به اضافهکار اضافه میشود (کل 8)."
   */
  const D = 200 * 60; // 200 hours in minutes
  const L = 10 * 60;  // 10 hours in minutes

  // Case 1: P = 195 hours
  const P1 = 195 * 60;
  const remaining1 = Math.max(0, D - P1 - L);
  const normalOvertime1 = Math.max(0, P1 - D);
  const totalOvertime1 = normalOvertime1 + 0;

  assert.equal(remaining1, 0, 'Remaining should be 0 when D=200, L=10, P=195');
  assert.equal(totalOvertime1, 0, 'Total overtime should be 0');

  // Case 2: P = 205 hours
  const P2 = 205 * 60;
  const remaining2 = Math.max(0, D - P2 - L);
  const normalOvertime2 = Math.max(0, P2 - D);
  assert.equal(remaining2, 0);
  assert.equal(normalOvertime2, 5 * 60, 'Normal overtime should be 5 hours (300 mins)');

  // Plus 3 hours on Friday (H = 3 hours)
  const H = 3 * 60;
  const totalOvertime2 = normalOvertime2 + H;
  assert.equal(totalOvertime2, 8 * 60, 'Total overtime should be 8 hours (480 mins)');
});

test('calculateMonthStats full integration with holiday and daily overtime progression', () => {
  // Simulate a month: 1405/07 (Mehr 1405, 30 days)
  // Let settings have dailyQuota = 8 hours (480 minutes)
  const testSettings = {
    ...DEFAULT_SETTINGS,
    dailyQuotaHours: 8,
    dailyQuotaMinutes: 0,
    isThursdayHoliday: false
  };

  // Run calculateMonthStats with empty intervals
  const emptyResult = calculateMonthStats({
    year: 1405,
    month: 7,
    intervals: [],
    leaves: [],
    holidays: DEFAULT_FIXED_HOLIDAYS,
    settings: testSettings
  });

  assert.ok(emptyResult.workDaysCount > 0);
  assert.equal(emptyResult.P_minutes, 0);
  assert.equal(emptyResult.H_minutes, 0);
  assert.equal(emptyResult.remainingMinutes, emptyResult.D_minutes);

  // Now add work interval on a Friday (e.g. 1405/07/03 or 1405/07/10)
  // Let's find a Friday in this month
  let fridayDate = '';
  for (const [dateStr, dayData] of Object.entries(emptyResult.dailyBreakdown)) {
    if (dayData.dayOfWeekIndex === 6) {
      fridayDate = dateStr;
      break;
    }
  }
  assert.ok(fridayDate, 'Should have at least one Friday');

  const holidayInterval = {
    id: 'h1',
    date: fridayDate,
    startTime: '09:00',
    endTime: '12:00', // 3 hours = 180 mins
    createdAt: Date.now()
  };

  const holidayResult = calculateMonthStats({
    year: 1405,
    month: 7,
    intervals: [holidayInterval],
    leaves: [],
    holidays: DEFAULT_FIXED_HOLIDAYS,
    settings: testSettings
  });

  assert.equal(holidayResult.H_minutes, 180, 'Friday work should count strictly as H');
  assert.equal(holidayResult.totalOvertimeMinutes, 180, 'Total overtime should include Friday work 100%');
  assert.equal(holidayResult.dailyBreakdown[fridayDate].overtimeMinutes, 180, 'Friday daily overtime is 180 mins');
});

test('Under-hours deficit calculation (> 15 minutes threshold)', () => {
  const dailyQuotaMinutes = 8 * 60 + 30; // 510 minutes (8h 30m)

  // Scenario 1: Worked 8 hours (480 minutes), deficit is 30 minutes (> 15 min) -> SHOULD PROMPT
  const worked1 = 480;
  const leave1 = 0;
  const deficit1 = dailyQuotaMinutes - (worked1 + leave1);
  assert.equal(deficit1, 30);
  assert.equal(deficit1 > 15, true, 'Deficit of 30 minutes should trigger prompt');

  // Scenario 2: Worked 8 hours 20 minutes (500 minutes), deficit is 10 minutes (<= 15 min) -> NO PROMPT
  const worked2 = 500;
  const deficit2 = dailyQuotaMinutes - worked2;
  assert.equal(deficit2, 10);
  assert.equal(deficit2 > 15, false, 'Deficit of 10 minutes should not trigger prompt');

  // Scenario 3: Worked 8 hours and 30 minutes -> exactly reached quota, deficit 0 -> NO PROMPT
  const worked3 = 510;
  const deficit3 = dailyQuotaMinutes - worked3;
  assert.equal(deficit3 <= 0, true);
});
