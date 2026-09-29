/**
 * Export & Backup Service
 * Handles CSV export and JSON backup/restore using @capacitor/filesystem
 * and @capacitor/share on Android, with robust Web Blob download fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LeaveRecord, MonthCalculationResult, WorkInterval } from '../types';
import {
  formatMinutesToPersianHM,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  toPersianDigits
} from '../utils/jalali';

export const ExportService = {
  /**
   * Universal file sharer / downloader
   */
  async shareOrDownloadFile(fileName: string, content: string, mimeType: string): Promise<boolean> {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: fileName,
          url: writeResult.uri,
          dialogTitle: `اشتراک‌گذاری ${fileName}`
        });

        return true;
      } catch (err) {
        console.warn('Native share failed, falling back to web download:', err);
      }
    }

    // Web fallback
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Generates Persian CSV content for a month
   */
  generateMonthCSV(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[]
  ): string {
    const monthName = PERSIAN_MONTH_NAMES[monthStats.month - 1];
    const intervalsByDate = new Map<string, WorkInterval[]>();
    for (const item of intervals) {
      const list = intervalsByDate.get(item.date) || [];
      list.push(item);
      intervalsByDate.set(item.date, list);
    }

    const leavesByDate = new Map<string, LeaveRecord[]>();
    for (const item of leaves) {
      const list = leavesByDate.get(item.date) || [];
      list.push(item);
      leavesByDate.set(item.date, list);
    }

    // Include UTF-8 BOM for Persian text rendering in Excel
    let csv = '\uFEFF';
    csv += `گزارش کارکرد ماه ${monthName} سال ${toPersianDigits(monthStats.year)}\n`;
    csv += `مجموع کارکرد,${formatMinutesToPersianHM(monthStats.totalWorkMinutes)},ساعات موظفی,${formatMinutesToPersianHM(monthStats.D_minutes)},مانده موظفی,${formatMinutesToPersianHM(monthStats.remainingMinutes)},اضافه‌کار کل,${formatMinutesToPersianHM(monthStats.totalOvertimeMinutes)}\n\n`;

    csv += 'تاریخ,روز هفته,وضعیت روز,بازه‌های کاری,مرخصی,کارکرد (دقیقه),کارکرد,اضافه‌کار روز (دقیقه),اضافه‌کار روز\n';

    const sortedDates = Object.keys(monthStats.dailyBreakdown).sort();

    for (const dateStr of sortedDates) {
      const day = monthStats.dailyBreakdown[dateStr];
      const weekdayName = PERSIAN_WEEKDAYS[day.dayOfWeekIndex];

      let status = 'روز کاری عادی';
      if (day.isOfficialHoliday) {
        status = `تعطیل رسمی (${day.holidayTitle || 'رسمی'})`;
      } else if (day.isWeeklyHoliday) {
        status = 'تعطیل هفتگی';
      }

      const dayIntervals = intervalsByDate.get(dateStr) || [];
      const intervalStrs = dayIntervals.map(
        (i) => `${toPersianDigits(i.startTime)} تا ${i.endTime ? toPersianDigits(i.endTime) : 'در حال کار'}`
      );
      const intervalsCell = intervalStrs.length > 0 ? `"${intervalStrs.join(' | ')}"` : '-';

      const dayLeaves = leavesByDate.get(dateStr) || [];
      const leaveStrs = dayLeaves.map((l) =>
        l.type === 'full_day'
          ? 'مرخصی تمام‌روز'
          : `ساعتی ${toPersianDigits(l.startTime || '')} تا ${toPersianDigits(l.endTime || '')}`
      );
      const leavesCell = leaveStrs.length > 0 ? `"${leaveStrs.join(' | ')}"` : '-';

      csv += [
        toPersianDigits(dateStr),
        weekdayName,
        `"${status}"`,
        intervalsCell,
        leavesCell,
        day.workMinutes,
        `"${formatMinutesToPersianHM(day.workMinutes)}"`,
        day.overtimeMinutes,
        `"${formatMinutesToPersianHM(day.overtimeMinutes)}"`
      ].join(',') + '\n';
    }

    return csv;
  },

  /**
   * Export month CSV
   */
  async exportMonthCSV(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[]
  ): Promise<boolean> {
    const csvContent = this.generateMonthCSV(monthStats, intervals, leaves);
    const fileName = `work_tracker_${monthStats.year}_${String(monthStats.month).padStart(2, '0')}.csv`;
    return this.shareOrDownloadFile(fileName, csvContent, 'text/csv;charset=utf-8;');
  },

  /**
   * Export full JSON backup
   */
  async exportJSONBackup(jsonString: string): Promise<boolean> {
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `work_tracker_backup_${dateStamp}.json`;
    return this.shareOrDownloadFile(fileName, jsonString, 'application/json;charset=utf-8;');
  }
};
