import React, { useMemo } from 'react';
import { Download, FileText, Printer, X } from 'lucide-react';
import { LeaveRecord, MonthCalculationResult, UserSettings, WorkInterval } from '../types';
import { PdfReportService } from '../services/pdfReport';
import { PERSIAN_MONTH_NAMES, toPersianDigits } from '../utils/jalali';

interface PdfReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthStats: MonthCalculationResult;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  settings?: UserSettings;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  isOpen,
  onClose,
  monthStats,
  intervals,
  leaves,
  settings
}) => {
  const htmlContent = useMemo(() => {
    if (!isOpen) return '';
    return PdfReportService.generatePrintableHtml(monthStats, intervals, leaves, settings);
  }, [isOpen, monthStats, intervals, leaves, settings]);

  if (!isOpen) return null;

  const monthName = PERSIAN_MONTH_NAMES[monthStats.month - 1];

  const handlePrint = () => {
    PdfReportService.printReport(monthStats, intervals, leaves, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-white dark:bg-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-neutral-950 dark:text-neutral-50">
                پیش‌نمایش چاپ و گزارش PDF ماه {monthName} {toPersianDigits(monthStats.year)}
              </h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                قالب استاندارد فرم کارکرد ماهانه سازگار با برگه A4 و ذخیره در فرمت PDF
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-xs"
              title="باز کردن دیالوگ چاپ یا ذخیره به عنوان فایل PDF"
            >
              <Printer className="w-4 h-4" />
              <span>چاپ / ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Preview Container (Simulating A4 Paper Sheet) */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center bg-neutral-200/80 dark:bg-neutral-950/70">
          <div className="bg-white text-neutral-900 w-full max-w-3xl rounded-xl shadow-lg border border-neutral-300 overflow-hidden flex flex-col">
            <iframe
              srcDoc={htmlContent}
              title="پیش‌نمایش گزارش ماهانه"
              className="w-full flex-1 border-0 min-h-[680px] bg-white"
            />
          </div>
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900">
          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>آماده چاپ روی کاغذ A4 (عمودی) یا انتخاب گزینه "Save as PDF"</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-xs transition-all"
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
