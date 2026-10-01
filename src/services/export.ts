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

    const totalOvertime = monthStats.totalOvertime ?? monthStats.totalOvertimeMinutes ?? 0;

    // Include UTF-8 BOM for Persian text rendering in Excel
    let csv = '\uFEFF';
    csv += `گزارش کارکرد ماه ${monthName} سال ${toPersianDigits(monthStats.year)}\n`;
    csv += `ساعات کاری,${formatMinutesToPersianHM(monthStats.totalWorkMinutes)},ساعات موظفی,${formatMinutesToPersianHM(monthStats.D_minutes)},مانده موظفی,${formatMinutesToPersianHM(monthStats.remainingMinutes)},اضافه‌کار کل,${formatMinutesToPersianHM(totalOvertime)}\n\n`;

    csv += 'ردیف,تاریخ,روز هفته,وضعیت روز,بازه‌های کاری,مرخصی,کارکرد (دقیقه),ساعت کارکرد,اضافه کار (دقیقه),ساعت اضافه کار\n';

    const sortedDates = Object.keys(monthStats.dailyBreakdown).sort();

    let rowIndex = 1;
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
        rowIndex,
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

      rowIndex += 1;
    }

    // Totals row at the bottom
    csv += [
      'مجموع کل',
      '',
      '',
      '',
      '',
      '',
      monthStats.totalWorkMinutes,
      `"${formatMinutesToPersianHM(monthStats.totalWorkMinutes)}"`,
      totalOvertime,
      `"${formatMinutesToPersianHM(totalOvertime)}"`
    ].join(',') + '\n';

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
   * Generates styled HTML Excel content (.xls) matching the report modal styling exactly
   */
  generateMonthXLS(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[]
  ): string {
    const monthName = PERSIAN_MONTH_NAMES[monthStats.month - 1];
    const totalOvertime = monthStats.totalOvertime ?? monthStats.totalOvertimeMinutes ?? 0;
    const totalWorkAndLeave = (monthStats.totalWorkMinutes || 0) + (monthStats.L_minutes || 0);

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

    const sortedDates = Object.keys(monthStats.dailyBreakdown).sort();

    let tableRows = '';
    let rowIndex = 1;

    for (const dateStr of sortedDates) {
      const day = monthStats.dailyBreakdown[dateStr];
      const weekdayName = PERSIAN_WEEKDAYS[day.dayOfWeekIndex];
      const dayIntervals = intervalsByDate.get(dateStr) || [];
      const dayLeaves = leavesByDate.get(dateStr) || [];

      const isHoliday = day.isOfficialHoliday || day.isWeeklyHoliday;
      const hasOvertime = day.overtimeMinutes > 0;

      // Status badge style
      let statusHtml = '';
      if (day.isOfficialHoliday) {
        statusHtml = `<span style="background-color: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 1px solid #fca5a5;">${day.holidayTitle || 'تعطیل رسمی'}</span>`;
      } else if (day.isWeeklyHoliday) {
        statusHtml = `<span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; border: 1px solid #fcd34d;">تعطیل هفتگی</span>`;
      } else {
        statusHtml = `<span style="background-color: #f3f4f6; color: #4b5563; padding: 2px 8px; border-radius: 9999px; font-size: 11px;">روز کاری عادی</span>`;
      }

      // Intervals text
      let intervalsHtml = '-';
      if (dayIntervals.length > 0) {
        intervalsHtml = dayIntervals
          .map((i) => `${toPersianDigits(i.startTime)} تا ${i.endTime ? toPersianDigits(i.endTime) : 'در حال ثبت...'}`)
          .join('<br>');
      }

      // Leaves text
      let leavesHtml = '-';
      if (dayLeaves.length > 0) {
        leavesHtml = dayLeaves
          .map((l) => (l.type === 'full_day' ? 'تمام‌روز' : `ساعتی ${toPersianDigits(l.startTime || '')} - ${toPersianDigits(l.endTime || '')}`))
          .join('<br>');
      }

      const rowBg = isHoliday ? '#f9fafb' : rowIndex % 2 === 0 ? '#ffffff' : '#fcfcfc';

      tableRows += `
      <tr style="background-color: ${rowBg};">
        <td style="text-align: center; color: #9ca3af; font-family: monospace; border: 1px solid #e5e7eb; padding: 8px 10px;">${toPersianDigits(rowIndex)}</td>
        <td style="font-family: monospace; font-weight: bold; color: #111827; border: 1px solid #e5e7eb; padding: 8px 10px; text-align: center;">${toPersianDigits(dateStr)}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: center;">${weekdayName}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: center;">${statusHtml}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; font-family: monospace; font-size: 11px;">${intervalsHtml}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 11px;">${leavesHtml}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: center; font-family: monospace; font-weight: bold; color: #111827;">${day.workMinutes > 0 ? formatMinutesToPersianHM(day.workMinutes) : '-'}</td>
        <td style="border: 1px solid #e5e7eb; padding: 8px 10px; text-align: center; font-family: monospace; font-weight: bold; color: ${hasOvertime ? '#059669' : '#9ca3af'};">${hasOvertime ? formatMinutesToPersianHM(day.overtimeMinutes) : '-'}</td>
      </tr>`;

      rowIndex += 1;
    }

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>گزارش ${monthName} ${toPersianDigits(monthStats.year)}</x:Name>
    <x:WorksheetOptions>
     <x:DisplayRightToLeft/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body, table, td, th {
    font-family: 'Vazirmatn', Tahoma, 'Segoe UI', Arial, sans-serif;
    direction: rtl;
    text-align: right;
  }
</style>
</head>
<body dir="rtl" style="font-family: Tahoma, 'Segoe UI', Arial, sans-serif; padding: 15px; direction: rtl;">

  <!-- Header Title -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
    <tr>
      <td colspan="8" style="background-color: #f3f4f6; border: 1px solid #d1d5db; padding: 14px; text-align: center;">
        <h2 style="margin: 0; font-size: 16pt; color: #111827; font-weight: bold;">جدول گزارش اکسل ماه ${monthName} سال ${toPersianDigits(monthStats.year)}</h2>
        <span style="font-size: 10pt; color: #6b7280;">خلاصه آمار و جزئیات ساعات کارکرد، موظفی و اضافه‌کار</span>
      </td>
    </tr>
  </table>

  <!-- Summary Cards Strip (همانند نوار خلاصه مودال) -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    <tr>
      <td style="width: 25%; background-color: #ffffff; border: 1px solid #d1d5db; padding: 10px; text-align: center;">
        <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">ساعات کاری</div>
        <div style="font-size: 14pt; font-weight: bold; font-family: monospace; color: #111827;">${formatMinutesToPersianHM(monthStats.totalWorkMinutes)}</div>
      </td>
      <td style="width: 25%; background-color: #ffffff; border: 1px solid #d1d5db; padding: 10px; text-align: center;">
        <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">ساعات موظفی کل ماه</div>
        <div style="font-size: 14pt; font-weight: bold; font-family: monospace; color: #111827;">${formatMinutesToPersianHM(monthStats.D_minutes)}</div>
      </td>
      <td style="width: 25%; background-color: #ffffff; border: 1px solid #d1d5db; padding: 10px; text-align: center;">
        <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">ساعات اضافه کار</div>
        <div style="font-size: 14pt; font-weight: bold; font-family: monospace; color: #059669;">${formatMinutesToPersianHM(totalOvertime)}</div>
      </td>
      <td style="width: 25%; background-color: #ffffff; border: 1px solid #d1d5db; padding: 10px; text-align: center;">
        <div style="font-size: 9pt; color: #6b7280; margin-bottom: 4px;">کارکرد تا امروز (کاری + مرخصی)</div>
        <div style="font-size: 14pt; font-weight: bold; font-family: monospace; color: #111827;">${formatMinutesToPersianHM(totalWorkAndLeave)}</div>
      </td>
    </tr>
  </table>

  <!-- Main Detailed Table (طراحی دقیقاً مانند جدول مودال) -->
  <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
    <thead>
      <tr style="background-color: #f3f4f6; color: #1f2937; border-bottom: 2px solid #d1d5db;">
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 45px;">ردیف</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 100px;">تاریخ</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 85px;">روز هفته</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 120px;">وضعیت روز</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: right; width: 180px;">بازه‌های کاری</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: right; width: 130px;">مرخصی</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 95px;">ساعت کارکرد</th>
        <th style="border: 1px solid #d1d5db; padding: 10px 8px; text-align: center; width: 95px;">ساعت اضافه کار</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr style="background-color: #e5e7eb; font-weight: bold; border-top: 2px solid #9ca3af;">
        <td colspan="6" style="border: 1px solid #d1d5db; padding: 12px 14px; text-align: left; font-size: 11pt; color: #111827;">مجموع کل ماه:</td>
        <td style="border: 1px solid #d1d5db; padding: 12px 8px; text-align: center; font-family: monospace; font-size: 12pt; color: #111827;">${formatMinutesToPersianHM(monthStats.totalWorkMinutes)}</td>
        <td style="border: 1px solid #d1d5db; padding: 12px 8px; text-align: center; font-family: monospace; font-size: 12pt; color: #059669;">${formatMinutesToPersianHM(totalOvertime)}</td>
      </tr>
    </tfoot>
  </table>

</body>
</html>`;
  },

  /**
   * Export month XLS with full styling matching the report modal
   */
  async exportMonthXLS(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[]
  ): Promise<boolean> {
    const xlsContent = this.generateMonthXLS(monthStats, intervals, leaves);
    const fileName = `گزارش_کارکرد_${monthStats.year}_${String(monthStats.month).padStart(2, '0')}.xls`;
    return this.shareOrDownloadFile(fileName, xlsContent, 'application/vnd.ms-excel;charset=utf-8;');
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
