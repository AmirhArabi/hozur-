import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Edit2,
  Hourglass,
  Layers,
  LogIn,
  LogOut,
  Plus,
  Trash2
} from 'lucide-react';
import { LeaveRecord, MonthCalculationResult, UserSettings, WorkInterval } from '../types';
import {
  calculateIntervalMinutes,
  validateInterval
} from '../utils/calculator';
import {
  formatJalaliDate,
  getCurrentJalaliDate,
  getCurrentTimeString,
  getJalaliDayOfWeek,
  minutesToTimeString,
  parseJalaliDate,
  PERSIAN_WEEKDAYS,
  timeStringToMinutes,
  toGregorian,
  toJalali,
  toPersianDigits
} from '../utils/jalali';
import { IntervalModal } from './IntervalModal';
import { JalaliDatePickerModal } from './JalaliDatePickerModal';
import { DeficitPromptModal } from './DeficitPromptModal';

interface RecordTabProps {
  selectedDate: string; // YYYY/MM/DD
  onSelectDate: (dateStr: string) => void;
  intervals: WorkInterval[];
  leaves: LeaveRecord[];
  settings: UserSettings;
  monthStats: MonthCalculationResult;
  nowMinutes: number; // live updating minutes
  currentTimeString: string;
  onSaveInterval: (interval: Omit<WorkInterval, 'id' | 'createdAt'>, id?: string) => void;
  onDeleteInterval: (id: string) => void;
  onSaveLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>, id?: string) => void;
  onDeleteLeave: (id: string) => void;
}

