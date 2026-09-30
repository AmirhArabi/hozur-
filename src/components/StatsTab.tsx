import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FileSpreadsheet,
  Flag,
  Hourglass,
  Layers,
  PlusCircle,
  RotateCcw
} from 'lucide-react';
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
  getCurrentJalaliDate,
  getJalaliDayOfWeek,
  getJalaliMonthDays,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  PERSIAN_WEEKDAYS_SHORT,
  toPersianDigits
} from '../utils/jalali';
import { DayDetailsModal } from './DayDetailsModal';
import { ExportService } from '../services/export';

interface StatsTabProps {
  statsYear: number;
  statsMonth: number;
  onChangeStatsMonth: (year: number, month: number) => void;
  monthStats: MonthCalculationResult;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  holidays: OfficialHoliday[];
  settings: UserSettings;
  onGoToRecordDate: (dateStr: string) => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({
  statsYear,
  statsMonth,
  onChangeStatsMonth,
  monthStats,
  intervals,
  leaves,
  holidays,
  settings,
  onGoToRecordDate
}) => {
  const [selectedDayResult, setSelectedDayResult] = useState<DayCalculationResult | null>(null);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [selectedWeekdayIndex, setSelectedWeekdayIndex] = useState<number | null>(null);

  const today = getCurrentJalaliDate();
  const todayStr = formatJalaliDate(today.year, today.month, today.day);

  const isCurrentMonth = today.year === statsYear && today.month === statsMonth;

  // Group work minutes by day of week (Saturday=0 to Friday=6)
  const todayDayOfWeek = getJalaliDayOfWeek(today.year, today.month, today.day);

  const weekdayStats = useMemo(() => {
    const days = [
      { name: 'شنبه', short: 'شنبه', index: 0, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'یک‌شنبه', short: '۱‌شنبه', index: 1, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'دوشنبه', short: '۲‌شنبه', index: 2, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'سه‌شنبه', short: '۳‌شنبه', index: 3, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'چهارشنبه', short: '۴‌شنبه', index: 4, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'پنج‌شنبه', short: '۵‌شنبه', index: 5, totalMinutes: 0, daysCount: 0, workDaysCount: 0 },
      { name: 'جمعه', short: 'جمعه', index: 6, totalMinutes: 0, daysCount: 0, workDaysCount: 0 }
    ];

    Object.values(monthStats.dailyBreakdown).forEach((dayData) => {
      const idx = dayData.dayOfWeekIndex;
      if (idx >= 0 && idx < 7) {
        days[idx].daysCount += 1;
        days[idx].totalMinutes += dayData.workMinutes;
        if (dayData.workMinutes > 0) {
          days[idx].workDaysCount += 1;
        }
      }
    });

    const maxMinutes = Math.max(...days.map((d) => d.totalMinutes), 1);
    const totalMinutesAll = days.reduce((sum, d) => sum + d.totalMinutes, 0);

    let peakDay = days[0];
    for (const d of days) {
      if (d.totalMinutes > peakDay.totalMinutes) {
        peakDay = d;
      }
    }

    return { days, maxMinutes, totalMinutesAll, peakDay };
  }, [monthStats.dailyBreakdown]);

  const handlePrevMonth = () => {
    if (statsMonth === 1) {
      onChangeStatsMonth(statsYear - 1, 12);
    } else {
      onChangeStatsMonth(statsYear, statsMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (statsMonth === 12) {
      onChangeStatsMonth(statsYear + 1, 1);
    } else {
      onChangeStatsMonth(statsYear, statsMonth + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    onChangeStatsMonth(today.year, today.month);
  };

  const handleExportMonthCSV = async () => {
    setIsExportingCSV(true);
    await ExportService.exportMonthCSV(monthStats, intervals, leaves);
    setIsExportingCSV(false);
  };

  const daysInMonth = getJalaliMonthDays(statsYear, statsMonth);
  const firstDayOfWeek = getJalaliDayOfWeek(statsYear, statsMonth, 1); // 0=Sat, 6=Fri

  // Extract all holidays (official & weekly) for the current month
  const monthHolidays = useMemo(() => {
    const list: Array<{
      date: string;
      dayNum: number;
      weekdayName: string;
      isOfficial: boolean;
      title: string;
      dayData?: DayCalculationResult;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatJalaliDate(statsYear, statsMonth, d);
      const dayOfWeek = getJalaliDayOfWeek(statsYear, statsMonth, d);
      const dayData = monthStats.dailyBreakdown[dateStr];

      if (dayData?.isOfficialHoliday) {
        list.push({
          date: dateStr,
          dayNum: d,
          weekdayName: PERSIAN_WEEKDAYS[dayOfWeek],
          isOfficial: true,
          title: dayData.holidayTitle || 'تعطیل رسمی',
          dayData
        });
      } else if (dayData?.isWeeklyHoliday) {
        list.push({
          date: dateStr,
          dayNum: d,
          weekdayName: PERSIAN_WEEKDAYS[dayOfWeek],
          isOfficial: false,
          title: dayOfWeek === 6 ? 'تعطیل هفتگی (جمعه)' : 'تعطیل هفتگی (پنج‌شنبه)',
          dayData
        });
      }
    }

    return list;
  }, [statsYear, statsMonth, daysInMonth, monthStats]);

  const officialHolidaysCount = monthHolidays.filter((h) => h.isOfficial).length;
  const weeklyHolidaysCount = monthHolidays.filter((h) => !h.isOfficial).length;

  const formatHMPersian = (totalMinutes: number) => {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    return `${toPersianDigits(h)}:${toPersianDigits(String(m).padStart(2, '0'))}`;
  };

  // Ensure calculated overtime is cleanly extracted from monthStats
  const calculatedTotalOvertime = monthStats?.totalOvertime ?? monthStats?.totalOvertimeMinutes ?? 0;
  const calculatedNormalOvertime = monthStats?.normalOvertimeMinutes ?? 0;
  const calculatedHolidayOvertime = monthStats?.H_minutes ?? 0;

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Month Navigator Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <button
            onClick={handleNextMonth}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title="ماه بعد"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h2 className="font-bold text-lg text-neutral-950 dark:text-neutral-50 tracking-tight">
              {PERSIAN_MONTH_NAMES[statsMonth - 1]} {toPersianDigits(statsYear)}
            </h2>
            <div className="text-[11px] text-neutral-400 font-medium">
              {toPersianDigits(monthStats.workDaysCount)} روز کاری موظفی
            </div>
          </div>

          <button
            onClick={handlePrevMonth}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title="ماه قبل"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {!isCurrentMonth && (
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-center">
            <button
              onClick={handleResetToCurrentMonth}
              className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              بازگشت به ماه جاری ({PERSIAN_MONTH_NAMES[today.month - 1]})
            </button>
          </div>
        )}
      </div>

      {/* 7 Metric Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
            خلاصه آمار ماه
          </span>
          <button
            onClick={handleExportMonthCSV}
            disabled={isExportingCSV}
            className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            خروجی اکسل (CSV)
          </button>
        </div>

        {/* Top 2 Primary Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Work Hours (P + H) */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                مجموع ساعات کاری
              </span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-mono font-bold text-2xl text-neutral-950 dark:text-neutral-50 tabular-nums">
              {formatHMPersian(monthStats.totalWorkMinutes)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              عادی: {formatHMPersian(monthStats.P_minutes)} | تعطیل:{' '}
              {formatHMPersian(monthStats.H_minutes)}
            </div>
          </div>

          {/* Card 2: Overtime Total */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                مجموع اضافه‌کار
              </span>
              <PlusCircle className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="font-mono font-bold text-2xl text-neutral-950 dark:text-neutral-50 tabular-nums">
              {formatHMPersian(calculatedTotalOvertime)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              عادی: {formatHMPersian(calculatedNormalOvertime)} | تعطیل:{' '}
              {formatHMPersian(calculatedHolidayOvertime)}
            </div>
          </div>
        </div>

        {/* 6 Secondary Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 3: Days with Work */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
              روزهای دارای ساعت کاری
            </span>
            <div className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
              {toPersianDigits(monthStats.daysWithWorkCount)} روز
            </div>
            <div className="text-[10px] text-neutral-400">
              از {toPersianDigits(daysInMonth)} روز کل ماه
            </div>
          </div>

          {/* Card 4: Total Required Hours (D) for full month */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
              مجموع موظفی کل ماه
            </span>
            <div className="font-mono font-bold text-lg text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatHMPersian(monthStats.D_minutes)}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {toPersianDigits(monthStats.workDaysCount)} روز کاری کل ماه
            </div>
          </div>

          {/* Card 5: Elapsed Workdays Required Hours (درخواست جدید کاربر) */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 shadow-xs relative">
            <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 block mb-1">
              موظفی روزهای سپری‌شده
            </span>
            <div className="font-mono font-bold text-lg text-neutral-950 dark:text-neutral-50 tabular-nums">
              {formatHMPersian(monthStats.elapsedQuotaMinutes)}
            </div>
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
              {toPersianDigits(monthStats.elapsedWorkDaysCount)} روز کاری {isCurrentMonth ? 'تا امروز' : 'ماه'}
            </div>
          </div>

          {/* Card 6: Remaining to Quota */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
              ساعات مانده تا موظفی
            </span>
            <div className="font-mono font-bold text-lg text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatHMPersian(monthStats.remainingMinutes)}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {monthStats.remainingMinutes === 0 ? 'موظفی تکمیل شده' : 'مانده از کل موظفی'}
            </div>
          </div>

          {/* Card 7: Total Leave Hours (L) */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
              مجموع ساعات مرخصی
            </span>
            <div className="font-mono font-bold text-lg text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatHMPersian(monthStats.L_minutes)}
            </div>
            <div className="text-[10px] text-neutral-400">
              استحقاقی / ساعتی
            </div>
          </div>

          {/* Card 8: Days with Leave */}
          <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <span className="text-[11px] font-semibold text-neutral-500 block mb-1">
              روزهای دارای مرخصی
            </span>
            <div className="font-bold text-lg text-neutral-900 dark:text-neutral-100">
              {toPersianDigits(monthStats.daysWithLeaveCount)} روز
            </div>
            <div className="text-[10px] text-neutral-400">
              ثبت‌شده در این ماه
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Work Hours Bar Chart (نمودار میله‌ای مجموع ساعات کاری در روزهای هفته) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
                ساعات کاری در روزهای هفته
              </h3>
              <span className="text-[11px] text-neutral-400">
                مجموع کارکرد شنبه تا جمعه در این ماه
              </span>
            </div>
          </div>

          {weekdayStats.peakDay.totalMinutes > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">
                بیشترین فعالیت
              </span>
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                {weekdayStats.peakDay.name} ({formatHMPersian(weekdayStats.peakDay.totalMinutes)})
              </span>
            </div>
          )}
        </div>

        {/* The 7 Bar Columns */}
        <div className="pt-2">
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 items-end h-44 px-1 pb-1">
            {weekdayStats.days.map((day) => {
              const heightPct = Math.round((day.totalMinutes / weekdayStats.maxMinutes) * 100);
              const isSelected = selectedWeekdayIndex === day.index;
              const isPeak = day.index === weekdayStats.peakDay.index && day.totalMinutes > 0;
              const hasWork = day.totalMinutes > 0;

              return (
                <div
                  key={day.index}
                  onClick={() => setSelectedWeekdayIndex(isSelected ? null : day.index)}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  title={`${day.name}: ${formatHMPersian(day.totalMinutes)}`}
                >
                  {/* Hours badge above the bar */}
                  <span className={`text-[9px] sm:text-[10px] font-mono font-bold mb-1.5 transition-all tabular-nums text-center truncate w-full ${
                    isSelected
                      ? 'text-neutral-950 dark:text-white scale-105'
                      : hasWork
                      ? 'text-neutral-700 dark:text-neutral-300'
                      : 'text-neutral-300 dark:text-neutral-600'
                  }`}>
                    {day.totalMinutes > 0 ? formatHMPersian(day.totalMinutes) : '۰'}
                  </span>

                  {/* Bar track and fill container */}
                  <div className={`w-full max-w-[36px] sm:max-w-[42px] h-32 bg-neutral-100 dark:bg-neutral-800/70 rounded-2xl p-1 flex flex-col justify-end transition-all relative overflow-hidden ${
                    isCurrentMonth && day.index === todayDayOfWeek ? 'ring-2 ring-neutral-400 dark:ring-neutral-600' : ''
                  }`}>
                    <div
                      style={{ height: hasWork ? `${Math.max(14, heightPct)}%` : '4px' }}
                      className={`w-full rounded-xl transition-all duration-500 ease-out ${
                        isSelected
                          ? 'bg-neutral-950 dark:bg-white shadow-sm'
                          : isPeak
                          ? 'bg-neutral-900 dark:bg-neutral-100 shadow-2xs'
                          : hasWork
                          ? 'bg-neutral-700 hover:bg-neutral-900 dark:bg-neutral-300 dark:hover:bg-white'
                          : 'bg-neutral-300 dark:bg-neutral-700'
                      }`}
                    />
                  </div>

                  {/* Day Label below the bar */}
                  <div className="flex flex-col items-center mt-2">
                    <span className={`text-[10px] sm:text-xs transition-all font-semibold ${
                      isSelected
                        ? 'text-neutral-950 dark:text-white font-bold'
                        : isCurrentMonth && day.index === todayDayOfWeek
                        ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                        : day.index === 6
                        ? 'text-neutral-500 dark:text-neutral-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {day.short}
                    </span>
                    {isCurrentMonth && day.index === todayDayOfWeek && (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white mt-0.5" title="امروز" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Interactive Insight Banner */}
        {selectedWeekdayIndex !== null && (
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between text-xs animate-in fade-in duration-150">
            <div>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {weekdayStats.days[selectedWeekdayIndex].name}:
              </span>{' '}
              <span className="text-neutral-600 dark:text-neutral-300">
                مجموع {formatHMPersian(weekdayStats.days[selectedWeekdayIndex].totalMinutes)} ساعت در{' '}
                {toPersianDigits(weekdayStats.days[selectedWeekdayIndex].workDaysCount)} روز کاری
              </span>
            </div>
            {weekdayStats.days[selectedWeekdayIndex].workDaysCount > 0 && (
              <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                میانگین:{' '}
                {formatHMPersian(
                  Math.round(
                    weekdayStats.days[selectedWeekdayIndex].totalMinutes /
                      weekdayStats.days[selectedWeekdayIndex].workDaysCount
                  )
                )}{' '}
                / روز
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shamsi Monthly Calendar */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-neutral-500" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              تقویم ماهانه شمسی
            </h3>
          </div>
          <span className="text-[10px] text-neutral-400">
            لمس هر روز برای مشاهده جزئیات
          </span>
        </div>

        {/* Weekday Labels (Saturday to Friday) */}
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-neutral-400 dark:text-neutral-500 py-2.5">
          {PERSIAN_WEEKDAYS_SHORT.map((name, idx) => (
            <div key={idx} className={idx === 6 ? 'font-bold text-neutral-700 dark:text-neutral-300' : ''}>
              {name}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Preceding Empty Slots */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-pre-${i}`} className="h-12" />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = formatJalaliDate(statsYear, statsMonth, dayNum);
            const isToday = dateStr === todayStr;
            const dayData = monthStats.dailyBreakdown[dateStr];

            const hasWork = dayData && dayData.workMinutes > 0;
            const hasLeave = dayData && dayData.leaveMinutes > 0;
            const hasOvertime = dayData && dayData.overtimeMinutes > 0;
            const isHoliday = dayData && (dayData.isWeeklyHoliday || dayData.isOfficialHoliday);

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDayResult(dayData || null)}
                className={`h-12 rounded-xl text-xs font-medium flex flex-col items-center justify-between py-1 px-0.5 transition-all active:scale-95 relative ${
                  isToday
                    ? 'border-2 border-neutral-900 dark:border-white shadow-xs'
                    : isHoliday
                    ? 'bg-neutral-100/80 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400'
                    : 'bg-neutral-50 dark:bg-neutral-850 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                }`}
              >
                {/* Day Number */}
                <span className={`text-xs ${isToday ? 'font-bold text-neutral-950 dark:text-white' : ''}`}>
                  {toPersianDigits(dayNum)}
                </span>

                {/* Monochromatic Status Indicators */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {/* Work indicator: solid square/circle */}
                  {hasWork && (
                    <span
                      title="دارای کارکرد"
                      className="w-1.5 h-1.5 rounded-full bg-neutral-950 dark:bg-white"
                    />
                  )}
                  {/* Leave indicator: hollow ring */}
                  {hasLeave && (
                    <span
                      title="دارای مرخصی"
                      className="w-1.5 h-1.5 rounded-full border border-neutral-950 dark:border-white"
                    />
                  )}
                  {/* Overtime indicator: small dash or bar */}
                  {hasOvertime && (
                    <span
                      title="دارای اضافه‌کار"
                      className="w-2 h-1 rounded-xs bg-neutral-500 dark:bg-neutral-400"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-3 gap-2 text-[10px] text-neutral-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-neutral-950 dark:bg-white" />
            <span>دارای کارکرد</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full border border-neutral-950 dark:border-white" />
            <span>دارای مرخصی</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-1 rounded-xs bg-neutral-500 dark:bg-neutral-400" />
            <span>اضافه‌کار</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm border border-neutral-900 dark:border-white" />
            <span>امروز</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-neutral-200 dark:bg-neutral-800" />
            <span>روز تعطیل</span>
          </div>
        </div>
      </div>

      {/* Month Holidays List Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              تعطیلی‌های ماه {PERSIAN_MONTH_NAMES[statsMonth - 1]} {toPersianDigits(statsYear)}
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-medium">
            {toPersianDigits(monthHolidays.length)} روز تعطیل
          </span>
        </div>

        {monthHolidays.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            در این ماه هیچ روز تعطیلی ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
            {monthHolidays.map((holiday, idx) => (
              <div
                key={`${holiday.date}-${idx}`}
                onClick={() => holiday.dayData && setSelectedDayResult(holiday.dayData)}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold font-mono text-neutral-900 dark:text-neutral-100">
                      {toPersianDigits(holiday.dayNum)}
                    </span>
                    <span className="text-[9px] text-neutral-500 font-medium leading-none">
                      {PERSIAN_MONTH_NAMES[statsMonth - 1]}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                      {holiday.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                      <span>{holiday.weekdayName}</span>
                      <span>·</span>
                      <span className="font-mono">{toPersianDigits(holiday.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      holiday.isOfficial
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    {holiday.isOfficial ? 'تعطیل رسمی' : 'تعطیل هفتگی'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
          <span>تعطیلات رسمی: {toPersianDigits(officialHolidaysCount)} روز</span>
          <span>تعطیلات هفتگی: {toPersianDigits(weeklyHolidaysCount)} روز</span>
        </div>
      </div>

      {/* Day Details Modal */}
      <DayDetailsModal
        isOpen={Boolean(selectedDayResult)}
        onClose={() => setSelectedDayResult(null)}
        dayResult={selectedDayResult}
        intervals={intervals}
        leaves={leaves}
        onGoToRecordDate={onGoToRecordDate}
      />
    </div>
  );
};
