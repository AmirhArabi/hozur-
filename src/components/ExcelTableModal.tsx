import React from 'react';
import { Download, FileSpreadsheet, X } from 'lucide-react';
import { LeaveRecord, MonthCalculationResult, WorkInterval } from '../types';
import {
  formatMinutesToPersianHM,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  toPersianDigits
} from '../utils/jalali';
import { ExportService } from '../services/export';

interface ExcelTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthStats: MonthCalculationResult;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
}

export const ExcelTableModal: React.FC<ExcelTableModalProps> = ({
  isOpen,
  onClose,
  monthStats,
  intervals,
  leaves
}) => {
  const [isExporting, setIsExporting] = React.useState(false);

  if (!isOpen) return null;

  const monthName = PERSIAN_MONTH_NAMES[monthStats.month - 1];
  const sortedDates = Object.keys(monthStats.dailyBreakdown).sort();

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
  const totalWorkAndLeave = (monthStats.totalWorkMinutes || 0) + (monthStats.L_minutes || 0);

  const handleDownloadXLS = async () => {
    setIsExporting(true);
    await ExportService.exportMonthXLS(monthStats, intervals, leaves);
    setIsExporting(false);
  };

  const handleDownloadCSV = async () => {
    setIsExporting(true);
    await ExportService.exportMonthCSV(monthStats, intervals, leaves);
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-neutral-950 dark:text-neutral-50">
                جدول گزارش اکسل ماه {monthName} {toPersianDigits(monthStats.year)}
              </h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                نمایش داده‌های کارکرد روزانه با عناوین و سربرگ‌های تفکیک‌شده
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadXLS}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50"
              title="خروجی فایل اکسل با ظاهر و استایل‌های کامل جدول"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'در حال خروجی...' : 'دانلود اکسل (استایل‌دار)'}</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={isExporting}
              className="hidden sm:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-700 dark:text-neutral-200 font-semibold text-xs transition-all border border-neutral-200 dark:border-neutral-700 disabled:opacity-50"
              title="دانلود فایل سبک متنی CSV"
            >
              <span>CSV</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-neutral-100/60 dark:bg-neutral-800/20 border-b border-neutral-200 dark:border-neutral-800 text-xs">
          <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">ساعات کاری</span>
            <span className="font-bold text-sm font-mono text-neutral-950 dark:text-neutral-50">
              {formatMinutesToPersianHM(monthStats.totalWorkMinutes)}
            </span>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">ساعات موظفی کل ماه</span>
            <span className="font-bold text-sm font-mono text-neutral-950 dark:text-neutral-50">
              {formatMinutesToPersianHM(monthStats.D_minutes)}
            </span>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">ساعات اضافه کار</span>
            <span className="font-bold text-sm font-mono text-neutral-950 dark:text-neutral-50">
              {formatMinutesToPersianHM(totalOvertime)}
            </span>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="text-[10px] text-neutral-500 block">کارکرد تا امروز (کاری + مرخصی)</span>
            <span className="font-bold text-sm font-mono text-neutral-950 dark:text-neutral-50">
              {formatMinutesToPersianHM(totalWorkAndLeave)}
            </span>
          </div>
        </div>

        {/* Scrollable Table Container */}
        <div className="flex-1 overflow-auto p-2 sm:p-4">
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs border-collapse">
              <thead className="bg-neutral-100 dark:bg-neutral-800/90 text-neutral-800 dark:text-neutral-200 font-bold sticky top-0 z-10 select-none">
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-2.5 px-3 w-10 text-center">ردیف</th>
                  <th className="py-2.5 px-3 min-w-[90px]">تاریخ</th>
                  <th className="py-2.5 px-3 min-w-[70px]">روز هفته</th>
                  <th className="py-2.5 px-3 min-w-[100px]">وضعیت روز</th>
                  <th className="py-2.5 px-3 min-w-[140px]">بازه‌های کاری</th>
                  <th className="py-2.5 px-3 min-w-[110px]">مرخصی</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center font-mono">ساعت کارکرد</th>
                  <th className="py-2.5 px-3 min-w-[80px] text-center font-mono">ساعت اضافه کار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {sortedDates.map((dateStr, idx) => {
                  const day = monthStats.dailyBreakdown[dateStr];
                  const weekdayName = PERSIAN_WEEKDAYS[day.dayOfWeekIndex];
                  const dayIntervals = intervalsByDate.get(dateStr) || [];
                  const dayLeaves = leavesByDate.get(dateStr) || [];

                  const isHoliday = day.isOfficialHoliday || day.isWeeklyHoliday;
                  const hasOvertime = day.overtimeMinutes > 0;

                  return (
                    <tr
                      key={dateStr}
                      className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${
                        isHoliday
                          ? 'bg-neutral-50/60 dark:bg-neutral-800/30 text-neutral-600 dark:text-neutral-400'
                          : ''
                      }`}
                    >
                      {/* ردیف */}
                      <td className="py-2 px-3 text-center text-neutral-400 font-mono">
                        {toPersianDigits(idx + 1)}
                      </td>

                      {/* تاریخ */}
                      <td className="py-2 px-3 font-mono font-medium text-neutral-900 dark:text-neutral-100">
                        {toPersianDigits(dateStr)}
                      </td>

                      {/* روز هفته */}
                      <td className="py-2 px-3 font-medium">
                        {weekdayName}
                      </td>

                      {/* وضعیت روز */}
                      <td className="py-2 px-3">
                        {day.isOfficialHoliday ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            {day.holidayTitle || 'تعطیل رسمی'}
                          </span>
                        ) : day.isWeeklyHoliday ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            تعطیل هفتگی
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            روز کاری عادی
                          </span>
                        )}
                      </td>

                      {/* بازه‌های کاری */}
                      <td className="py-2 px-3 font-mono text-[11px]">
                        {dayIntervals.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {dayIntervals.map((i) => (
                              <span key={i.id} className="text-neutral-700 dark:text-neutral-300">
                                {toPersianDigits(i.startTime)} تا{' '}
                                {i.endTime ? toPersianDigits(i.endTime) : 'در حال ثبت...'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">-</span>
                        )}
                      </td>

                      {/* مرخصی */}
                      <td className="py-2 px-3 text-[11px]">
                        {dayLeaves.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {dayLeaves.map((l) => (
                              <span key={l.id} className="text-neutral-600 dark:text-neutral-400">
                                {l.type === 'full_day'
                                  ? 'تمام‌روز'
                                  : `ساعتی ${toPersianDigits(l.startTime || '')} - ${toPersianDigits(l.endTime || '')}`}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">-</span>
                        )}
                      </td>

                      {/* ساعت کارکرد */}
                      <td className="py-2 px-3 text-center font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {day.workMinutes > 0 ? formatMinutesToPersianHM(day.workMinutes) : '-'}
                      </td>

                      {/* ساعت اضافه کار */}
                      <td className="py-2 px-3 text-center font-mono font-bold">
                        {hasOvertime ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatMinutesToPersianHM(day.overtimeMinutes)}
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t-2 border-neutral-200 dark:border-neutral-700">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-left pl-4 font-semibold text-neutral-700 dark:text-neutral-200">
                    مجموع کل ماه:
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-neutral-950 dark:text-neutral-50 text-sm">
                    {formatMinutesToPersianHM(monthStats.totalWorkMinutes)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    {formatMinutesToPersianHM(totalOvertime)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/40">
          <span className="text-xs text-neutral-500">
            تعداد کل روزها: {toPersianDigits(sortedDates.length)} روز
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadXLS}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود اکسل (استایل‌دار)</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition-all border border-neutral-300 dark:border-neutral-700 disabled:opacity-50"
            >
              <span>دانلود CSV</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition-all"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