export const RecordTab: React.FC<RecordTabProps> = ({
  selectedDate,
  onSelectDate,
  intervals,
  leaves,
  settings,
  monthStats,
  nowMinutes,
  currentTimeString,
  onSaveInterval,
  onDeleteInterval,
  onSaveLeave,
  onDeleteLeave
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultIsPrimary, setModalDefaultIsPrimary] = useState(false);
  const [editingInterval, setEditingInterval] = useState<WorkInterval | null>(null);
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Live second-by-second ticker for real-time status and stopwatch
  const [nowSeconds, setNowSeconds] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowSeconds(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Deficit Prompt Modal State
  const [deficitModalData, setDeficitModalData] = useState<{
    interval: WorkInterval;
    endTimeString: string;
    workMinutesToday: number;
    dailyQuotaMinutes: number;
    deficitMinutes: number;
  } | null>(null);

  const today = getCurrentJalaliDate();
  const todayStr = formatJalaliDate(today.year, today.month, today.day);
  const isToday = selectedDate === todayStr;

  const parsedSelected = parseJalaliDate(selectedDate);
  const selectedDayOfWeek = getJalaliDayOfWeek(
    parsedSelected.year,
    parsedSelected.month,
    parsedSelected.day
  );
  const weekdayName = PERSIAN_WEEKDAYS[selectedDayOfWeek];

  const dailyQuotaMinutes = settings.dailyQuotaHours * 60 + settings.dailyQuotaMinutes;

  // Intervals and leaves for the currently selected date
  const dayIntervals = useMemo(
    () => intervals.filter((i) => i.date === selectedDate),
    [intervals, selectedDate]
  );
  const dayLeaves = useMemo(
    () => leaves.filter((l) => l.date === selectedDate),
    [leaves, selectedDate]
  );

  // Identify Primary (Default) interval vs Extra intervals
  const primaryInterval = useMemo(() => {
    // 1. Look for explicit isPrimary flag
    const explicit = dayIntervals.find((i) => i.isPrimary === true);
    if (explicit) return explicit;
    // 2. If any open interval exists, prioritize it as primary
    const open = dayIntervals.find((i) => i.endTime === null);
    if (open) return open;
    // 3. Otherwise, the earliest interval logged on this date
    return dayIntervals.length > 0 ? dayIntervals[0] : null;
  }, [dayIntervals]);

  const extraIntervals = useMemo(() => {
    if (!primaryInterval) return [];
    return dayIntervals.filter((i) => i.id !== primaryInterval.id);
  }, [dayIntervals, primaryInterval]);

  // Check if any interval is open
  const openInterval = dayIntervals.find((i) => i.endTime === null);

  // Calculate work minutes for today / selected date
  let totalDayWorkMinutes = 0;
  for (const interval of dayIntervals) {
    if (interval.endTime === null) {
      if (isToday) {
        totalDayWorkMinutes += calculateIntervalMinutes(interval.startTime, null, nowMinutes);
      }
    } else {
      totalDayWorkMinutes += calculateIntervalMinutes(interval.startTime, interval.endTime);
    }
  }

  // Calculate day leave minutes
  let totalDayLeaveMinutes = 0;
  for (const l of dayLeaves) {
    if (l.type === 'full_day') {
      totalDayLeaveMinutes += dailyQuotaMinutes;
    } else {
      totalDayLeaveMinutes += l.durationMinutes;
    }
  }

  // Day calculation status from month stats
  const dayCalculations = monthStats.dailyBreakdown[selectedDate];
  const isWorkDay = dayCalculations ? dayCalculations.isWorkDay : true;

  // Remaining to daily quota (rounded to integer minutes to avoid floating-point seconds):
  const targetDailyQuota = isWorkDay ? dailyQuotaMinutes : 0;
  const remainingTodayMinutes = Math.max(
    0,
    Math.round(targetDailyQuota - totalDayWorkMinutes - totalDayLeaveMinutes)
  );

  // Overtime today calculation (live and accurate for selected date, integer minutes)
  const overtimeTodayMinutes = Math.max(
    0,
    Math.round(!isWorkDay ? totalDayWorkMinutes : totalDayWorkMinutes - targetDailyQuota)
  );

  // Entry reminder banner check
  const reminderMinutes = settings.entryReminderTime
    ? timeStringToMinutes(settings.entryReminderTime)
    : 9 * 60;
  const showEntryReminderAlert =
    isToday &&
    settings.entryReminderEnabled &&
    dayIntervals.length === 0 &&
    isWorkDay &&
    nowMinutes >= reminderMinutes;

  // Show transient feedback
  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Primary Clock-in handler
  const handlePrimaryClockIn = () => {
    const startStr = currentTimeString;
    const validation = validateInterval(
      startStr,
      null,
      dayIntervals.map((i) => ({ id: i.id, startTime: i.startTime, endTime: i.endTime }))
    );

    if (!validation.isValid) {
      setEditingInterval(null);
      setEditingLeave(null);
      setModalDefaultIsPrimary(true);
      setIsModalOpen(true);
      return;
    }

    onSaveInterval({
      date: selectedDate,
      startTime: startStr,
      endTime: null,
      isPrimary: true
    });
    showFeedback(`شروع کار در ساعت ${toPersianDigits(startStr)} ثبت شد.`);
  };

  // Clock-out handler with Under-Hours Deficit (> 15 min) check
  const handleClockOut = (targetInterval: WorkInterval) => {
    const endStr = currentTimeString;
    const validation = validateInterval(
      targetInterval.startTime,
      endStr,
      dayIntervals.map((i) => ({ id: i.id, startTime: i.startTime, endTime: i.endTime })),
      targetInterval.id
    );

    if (!validation.isValid) {
      setEditingInterval(targetInterval);
      setEditingLeave(null);
      setIsModalOpen(true);
      return;
    }

    // Calculate projected total work minutes today including this closed interval
    const durationOfThis = calculateIntervalMinutes(targetInterval.startTime, endStr);
    let otherWorkToday = 0;
    for (const i of dayIntervals) {
      if (i.id !== targetInterval.id && i.endTime !== null) {
        otherWorkToday += calculateIntervalMinutes(i.startTime, i.endTime);
      }
    }
    const projectedTotalWorkToday = otherWorkToday + durationOfThis;

    // Check deficit if it's a normal work day
    if (isWorkDay) {
      const deficit = targetDailyQuota - (projectedTotalWorkToday + totalDayLeaveMinutes);
      if (deficit > 15) {
        // Prompt user with under-hours alert and suggested leave
        setDeficitModalData({
          interval: targetInterval,
          endTimeString: endStr,
          workMinutesToday: projectedTotalWorkToday,
          dailyQuotaMinutes: targetDailyQuota,
          deficitMinutes: deficit
        });
        return;
      }
    }

    // Direct save if deficit <= 15 or on holiday
    onSaveInterval(
      {
        date: targetInterval.date,
        startTime: targetInterval.startTime,
        endTime: endStr,
        note: targetInterval.note,
        isPrimary: targetInterval.isPrimary ?? true
      },
      targetInterval.id
    );
    showFeedback(`پایان کار در ساعت ${toPersianDigits(endStr)} ثبت شد.`);
  };

  // Confirm Clock-out with Leave
  const handleConfirmWithLeave = (
    leaveStart: string,
    leaveEnd: string,
    durationMinutes: number
  ) => {
    if (!deficitModalData) return;
    const { interval, endTimeString } = deficitModalData;

    // 1. Close interval
    onSaveInterval(
      {
        date: interval.date,
        startTime: interval.startTime,
        endTime: endTimeString,
        note: interval.note,
        isPrimary: interval.isPrimary ?? true
      },
      interval.id
    );

    // 2. Save hourly leave
    onSaveLeave({
      date: interval.date,
      type: 'hourly',
      startTime: leaveStart,
      endTime: leaveEnd,
      durationMinutes,
      note: 'جبران کسری ساعت کارکرد موظفی'
    });

    setDeficitModalData(null);
    showFeedback('پایان کار و مرخصی ساعتی جبرانی با موفقیت ثبت شد.');
  };

  // Confirm Clock-out without Leave
  const handleConfirmWithoutLeave = () => {
    if (!deficitModalData) return;
    const { interval, endTimeString } = deficitModalData;

    onSaveInterval(
      {
        date: interval.date,
        startTime: interval.startTime,
        endTime: endTimeString,
        note: interval.note,
        isPrimary: interval.isPrimary ?? true
      },
      interval.id
    );

    setDeficitModalData(null);
    showFeedback(`پایان کار در ساعت ${toPersianDigits(endTimeString)} ثبت شد.`);
  };

  // Step 1 day backward or forward
  const handleStepDay = (step: number) => {
    const curP = parseJalaliDate(selectedDate);
    const g = toGregorian(curP.year, curP.month, curP.day);
    const dateObj = new Date(Date.UTC(g.year, g.month - 1, g.day));
    dateObj.setUTCDate(dateObj.getUTCDate() + step);
    const newJ = toJalali(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, dateObj.getUTCDate());
    onSelectDate(formatJalaliDate(newJ.year, newJ.month, newJ.day));
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="p-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Date Navigation & Picker Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-3 shadow-xs">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleStepDay(1)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title="روز بعد"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Calendar className="w-4 h-4 text-neutral-500" />
            <div className="text-center">
              <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 justify-center">
                <span>{weekdayName}</span>
                <span>{toPersianDigits(selectedDate)}</span>
                {isToday && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                    امروز
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 font-medium">
                لمس برای تغییر تاریخ
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStepDay(-1)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            title="روز قبل"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Entry Reminder Alert Banner if user hasn't registered entry yet */}
      {showEntryReminderAlert && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-amber-900 dark:text-amber-200">
                یادآوری ثبت ورود
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 truncate">
                ساعت از {toPersianDigits(settings.entryReminderTime)} گذشته و هنوز ورود امروز ثبت نشده است.
              </div>
            </div>
          </div>
          <button
            onClick={handlePrimaryClockIn}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 active:scale-95 transition-all shadow-xs"
          >
            ثبت ورود الان
          </button>
        </div>
      )}

      {/* Summary Cards: 3 cards grid (بدون ساعت خروج تقریبی) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: Work done so far */}
        <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
              کارکرد امروز
            </span>
            <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-neutral-950 dark:text-neutral-50 tabular-nums">
            {toPersianDigits(Math.floor(totalDayWorkMinutes / 60))}:
            {toPersianDigits(String(Math.floor(totalDayWorkMinutes % 60)).padStart(2, '0'))}
          </div>
          {openInterval && isToday ? (
            <div className="text-[9px] text-neutral-600 dark:text-neutral-300 font-medium mt-1 flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white animate-pulse shrink-0" />
              در حال ثبت...
            </div>
          ) : (
            <div className="text-[9px] text-neutral-400 mt-1 truncate">
              مجموع بازه‌ها
            </div>
          )}
        </div>

        {/* Card 2: Remaining to Daily Quota */}
        <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
              مانده تا موظفی
            </span>
            <Hourglass className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-neutral-950 dark:text-neutral-50 tabular-nums">
            {toPersianDigits(Math.floor(remainingTodayMinutes / 60))}:
            {toPersianDigits(String(Math.floor(remainingTodayMinutes % 60)).padStart(2, '0'))}
          </div>
          <div className="text-[9px] text-neutral-400 mt-1 truncate">
            {remainingTodayMinutes === 0 ? 'تکمیل شده' : `موظفی: ${toPersianDigits(settings.dailyQuotaHours)}:${toPersianDigits(String(settings.dailyQuotaMinutes).padStart(2, '0'))}`}
          </div>
        </div>

        {/* Card 3: Overtime Today */}
        <div className="p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 truncate">
              اضافه‌کار امروز
            </span>
            <Plus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-neutral-950 dark:text-neutral-50 tabular-nums">
            {toPersianDigits(Math.floor(overtimeTodayMinutes / 60))}:
            {toPersianDigits(String(Math.floor(overtimeTodayMinutes % 60)).padStart(2, '0'))}
          </div>
          <div className="text-[9px] text-neutral-400 mt-1 truncate">
            {!isWorkDay ? 'کار روز تعطیل' : 'مازاد موظفی'}
          </div>
        </div>
      </div>

      {/* --- PRIMARY WORK INTERVAL SECTION (بازه کاری اصلی / پیش‌فرض) --- */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-300 dark:border-neutral-700 p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-950 dark:text-neutral-50">
                بازه کاری اصلی (پیش‌فرض)
              </h3>
              <span className="text-[11px] text-neutral-500 font-medium">
                مدیریت هوشمند شیفت کاری روزانه
              </span>
            </div>
          </div>

          {primaryInterval && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditingInterval(primaryInterval);
                  setEditingLeave(null);
                  setModalDefaultIsPrimary(true);
                  setIsModalOpen(true);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                title="ویرایش بازه اصلی"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDeleteInterval(primaryInterval.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                title="حذف بازه اصلی"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Live Real-time Status Banner */}
        <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                primaryInterval && primaryInterval.endTime === null
                  ? 'bg-neutral-900 dark:bg-white animate-pulse'
                  : primaryInterval && primaryInterval.endTime !== null
                  ? 'bg-neutral-500'
                  : 'bg-neutral-400'
              }`}
            />
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              {primaryInterval && primaryInterval.endTime === null
                ? 'در حال کار (بازه اصلی باز است)'
                : primaryInterval && primaryInterval.endTime !== null
                ? 'شیفت کاری اصلی ثبت و تکمیل شده'
                : 'در انتظار ثبت ورود و شروع کار'}
            </span>
          </div>

          {primaryInterval && primaryInterval.endTime === null && (
            <div className="font-mono font-bold text-xs text-neutral-950 dark:text-white tabular-nums tracking-wider">
              {(() => {
                const startSec = timeStringToMinutes(primaryInterval.startTime) * 60;
                const elapsedSec = Math.max(0, nowSeconds - startSec);
                const elH = Math.floor(elapsedSec / 3600);
                const elM = Math.floor((elapsedSec % 3600) / 60);
                const elS = elapsedSec % 60;
                return `${toPersianDigits(elH)}:${toPersianDigits(
                  String(elM).padStart(2, '0')
                )}:${toPersianDigits(String(elS).padStart(2, '0'))}`;
              })()}
            </div>
          )}

          {primaryInterval && primaryInterval.endTime !== null && (
            <span className="font-mono text-xs font-bold text-neutral-600 dark:text-neutral-400">
              {toPersianDigits(
                minutesToTimeString(
                  calculateIntervalMinutes(primaryInterval.startTime, primaryInterval.endTime)
                )
              )}
            </span>
          )}
        </div>

        {/* Dual Smart Action Buttons: «ثبت ورود» و «ثبت پایان» */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Button 1: ثبت ورود (Clock In) */}
          {!primaryInterval ? (
            <button
              onClick={handlePrimaryClockIn}
              className="min-h-[58px] p-3 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex flex-col items-center justify-center gap-1 active:scale-98 transition-all shadow-md"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <LogIn className="w-4 h-4 stroke-[2.5]" />
                <span>ثبت ورود</span>
              </div>
              <span className="text-[11px] font-mono opacity-80 tabular-nums">
                {toPersianDigits(currentTimeString)}
              </span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingInterval(primaryInterval);
                setEditingLeave(null);
                setModalDefaultIsPrimary(true);
                setIsModalOpen(true);
              }}
              className="min-h-[58px] p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center gap-1 active:scale-98 transition-all"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ورود: {toPersianDigits(primaryInterval.startTime)}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">
                لمس برای ویرایش
              </span>
            </button>
          )}

          {/* Button 2: ثبت پایان (Clock Out) */}
          {primaryInterval && primaryInterval.endTime === null ? (
            <button
              onClick={() => handleClockOut(primaryInterval)}
              className="min-h-[58px] p-3 rounded-2xl bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 flex flex-col items-center justify-center gap-1 active:scale-98 transition-all shadow-md"
            >
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <LogOut className="w-4 h-4 stroke-[2.5]" />
                <span>ثبت پایان</span>
              </div>
              <span className="text-[11px] font-mono opacity-80 tabular-nums">
                {toPersianDigits(currentTimeString)}
              </span>
            </button>
          ) : primaryInterval && primaryInterval.endTime !== null ? (
            <button
              onClick={() => {
                setEditingInterval(primaryInterval);
                setEditingLeave(null);
                setModalDefaultIsPrimary(true);
                setIsModalOpen(true);
              }}
              className="min-h-[58px] p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center gap-1 active:scale-98 transition-all"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-800 dark:text-neutral-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>خروج: {toPersianDigits(primaryInterval.endTime)}</span>
              </div>
              <span className="text-[10px] text-neutral-500 font-medium">
                لمس برای ویرایش
              </span>
            </button>
          ) : (
            <button
              disabled
              onClick={() => showFeedback('ابتدا باید ثبت ورود را انجام دهید.')}
              className="min-h-[58px] p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 flex flex-col items-center justify-center gap-1 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <LogOut className="w-3.5 h-3.5" />
                <span>ثبت پایان</span>
              </div>
              <span className="text-[10px]">در انتظار ورود</span>
            </button>
          )}
        </div>

        {/* If primary interval completed: Option to start a new shift / interval */}
        {primaryInterval && primaryInterval.endTime !== null && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
            <span className="text-neutral-500">
              کارکرد این شیفت: {toPersianDigits(
                Math.floor(
                  calculateIntervalMinutes(primaryInterval.startTime, primaryInterval.endTime) / 60
                )
              )} ساعت و {toPersianDigits(
                Math.floor(
                  calculateIntervalMinutes(primaryInterval.startTime, primaryInterval.endTime) % 60
                )
              )} دقیقه
            </span>

            <button
              onClick={() => {
                setEditingInterval(null);
                setEditingLeave(null);
                setModalDefaultIsPrimary(false);
                setIsModalOpen(true);
              }}
              className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
            >
              <Plus className="w-3 h-3" />
              شروع شیفت دیگر
            </button>
          </div>
        )}
      </div>

      {/* --- EXTRA WORK INTERVALS SECTION (بازه‌های کاری اضافی) --- */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
              بازه‌های کاری اضافی
            </h3>
            <span className="text-[11px] text-neutral-400">
              شیفت دوم، اضافه‌کاری یا سایر فعالیت‌ها ({toPersianDigits(extraIntervals.length)})
            </span>
          </div>

          <button
            onClick={() => {
              setEditingInterval(null);
              setEditingLeave(null);
              setModalDefaultIsPrimary(false);
              setIsModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center gap-1 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            افزودن بازه اضافی
          </button>
        </div>

        {extraIntervals.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            هیچ بازه کاری اضافی برای این روز ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
            {extraIntervals.map((interval, idx) => {
              const isItemOpen = interval.endTime === null;
              const durationM = isItemOpen
                ? calculateIntervalMinutes(interval.startTime, null, nowMinutes)
                : calculateIntervalMinutes(interval.startTime, interval.endTime);

              return (
                <div
                  key={interval.id}
                  className="py-3 flex items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {toPersianDigits(interval.startTime)} تا{' '}
                        {isItemOpen ? 'اکنون' : toPersianDigits(interval.endTime || '')}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        بازه اضافی {toPersianDigits(idx + 1)}
                      </span>
                      {isItemOpen && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 animate-pulse">
                          در حال کار
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 font-medium">
                      مدت: {toPersianDigits(Math.floor(durationM / 60))} ساعت و{' '}
                      {toPersianDigits(Math.floor(durationM % 60))} دقیقه
                      {interval.note && ` · ${interval.note}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isItemOpen ? (
                      <button
                        onClick={() => handleClockOut(interval)}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs flex items-center gap-1 active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        ثبت پایان
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingInterval(interval);
                            setEditingLeave(null);
                            setModalDefaultIsPrimary(false);
                            setIsModalOpen(true);
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteInterval(interval.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- LEAVE SECTION (مرخصی) --- */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
              <Coffee className="w-4 h-4" />
              مرخصی
            </h3>
            <span className="text-[11px] text-neutral-400">
              {toPersianDigits(dayLeaves.length)} مرخصی ثبت شده
            </span>
          </div>

          <button
            onClick={() => {
              setEditingInterval(null);
              setEditingLeave(null);
              setIsModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center gap-1 active:scale-95 transition-all min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            ثبت مرخصی
          </button>
        </div>

        {dayLeaves.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            هیچ مرخصی برای این روز ثبت نشده است.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
            {dayLeaves.map((leave) => (
              <div
                key={leave.id}
                className="py-3 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                    {leave.type === 'full_day'
                      ? 'مرخصی تمام‌روز'
                      : `مرخصی ساعتی (${toPersianDigits(leave.startTime || '')} تا ${toPersianDigits(leave.endTime || '')})`}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-medium">
                    {toPersianDigits(Math.floor(leave.durationMinutes / 60))} ساعت و{' '}
                    {toPersianDigits(leave.durationMinutes % 60)} دقیقه
                    {leave.note && ` · ${leave.note}`}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingLeave(leave);
                      setEditingInterval(null);
                      setIsModalOpen(true);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                    title="ویرایش"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteLeave(leave.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <IntervalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInterval(null);
          setEditingLeave(null);
        }}
        dateStr={selectedDate}
        initialInterval={editingInterval}
        initialLeave={editingLeave}
        existingIntervals={intervals}
        existingLeaves={leaves}
        onSaveInterval={onSaveInterval}
        onDeleteInterval={onDeleteInterval}
        onSaveLeave={onSaveLeave}
        onDeleteLeave={onDeleteLeave}
        dailyQuotaMinutes={dailyQuotaMinutes}
        defaultIsPrimary={modalDefaultIsPrimary}
      />

      <JalaliDatePickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      {/* Under-Hours Deficit Prompt Modal */}
      <DeficitPromptModal
        isOpen={Boolean(deficitModalData)}
        onClose={() => setDeficitModalData(null)}
        workMinutesToday={deficitModalData?.workMinutesToday || 0}
        dailyQuotaMinutes={deficitModalData?.dailyQuotaMinutes || 0}
        deficitMinutes={deficitModalData?.deficitMinutes || 0}
        endTimeString={deficitModalData?.endTimeString || ''}
        onConfirmWithLeave={handleConfirmWithLeave}
        onConfirmWithoutLeave={handleConfirmWithoutLeave}
      />
    </div>
  );
};
