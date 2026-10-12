/**
 * Core Work Tracker Calculation Logic
 * Independent calculation module for monthly and daily statistics.
 *
 * Rules:
 * - Work Day (روز موظفی): Day that is neither weekly holiday nor official holiday.
 * - D = daily quota * count of work days.
 * - P = sum of registered work minutes on work days (leave is not presence).
 * - L = sum of leave minutes.
 * - H = sum of work minutes on holidays (weekly or official); 100% overtime.
 * - Remaining to quota = max(0, D - P - L)
 * - Normal days overtime = max(0, P - D)
 * - Total overtime = Normal days overtime + H
 * - Daily overtime: Days processed in chronological order. Daily overtime on a normal
 *   day equals the increase of accumulated monthly normal overtime on that day.
 *   On a holiday, 100% of that day's work is overtime.
 */

import {
  DayCalculationResult,
  LeaveRecord,
  MonthCalculationResult,
  OfficialHoliday,
  UserSettings,
  WorkInterval
} from '../types';
import {
  formatJalaliDate,
  getJalaliDayOfWeek,
  getJalaliMonthDays,
  parseJalaliDate,
  timeStringToMinutes
} from './jalali';

/**
 * Default preloaded comprehensive official holidays of Iran calendar.
 * Includes fixed Solar holidays (annual) and Lunar holidays for 1403, 1404, 1405, and 1406.
 */
