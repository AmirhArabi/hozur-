import { WorkInterval, LeaveRecord, OfficialHoliday, UserSettings, IncompleteRecordIssue } from '../types';
import { formatJalaliDate, getCurrentJalaliDate } from '../utils/jalali';

/**
 * Service to detect incomplete, overlapping, or abnormal records in user's attendance log.
 */
export function auditAttendanceRecords(params: {
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  holidays: OfficialHoliday[];
  settings: UserSettings;
}): IncompleteRecordIssue[] {
  const { intervals } = params;
  const issues: IncompleteRecordIssue[] = [];
  const today = getCurrentJalaliDate();
  const todayStr = formatJalaliDate(today.year, today.month, today.day);

  // 1. Group intervals by date
  const byDate = new Map<string, WorkInterval[]>();
  intervals.forEach((iv) => {
    const list = byDate.get(iv.date) || [];
    list.push(iv);
    byDate.set(iv.date, list);
  });

  // Check intervals
  intervals.forEach((iv) => {
    // 1. Open past intervals
    if (!iv.endTime && iv.date < todayStr) {
      issues.push({
        id: `open-${iv.id}`,
        date: iv.date,
        type: 'open_past_interval',
        severity: 'error',
        title: 'تردد باز از روزهای گذشته',
        description: `تردد روز ${iv.date} (شروع ساعت ${iv.startTime}) ساعت خروج ثبت نشده دارد.`,
        intervalId: iv.id,
      });
    }

    // 2. Abnormally long intervals (> 14 hours = 840 minutes)
    if (iv.startTime && iv.endTime) {
      const [sh, sm] = iv.startTime.split(':').map(Number);
      const [eh, em] = iv.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (endMin > startMin) {
        const durationMin = endMin - startMin;
        if (durationMin > 14 * 60) {
          issues.push({
            id: `long-${iv.id}`,
            date: iv.date,
            type: 'excessive_duration',
            severity: 'warning',
            title: 'طول تردد غیرعادی',
            description: `تردد روز ${iv.date} از ${iv.startTime} تا ${iv.endTime} بیش از ۱۴ ساعت ثبت شده است.`,
            intervalId: iv.id,
          });
        }
      }
    }
  });

  // 3. Overlapping intervals on same date
  byDate.forEach((list, date) => {
    if (list.length > 1) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (a.startTime && a.endTime && b.startTime && b.endTime) {
            const [aSh, aSm] = a.startTime.split(':').map(Number);
            const [aEh, aEm] = a.endTime.split(':').map(Number);
            const aStart = aSh * 60 + aSm;
            const aEnd = aEh * 60 + aEm;

            const [bSh, bSm] = b.startTime.split(':').map(Number);
            const [bEh, bEm] = b.endTime.split(':').map(Number);
            const bStart = bSh * 60 + bSm;
            const bEnd = bEh * 60 + bEm;

            if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
              issues.push({
                id: `overlap-${a.id}-${b.id}`,
                date,
                type: 'overlapping',
                severity: 'warning',
                title: 'هم‌پوشانی ترددها',
                description: `در روز ${date} دو تردد (${a.startTime}-${a.endTime}) و (${b.startTime}-${b.endTime}) دارای تداخل زمانی هستند.`,
                intervalId: a.id,
              });
            }
          }
        }
      }
    }
  });

  // Sort issues by date descending
  return issues.sort((a, b) => b.date.localeCompare(a.date));
}
