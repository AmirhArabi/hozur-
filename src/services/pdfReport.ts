import { LeaveRecord, MonthCalculationResult, UserSettings, WorkInterval } from '../types';
import {
  formatJalaliDate,
  formatMinutesToPersianHM,
  getCurrentJalaliDate,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  toPersianDigits
} from '../utils/jalali';

export const PdfReportService = {
  /**
   * Generates a clean, print-optimized HTML string for monthly report
   */
  generatePrintableHtml(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[],
    settings?: UserSettings
  ): string {
    const monthName = PERSIAN_MONTH_NAMES[monthStats.month - 1];
    const today = getCurrentJalaliDate();
    const todayStr = formatJalaliDate(today.year, today.month, today.day);

    const totalOvertime = Math.round(monthStats.totalOvertime ?? monthStats.totalOvertimeMinutes ?? 0);
    const normalOvertime = Math.round(monthStats.normalOvertimeMinutes ?? 0);
    const holidayOvertime = Math.round(monthStats.H_minutes ?? 0);
    const totalWorkAndLeave = Math.round((monthStats.totalWorkMinutes || 0) + (monthStats.L_minutes || 0));

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

      let statusBadge = 'روز کاری عادی';
      let statusColor = '#374151';
      let statusBg = '#f3f4f6';

      if (day.isOfficialHoliday) {
        statusBadge = day.holidayTitle || 'تعطیل رسمی';
        statusColor = '#991b1b';
        statusBg = '#fee2e2';
      } else if (day.isWeeklyHoliday) {
        statusBadge = 'تعطیل هفتگی';
        statusColor = '#92400e';
        statusBg = '#fef3c7';
      }

      let intervalsText = '-';
      if (dayIntervals.length > 0) {
        intervalsText = dayIntervals
          .map((i) => `${toPersianDigits(i.startTime)} تا ${i.endTime ? toPersianDigits(i.endTime) : 'در حال ثبت'}`)
          .join('<br>');
      }

      let leavesText = '-';
      if (dayLeaves.length > 0) {
        leavesText = dayLeaves
          .map((l) => (l.type === 'full_day' ? 'مرخصی تمام‌روز' : `ساعتی ${toPersianDigits(l.startTime || '')} - ${toPersianDigits(l.endTime || '')}`))
          .join('<br>');
      }

      const rowBg = isHoliday ? '#fbfbfa' : rowIndex % 2 === 0 ? '#ffffff' : '#fafafa';

      tableRows += `
        <tr style="background-color: ${rowBg};">
          <td style="text-align: center; color: #6b7280; font-family: monospace;">${toPersianDigits(rowIndex)}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 600;">${toPersianDigits(dateStr)}</td>
          <td style="text-align: center;">${weekdayName}</td>
          <td style="text-align: center;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 8.5pt; font-weight: 600; color: ${statusColor}; background-color: ${statusBg}; border: 1px solid rgba(0,0,0,0.06);">
              ${statusBadge}
            </span>
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 8.5pt; line-height: 1.4;">${intervalsText}</td>
          <td style="text-align: right; font-size: 8.5pt; line-height: 1.4;">${leavesText}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 700;">
            ${day.workMinutes > 0 ? formatMinutesToPersianHM(day.workMinutes) : '-'}
          </td>
          <td style="text-align: center; font-family: monospace; font-weight: 700; color: ${hasOvertime ? '#047857' : '#9ca3af'};">
            ${hasOvertime ? formatMinutesToPersianHM(day.overtimeMinutes) : '-'}
          </td>
        </tr>
      `;

      rowIndex += 1;
    }

    return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>گزارش کارکرد ماهانه - ${monthName} ${toPersianDigits(monthStats.year)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 12mm 10mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Vazirmatn', Tahoma, 'Segoe UI', Arial, sans-serif;
      font-size: 9pt;
      line-height: 1.35;
      color: #111827;
      direction: rtl;
      text-align: right;
      background-color: #ffffff;
    }

    .report-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header styling */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 12px;
      border-bottom: 2px solid #111827;
    }

    .report-title-block h1 {
      margin: 0 0 2px 0;
      font-size: 15pt;
      font-weight: 800;
      color: #111827;
    }

    .report-title-block p {
      margin: 0;
      font-size: 9pt;
      color: #4b5563;
    }

    .report-meta-block {
      text-align: left;
      font-size: 8.5pt;
      color: #4b5563;
      line-height: 1.5;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 14px;
    }

    .kpi-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 6px 10px;
    }

    .kpi-label {
      font-size: 8pt;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 2px;
      display: block;
    }

    .kpi-value {
      font-size: 12pt;
      font-weight: 800;
      font-family: monospace;
      color: #111827;
      line-height: 1.2;
    }

    .kpi-sub {
      font-size: 7.5pt;
      color: #9ca3af;
      margin-top: 2px;
      display: block;
    }

    /* Table styling */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #d1d5db;
      font-size: 8.5pt;
      margin-bottom: 14px;
    }

    table.data-table thead {
      display: table-header-group;
    }

    table.data-table th {
      background-color: #f3f4f6;
      color: #111827;
      font-weight: 700;
      padding: 7px 6px;
      border: 1px solid #d1d5db;
      text-align: center;
      font-size: 8.5pt;
    }

    table.data-table td {
      padding: 5px 6px;
      border: 1px solid #e5e7eb;
      vertical-align: middle;
    }

    table.data-table tr {
      page-break-inside: avoid;
    }

    table.data-table tfoot {
      display: table-footer-group;
      font-weight: 700;
      background-color: #f3f4f6;
      border-top: 2px solid #111827;
    }

    table.data-table tfoot td {
      padding: 8px 6px;
      border: 1px solid #d1d5db;
    }

    /* Signatures Section */
    .signatures-section {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 14px;
      page-break-inside: avoid;
    }

    .sig-box {
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      min-height: 65px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sig-title {
      font-size: 8pt;
      font-weight: 600;
      color: #4b5563;
    }

    .sig-line {
      font-size: 7.5pt;
      color: #9ca3af;
      margin-top: 30px;
    }

    .report-footer-note {
      text-align: center;
      font-size: 7.5pt;
      color: #9ca3af;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #e5e7eb;
    }

    @media print {
      body {
        background: transparent;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div class="report-title-block">
        <h1>گزارش کارکرد و تردد ماهانه</h1>
        <p>ماه ${monthName} سال ${toPersianDigits(monthStats.year)}</p>
      </div>
      <div class="report-meta-block">
        <div><strong>تاریخ تهیه:</strong> ${toPersianDigits(todayStr)}</div>
        <div><strong>روزهای کاری موظفی:</strong> ${toPersianDigits(monthStats.workDaysCount)} روز</div>
      </div>
    </div>

    <!-- Summary KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">ساعات کاری</span>
        <div class="kpi-value">${formatMinutesToPersianHM(monthStats.totalWorkMinutes)}</div>
        <span class="kpi-sub">عادی: ${formatMinutesToPersianHM(monthStats.P_minutes)} | تعطیل: ${formatMinutesToPersianHM(monthStats.H_minutes)}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">ساعات اضافه کار</span>
        <div class="kpi-value" style="color: #047857;">${formatMinutesToPersianHM(totalOvertime)}</div>
        <span class="kpi-sub">عادی: ${formatMinutesToPersianHM(normalOvertime)} | تعطیل: ${formatMinutesToPersianHM(holidayOvertime)}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">ساعات موظفی کل ماه</span>
        <div class="kpi-value">${formatMinutesToPersianHM(monthStats.D_minutes)}</div>
        <span class="kpi-sub">موظفی تا امروز: ${formatMinutesToPersianHM(monthStats.elapsedQuotaMinutes)}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">کارکرد تا امروز (کاری + مرخصی)</span>
        <div class="kpi-value">${formatMinutesToPersianHM(totalWorkAndLeave)}</div>
        <span class="kpi-sub">ساعات مرخصی: ${formatMinutesToPersianHM(monthStats.L_minutes)}</span>
      </div>
    </div>

    <!-- Main Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 32px;">#</th>
          <th style="width: 75px;">تاریخ</th>
          <th style="width: 65px;">روز هفته</th>
          <th style="width: 105px;">وضعیت روز</th>
          <th style="width: 140px;">بازه‌های کاری</th>
          <th style="width: 105px;">مرخصی</th>
          <th style="width: 70px;">کارکرد</th>
          <th style="width: 70px;">اضافه کار</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="6" style="text-align: left; padding-left: 14px; font-weight: 700;">مجموع کل ماه:</td>
          <td style="text-align: center; font-family: monospace; font-weight: 800;">${formatMinutesToPersianHM(monthStats.totalWorkMinutes)}</td>
          <td style="text-align: center; font-family: monospace; font-weight: 800; color: #047857;">${formatMinutesToPersianHM(totalOvertime)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Signatures -->
    <div class="signatures-section">
      <div class="sig-box">
        <div class="sig-title">امضای شاغل / کارمند</div>
        <div class="sig-line">امضا و تاریخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">تایید امور اداری و منابع انسانی</div>
        <div class="sig-line">امضا و تاریخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">تایید مدیریت</div>
        <div class="sig-line">امضا و تاریخ</div>
      </div>
    </div>

    <!-- Footer Note -->
    <div class="report-footer-note">
      این گزارش به صورت خودکار توسط سامانه ثبت تردد و کارکرد تهیه شده و نسخه چاپی معتبر است.
    </div>
  </div>
</body>
</html>`;
  },

  /**
   * Triggers the native browser/system print dialog with the clean formatted report
   * Uses an invisible iframe to avoid printing the host web application UI.
   */
  printReport(
    monthStats: MonthCalculationResult,
    intervals: WorkInterval[],
    leaves: LeaveRecord[],
    settings?: UserSettings
  ): void {
    const htmlContent = this.generatePrintableHtml(monthStats, intervals, leaves, settings);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Allow browser layout and fonts to render before invoking print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      } finally {
        // Clean up iframe after printing dialog finishes
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  }
};