export const DEFAULT_FIXED_HOLIDAYS: OfficialHoliday[] = [
  // --- Fixed Solar Holidays (هر سال تکرار می‌شود) ---
  { id: 'hol-0101', date: '01/01', title: 'جشن نوروز / آغاز سال نو', isRecurring: true },
  { id: 'hol-0102', date: '01/02', title: 'عید نوروز', isRecurring: true },
  { id: 'hol-0103', date: '01/03', title: 'عید نوروز', isRecurring: true },
  { id: 'hol-0104', date: '01/04', title: 'عید نوروز', isRecurring: true },
  { id: 'hol-0112', date: '01/12', title: 'روز جمهوری اسلامی ایران', isRecurring: true },
  { id: 'hol-0113', date: '01/13', title: 'روز طبیعت (سیزده‌بدر)', isRecurring: true },
  { id: 'hol-0314', date: '03/14', title: 'رحلت حضرت امام خمینی (ره)', isRecurring: true },
  { id: 'hol-0315', date: '03/15', title: 'قیام خونین ۱۵ خرداد', isRecurring: true },
  { id: 'hol-1122', date: '11/22', title: 'پیروزی انقلاب اسلامی ایران', isRecurring: true },
  { id: 'hol-1229', date: '12/29', title: 'روز ملی شدن صنعت نفت ایران', isRecurring: true },

  // --- Official Lunar Holidays for 1403 (تعطیلات مناسبتی قمری سال ۱۴۰۳) ---
  { id: 'hol-1403-0122', date: '1403/01/22', title: 'عید سعید فطر', isRecurring: false },
  { id: 'hol-1403-0123', date: '1403/01/23', title: 'تعطیل به مناسبت عید فطر', isRecurring: false },
  { id: 'hol-1403-0215', date: '1403/02/15', title: 'شهادت امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1403-0328', date: '1403/03/28', title: 'عید سعید قربان', isRecurring: false },
  { id: 'hol-1403-0405', date: '1403/04/05', title: 'عید سعید غدیر خم', isRecurring: false },
  { id: 'hol-1403-0425', date: '1403/04/25', title: 'تاسوعای حسینی', isRecurring: false },
  { id: 'hol-1403-0426', date: '1403/04/26', title: 'عاشورای حسینی', isRecurring: false },
  { id: 'hol-1403-0604', date: '1403/06/04', title: 'اربعین حسینی', isRecurring: false },
  { id: 'hol-1403-0612', date: '1403/06/12', title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isRecurring: false },
  { id: 'hol-1403-0614', date: '1403/06/14', title: 'شهادت امام رضا (ع)', isRecurring: false },
  { id: 'hol-1403-0622', date: '1403/06/22', title: 'شهادت امام حسن عسکری (ع)', isRecurring: false },
  { id: 'hol-1403-0631', date: '1403/06/31', title: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1403-0915', date: '1403/09/15', title: 'شهادت حضرت فاطمه زهرا (س)', isRecurring: false },
  { id: 'hol-1403-1025', date: '1403/10/25', title: 'ولادت حضرت امام علی (ع) و روز پدر', isRecurring: false },
  { id: 'hol-1403-1109', date: '1403/11/09', title: 'مبعث حضرت رسول اکرم (ص)', isRecurring: false },
  { id: 'hol-1403-1126', date: '1403/11/26', title: 'ولادت حضرت قائم (عج) و جشن نیمه شعبان', isRecurring: false },
  { id: 'hol-1403-1230', date: '1403/12/30', title: 'آخرین روز سال (کبیسه)', isRecurring: false },

  // --- Official Lunar Holidays for 1404 (تعطیلات مناسبتی قمری سال ۱۴۰۴) ---
  { id: 'hol-1404-0102', date: '1404/01/02', title: 'شهادت حضرت امام علی (ع)', isRecurring: false },
  { id: 'hol-1404-0111', date: '1404/01/11', title: 'عید سعید فطر', isRecurring: false },
  { id: 'hol-1404-0112', date: '1404/01/12', title: 'تعطیل به مناسبت عید سعید فطر', isRecurring: false },
  { id: 'hol-1404-0204', date: '1404/02/04', title: 'شهادت حضرت امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1404-0316', date: '1404/03/16', title: 'عید سعید قربان', isRecurring: false },
  { id: 'hol-1404-0324', date: '1404/03/24', title: 'عید سعید غدیر خم', isRecurring: false },
  { id: 'hol-1404-0414', date: '1404/04/14', title: 'تاسوعای حسینی', isRecurring: false },
  { id: 'hol-1404-0415', date: '1404/04/15', title: 'عاشورای حسینی', isRecurring: false },
  { id: 'hol-1404-0523', date: '1404/05/23', title: 'اربعین حسینی', isRecurring: false },
  { id: 'hol-1404-0531', date: '1404/05/31', title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isRecurring: false },
  { id: 'hol-1404-0602', date: '1404/06/02', title: 'شهادت حضرت امام رضا (ع)', isRecurring: false },
  { id: 'hol-1404-0610', date: '1404/06/10', title: 'شهادت امام حسن عسکری (ع)', isRecurring: false },
  { id: 'hol-1404-0619', date: '1404/06/19', title: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1404-0903', date: '1404/09/03', title: 'شهادت حضرت فاطمه زهرا (س)', isRecurring: false },
  { id: 'hol-1404-1013', date: '1404/10/13', title: 'ولادت حضرت امام علی (ع) و روز پدر', isRecurring: false },
  { id: 'hol-1404-1027', date: '1404/10/27', title: 'مبعث حضرت رسول اکرم (ص)', isRecurring: false },
  { id: 'hol-1404-1115', date: '1404/11/15', title: 'ولادت حضرت قائم (عج) و جشن نیمه شعبان', isRecurring: false },
  { id: 'hol-1404-1220', date: '1404/12/20', title: 'شهادت حضرت امام علی (ع)', isRecurring: false },

  // --- Official Lunar Holidays for 1405 (تعطیلات مناسبتی قمری سال ۱۴۰۵) ---
  { id: 'hol-1405-0101', date: '1405/01/01', title: 'عید سعید فطر (همزمان با آغاز نوروز)', isRecurring: false },
  { id: 'hol-1405-0102', date: '1405/01/02', title: 'تعطیل به مناسبت عید سعید فطر', isRecurring: false },
  { id: 'hol-1405-0125', date: '1405/01/25', title: 'شهادت حضرت امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1405-0306', date: '1405/03/06', title: 'عید سعید قربان', isRecurring: false },
  { id: 'hol-1405-0314', date: '1405/03/14', title: 'عید سعید غدیر خم', isRecurring: false },
  { id: 'hol-1405-0403', date: '1405/04/03', title: 'تاسوعای حسینی', isRecurring: false },
  { id: 'hol-1405-0404', date: '1405/04/04', title: 'عاشورای حسینی', isRecurring: false },
  { id: 'hol-1405-0513', date: '1405/05/13', title: 'اربعین حسینی', isRecurring: false },
  { id: 'hol-1405-0521', date: '1405/05/21', title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isRecurring: false },
  { id: 'hol-1405-0522', date: '1405/05/22', title: 'شهادت حضرت امام رضا (ع)', isRecurring: false },
  { id: 'hol-1405-0530', date: '1405/05/30', title: 'شهادت امام حسن عسکری (ع)', isRecurring: false },
  { id: 'hol-1405-0608', date: '1405/06/08', title: 'میلاد حضرت رسول اکرم (ص) و امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1405-0822', date: '1405/08/22', title: 'شهادت حضرت فاطمه زهرا (س)', isRecurring: false },
  { id: 'hol-1405-1002', date: '1405/10/02', title: 'ولادت حضرت امام علی (ع) و روز پدر', isRecurring: false },
  { id: 'hol-1405-1016', date: '1405/10/16', title: 'مبعث حضرت رسول اکرم (ص)', isRecurring: false },
  { id: 'hol-1405-1104', date: '1405/11/04', title: 'ولادت حضرت قائم (عج) و جشن نیمه شعبان', isRecurring: false },
  { id: 'hol-1405-1209', date: '1405/12/09', title: 'شهادت حضرت امام علی (ع)', isRecurring: false },
  { id: 'hol-1405-1219', date: '1405/12/19', title: 'عید سعید فطر', isRecurring: false },
  { id: 'hol-1405-1220', date: '1405/12/20', title: 'تعطیل به مناسبت عید سعید فطر', isRecurring: false },

  // --- Official Lunar Holidays for 1406 (تعطیلات مناسبتی قمری سال ۱۴۰۶) ---
  { id: 'hol-1406-0114', date: '1406/01/14', title: 'شهادت امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1406-0226', date: '1406/02/26', title: 'عید سعید قربان', isRecurring: false },
  { id: 'hol-1406-0304', date: '1406/03/04', title: 'عید سعید غدیر خم', isRecurring: false },
  { id: 'hol-1406-0323', date: '1406/03/23', title: 'تاسوعای حسینی', isRecurring: false },
  { id: 'hol-1406-0324', date: '1406/03/24', title: 'عاشورای حسینی', isRecurring: false },
  { id: 'hol-1406-0502', date: '1406/05/02', title: 'اربعین حسینی', isRecurring: false },
  { id: 'hol-1406-0510', date: '1406/05/10', title: 'رحلت رسول اکرم (ص) و شهادت امام حسن مجتبی (ع)', isRecurring: false },
  { id: 'hol-1406-0511', date: '1406/05/11', title: 'شهادت امام رضا (ع)', isRecurring: false },
  { id: 'hol-1406-0520', date: '1406/05/20', title: 'شهادت امام حسن عسکری (ع)', isRecurring: false },
  { id: 'hol-1406-0528', date: '1406/05/28', title: 'میلاد رسول اکرم (ص) و امام جعفر صادق (ع)', isRecurring: false },
  { id: 'hol-1406-0811', date: '1406/08/11', title: 'شهادت حضرت زهرا (س)', isRecurring: false },
  { id: 'hol-1406-0921', date: '1406/09/21', title: 'ولادت حضرت امام علی (ع) و روز پدر', isRecurring: false },
  { id: 'hol-1406-1006', date: '1406/10/06', title: 'مبعث رسول اکرم (ص)', isRecurring: false },
  { id: 'hol-1406-1024', date: '1406/10/24', title: 'ولادت حضرت قائم (عج) و جشن نیمه شعبان', isRecurring: false },
  { id: 'hol-1406-1128', date: '1406/11/28', title: 'شهادت حضرت امام علی (ع)', isRecurring: false },
  { id: 'hol-1406-1208', date: '1406/12/08', title: 'عید سعید فطر', isRecurring: false },
  { id: 'hol-1406-1209', date: '1406/12/09', title: 'تعطیل به مناسبت عید سعید فطر', isRecurring: false }
];

export const DEFAULT_SETTINGS: UserSettings = {
  dailyQuotaHours: 8,
  dailyQuotaMinutes: 15, // 8h 15m = 495 minutes (07:15 to 15:30)
  standardEntryTime: '07:15',
  standardExitTime: '15:30',
  isThursdayHoliday: false, // Friday is always holiday
  departureReminderEnabled: false,
  reminderMinutesBeforeQuota: 0,
  entryReminderEnabled: false,
  entryReminderTime: '07:15',
  theme: 'dark'
};

/**
 * Calculates day shift evaluation:
 * - Entry delay after standardEntryTime (default 07:15)
 * - Early departure deficit before standardExitTime (default 15:30)
 * - Overtime after standardExitTime (default 15:30) or 100% on holidays
 */
export function calculateDayShiftEvaluation(params: {
  dateStr: string;
  dayIntervals: WorkInterval[];
  dayLeaves: LeaveRecord[];
  isWorkDay: boolean;
  standardEntryMinutes?: number; // default 435 (07:15)
  standardExitMinutes?: number;  // default 930 (15:30)
  currentTimeMinutes?: number;
  isToday?: boolean;
}): {
  dayWorkMinutes: number;
  delayMinutes: number;
  entryDelayMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
} {
  const {
    dayIntervals,
    dayLeaves,
    isWorkDay,
    standardEntryMinutes = 7 * 60 + 15, // 435 (07:15)
    standardExitMinutes = 15 * 60 + 30, // 930 (15:30)
    currentTimeMinutes,
    isToday = false
  } = params;

  // 1. Calculate total work minutes
  let dayWorkMinutes = 0;
  for (const inter of dayIntervals) {
    if (inter.endTime === null) {
      if (isToday && currentTimeMinutes !== undefined) {
        dayWorkMinutes += calculateIntervalMinutes(inter.startTime, null, currentTimeMinutes);
      }
    } else {
      dayWorkMinutes += calculateIntervalMinutes(inter.startTime, inter.endTime);
    }
  }

  // 2. Holiday evaluation:
  if (!isWorkDay) {
    return {
      dayWorkMinutes,
      delayMinutes: 0,
      entryDelayMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: dayWorkMinutes
    };
  }

  // 3. Normal work day:
  const hasFullDayLeave = dayLeaves.some((l) => l.type === 'full_day');
  if (hasFullDayLeave) {
    return {
      dayWorkMinutes,
      delayMinutes: 0,
      entryDelayMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0
    };
  }

  // Calculate Overtime on work day:
  // Rule: "هر چقدر از ساعت 3:30 (15:30) دیرتر خارج شوم اضافه کار میخورم بدون توجه به ساعت ورودم"
  let overtimeMinutes = 0;
  for (const inter of dayIntervals) {
    const startM = timeStringToMinutes(inter.startTime);
    const endM =
      inter.endTime !== null
        ? timeStringToMinutes(inter.endTime)
        : isToday && currentTimeMinutes !== undefined
        ? currentTimeMinutes
        : startM;

    if (endM > standardExitMinutes) {
      const ot = endM - Math.max(startM, standardExitMinutes);
      overtimeMinutes += Math.max(0, ot);
    }
  }

  // Calculate Delay / Deficit on work day:
  // Rule: "ساعت ورودم به شرکت باید در روزهای غیر تعطیل ساعت 7 و 15 دقیقه باشد. هرمقدار که از این ساعت دیرتر ورود بزنم برایم کسر کار یا تاخیر در نظر گرفته میشه"
  let entryDelayMinutes = 0;
  let earlyDepartureMinutes = 0;

  if (dayIntervals.length > 0) {
    const sorted = [...dayIntervals].sort(
      (a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime)
    );
    const firstStart = timeStringToMinutes(sorted[0].startTime);

    if (firstStart > standardEntryMinutes) {
      let rawDelay = firstStart - standardEntryMinutes;
      // Subtract approved hourly leaves covering morning delay
      for (const l of dayLeaves) {
        if (l.type === 'hourly' && l.startTime && l.endTime) {
          const lStart = timeStringToMinutes(l.startTime);
          const lEnd = timeStringToMinutes(l.endTime);
          const overlap = Math.max(
            0,
            Math.min(firstStart, lEnd) - Math.max(standardEntryMinutes, lStart)
          );
          rawDelay = Math.max(0, rawDelay - overlap);
        } else if (l.type === 'hourly') {
          rawDelay = Math.max(0, rawDelay - l.durationMinutes);
        }
      }
      entryDelayMinutes = rawDelay;
    }

    // Early departure (if closed and not currently working, and workday has passed exit time)
    const hasOpenInterval = dayIntervals.some((i) => i.endTime === null);
    const isDayPastExitTime =
      !isToday ||
      (currentTimeMinutes !== undefined && currentTimeMinutes >= standardExitMinutes);

    if (!hasOpenInterval && isDayPastExitTime) {
      const lastEnd = Math.max(
        ...sorted.map((i) =>
          i.endTime !== null
            ? timeStringToMinutes(i.endTime)
            : isToday && currentTimeMinutes !== undefined
            ? currentTimeMinutes
            : standardExitMinutes
        )
      );

      if (lastEnd < standardExitMinutes) {
        let rawEarly = standardExitMinutes - lastEnd;
        for (const l of dayLeaves) {
          if (l.type === 'hourly' && l.startTime && l.endTime) {
            const lStart = timeStringToMinutes(l.startTime);
            const lEnd = timeStringToMinutes(l.endTime);
            const overlap = Math.max(
              0,
              Math.min(standardExitMinutes, lEnd) - Math.max(lastEnd, lStart)
            );
            rawEarly = Math.max(0, rawEarly - overlap);
          }
        }
        earlyDepartureMinutes = rawEarly;
      }
    }
  } else {
    // No intervals on this workday
    if (isToday && currentTimeMinutes !== undefined) {
      if (currentTimeMinutes > standardEntryMinutes) {
        entryDelayMinutes = currentTimeMinutes - standardEntryMinutes;
        for (const l of dayLeaves) {
          if (l.type === 'hourly' && l.startTime && l.endTime) {
            const lStart = timeStringToMinutes(l.startTime);
            const lEnd = timeStringToMinutes(l.endTime);
            const overlap = Math.max(
              0,
              Math.min(currentTimeMinutes, lEnd) - Math.max(standardEntryMinutes, lStart)
            );
            entryDelayMinutes = Math.max(0, entryDelayMinutes - overlap);
          }
        }
      }
    }
  }

  const delayMinutes = entryDelayMinutes + earlyDepartureMinutes;

  return {
    dayWorkMinutes,
    delayMinutes,
    entryDelayMinutes,
    earlyDepartureMinutes,
    overtimeMinutes
  };
}

/**
 * Calculates duration in minutes for an interval.
 * If endTime is null, pass nowMinutes to calculate live duration.
 */
export function calculateIntervalMinutes(
  startTime: string,
  endTime: string | null,
  nowMinutes?: number
): number {
  const start = timeStringToMinutes(startTime);
  if (endTime === null) {
    if (nowMinutes === undefined) return 0;
    return Math.max(0, nowMinutes - start);
  }
  const end = timeStringToMinutes(endTime);
  return Math.max(0, end - start);
}

/**
 * Determines whether a given Shamsi date is an official holiday.
 */
export function isDateOfficialHoliday(
  dateStr: string,
  holidays: OfficialHoliday[]
): { isHoliday: boolean; title?: string } {
  const { month, day } = parseJalaliDate(dateStr);
  const mmdd = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

  for (const h of holidays) {
    if (h.isRecurring) {
      if (h.date === mmdd) {
        return { isHoliday: true, title: h.title };
      }
    } else {
      if (h.date === dateStr) {
        return { isHoliday: true, title: h.title };
      }
    }
  }

  return { isHoliday: false };
}

/**
 * Determines whether a date is a weekly holiday based on user settings.
 * Friday (index 6) is always holiday. Thursday (index 5) is optional.
 */
export function isDateWeeklyHoliday(
  jy: number,
  jm: number,
  jd: number,
  isThursdayHoliday: boolean
): boolean {
  const dayOfWeek = getJalaliDayOfWeek(jy, jm, jd);
  if (dayOfWeek === 6) return true; // Friday
  if (dayOfWeek === 5 && isThursdayHoliday) return true; // Thursday
  return false;
}

/**
 * Validates if an interval has valid start/end times and doesn't overlap
 * with existing intervals or hourly leaves on the same day.
 */
export function validateInterval(
  newStart: string,
  newEnd: string | null,
  existingIntervals: Array<{ id: string; startTime: string; endTime: string | null }>,
  excludeId?: string
): { isValid: boolean; errorMessage?: string } {
  const startM = timeStringToMinutes(newStart);

  if (newEnd !== null) {
    const endM = timeStringToMinutes(newEnd);
    if (endM <= startM) {
      return {
        isValid: false,
        errorMessage: 'ساعت پایان باید بعد از ساعت شروع باشد.'
      };
    }
  }

  for (const item of existingIntervals) {
    if (excludeId && item.id === excludeId) continue;
    const itemStart = timeStringToMinutes(item.startTime);
    const itemEnd = item.endTime !== null ? timeStringToMinutes(item.endTime) : 1440; // open till midnight

    const thisEnd = newEnd !== null ? timeStringToMinutes(newEnd) : 1440;

    // Overlap condition: start < otherEnd and end > otherStart
    if (startM < itemEnd && thisEnd > itemStart) {
      return {
        isValid: false,
        errorMessage: `بازه انتخابی با بازه موجود (${item.startTime} تا ${item.endTime || 'اکنون'}) همپوشانی دارد.`
      };
    }
  }

  return { isValid: true };
}

/**
 * Primary Monthly Calculation Engine.
 * Evaluates D, P, L, H, remaining quota, normal overtime, total overtime,
 * and day-by-day accumulated overtime for any Shamsi month.
 */
export function calculateMonthStats(params: {
  year: number;
  month: number;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  holidays: OfficialHoliday[];
  settings: UserSettings;
  currentTimeMinutes?: number; // Optional live minutes for open interval
  currentDateStr?: string; // e.g. "1405/07/07"
}): MonthCalculationResult {
  const { year, month, intervals, leaves, holidays, settings, currentTimeMinutes, currentDateStr } = params;

  const dailyQuotaMinutes = settings.dailyQuotaHours * 60 + settings.dailyQuotaMinutes;
  const daysInMonth = getJalaliMonthDays(year, month);

  // Group intervals and leaves by date
  const intervalsByDate = new Map<string, WorkInterval[]>();
  for (const interval of intervals) {
    const list = intervalsByDate.get(interval.date) || [];
    list.push(interval);
    intervalsByDate.set(interval.date, list);
  }

  const leavesByDate = new Map<string, LeaveRecord[]>();
  for (const leave of leaves) {
    const list = leavesByDate.get(leave.date) || [];
    list.push(leave);
    leavesByDate.set(leave.date, list);
  }

  let workDaysCount = 0;
  let elapsedWorkDaysCount = 0;
  let P_minutes = 0; // work minutes on normal work days
  let L_minutes = 0; // leave minutes
  let H_minutes = 0; // work minutes on holidays
  let daysWithWorkCount = 0;
  let daysWithLeaveCount = 0;

  let parsedCurrentDate: { year: number; month: number; day: number } | null = null;
  if (currentDateStr) {
    try {
      parsedCurrentDate = parseJalaliDate(currentDateStr);
    } catch {
      parsedCurrentDate = null;
    }
  }

  const standardEntryM = timeStringToMinutes(settings.standardEntryTime || '07:15');
  const standardExitM = timeStringToMinutes(settings.standardExitTime || '15:30');

  // First pass: identify work days, calculate daily work and leave totals
  interface TempDayData {
    date: string;
    dayOfWeekIndex: number;
    isWeeklyHoliday: boolean;
    isOfficialHoliday: boolean;
    holidayTitle?: string;
    isWorkDay: boolean;
    isElapsed: boolean;
    workMinutes: number;
    leaveMinutes: number;
    delayMinutes: number;
    entryDelayMinutes: number;
    overtimeMinutes: number;
  }

  const tempDays: TempDayData[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatJalaliDate(year, month, day);
    const dayOfWeek = getJalaliDayOfWeek(year, month, day);
    const weeklyHoliday = isDateWeeklyHoliday(year, month, day, settings.isThursdayHoliday);
    const officialHolidayResult = isDateOfficialHoliday(dateStr, holidays);
    const isWorkDay = !weeklyHoliday && !officialHolidayResult.isHoliday;

    let isElapsed = false;
    if (!parsedCurrentDate) {
      isElapsed = true;
    } else if (
      year < parsedCurrentDate.year ||
      (year === parsedCurrentDate.year && month < parsedCurrentDate.month)
    ) {
      isElapsed = true;
    } else if (
      year === parsedCurrentDate.year &&
      month === parsedCurrentDate.month &&
      day <= parsedCurrentDate.day
    ) {
      isElapsed = true;
    } else {
      isElapsed = false;
    }

    if (isWorkDay) {
      workDaysCount += 1;
      if (isElapsed) {
        elapsedWorkDaysCount += 1;
      }
    }

    // Day intervals & leaves
    const dayIntervals = intervalsByDate.get(dateStr) || [];
    const dayLeaves = leavesByDate.get(dateStr) || [];

    // Evaluate day shift (07:15 arrival delay, 15:30 departure overtime, holidays)
    const shiftEval = calculateDayShiftEvaluation({
      dateStr,
      dayIntervals,
      dayLeaves,
      isWorkDay,
      standardEntryMinutes: standardEntryM,
      standardExitMinutes: standardExitM,
      currentTimeMinutes,
      isToday: dateStr === currentDateStr
    });

    // Leave minutes on this day
    let dayLeaveMinutes = 0;
    for (const l of dayLeaves) {
      if (l.type === 'full_day') {
        dayLeaveMinutes += dailyQuotaMinutes;
      } else {
        dayLeaveMinutes += l.durationMinutes;
      }
    }

    if (shiftEval.dayWorkMinutes > 0) {
      daysWithWorkCount += 1;
    }
    if (dayLeaveMinutes > 0) {
      daysWithLeaveCount += 1;
    }

    if (isWorkDay) {
      P_minutes += shiftEval.dayWorkMinutes;
      L_minutes += dayLeaveMinutes;
    } else {
      H_minutes += shiftEval.dayWorkMinutes;
    }

    tempDays.push({
      date: dateStr,
      dayOfWeekIndex: dayOfWeek,
      isWeeklyHoliday: weeklyHoliday,
      isOfficialHoliday: officialHolidayResult.isHoliday,
      holidayTitle: officialHolidayResult.title,
      isWorkDay,
      isElapsed,
      workMinutes: shiftEval.dayWorkMinutes,
      leaveMinutes: dayLeaveMinutes,
      delayMinutes: shiftEval.delayMinutes,
      entryDelayMinutes: shiftEval.entryDelayMinutes,
      overtimeMinutes: shiftEval.overtimeMinutes
    });
  }

  // Monthly totals
  const D_minutes = Math.round(workDaysCount * dailyQuotaMinutes);
  const elapsedQuotaMinutes = Math.round(elapsedWorkDaysCount * dailyQuotaMinutes);
  const remainingMinutes = Math.max(0, Math.round(D_minutes - P_minutes - L_minutes));

  // Second pass: Chronological day-by-day accumulation
  const dailyBreakdown: Record<string, DayCalculationResult> = {};
  let cumTotalWork = 0;
  let cumTotalOvertime = 0;
  let cumTotalDelay = 0;
  let elapsedDelayMinutes = 0;
  let elapsedGrossOvertimeMinutes = 0;

  for (const d of tempDays) {
    cumTotalWork += d.workMinutes;
    cumTotalOvertime += d.overtimeMinutes;
    cumTotalDelay += d.delayMinutes;

    if (d.isElapsed) {
      elapsedDelayMinutes += d.delayMinutes;
      elapsedGrossOvertimeMinutes += d.overtimeMinutes;
    }

    const netDayOvertime = Math.max(0, cumTotalOvertime - cumTotalDelay);

    dailyBreakdown[d.date] = {
      date: d.date,
      dayOfWeekIndex: d.dayOfWeekIndex,
      isWeeklyHoliday: d.isWeeklyHoliday,
      isOfficialHoliday: d.isOfficialHoliday,
      holidayTitle: d.holidayTitle,
      isWorkDay: d.isWorkDay,
      workMinutes: d.workMinutes,
      leaveMinutes: d.leaveMinutes,
      delayMinutes: d.delayMinutes,
      entryDelayMinutes: d.entryDelayMinutes,
      overtimeMinutes: d.overtimeMinutes,
      cumulativeWorkMinutes: cumTotalWork,
      cumulativeOvertimeMinutes: cumTotalOvertime,
      cumulativeDelayMinutes: cumTotalDelay,
      netOvertimeMinutes: netDayOvertime
    };
  }

  const totalDelayMinutes = cumTotalDelay;
  const grossOvertimeMinutes = cumTotalOvertime;
  // User rule: "در پایان مجموع کسر کار یا تاخیر ها منهای اضافه کار میشه و باقی مانده برابر با اضافه کار میشه"
  const netOvertimeMinutes = Math.max(0, grossOvertimeMinutes - totalDelayMinutes);
  const netDelayDeficitMinutes = Math.max(0, totalDelayMinutes - grossOvertimeMinutes);

  const elapsedNetOvertimeMinutes = Math.max(0, elapsedGrossOvertimeMinutes - elapsedDelayMinutes);
  const totalWorkMinutes = P_minutes + H_minutes;
  const normalOvertimeMinutes = Math.max(0, netOvertimeMinutes - H_minutes);

  return {
    year,
    month,
    workDaysCount,
    dailyQuotaMinutes,
    D_minutes,
    elapsedWorkDaysCount,
    elapsedQuotaMinutes,
    P_minutes,
    L_minutes,
    H_minutes,
    totalWorkMinutes,
    daysWithWorkCount,
    daysWithLeaveCount,
    remainingMinutes,
    totalDelayMinutes,
    elapsedDelayMinutes,
    grossOvertimeMinutes,
    elapsedGrossOvertimeMinutes,
    netOvertimeMinutes,
    elapsedNetOvertimeMinutes,
    netDelayDeficitMinutes,
    normalOvertimeMinutes,
    totalOvertimeMinutes: netOvertimeMinutes,
    totalOvertime: netOvertimeMinutes,
    dailyBreakdown
  };
}
