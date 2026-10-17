export type TabType = 'record' | 'stats' | 'settings';

export interface WorkInterval {
  id: string;
  date: string; // Shamsi date YYYY/MM/DD
  startTime: string; // HH:mm
  endTime: string | null; // HH:mm or null if currently working
  note?: string;
  isPrimary?: boolean; // true if this is the default/primary interval of the day
  createdAt: number;
}

export type LeaveType = 'hourly' | 'full_day';

export interface LeaveRecord {
  id: string;
  date: string; // Shamsi date YYYY/MM/DD
  type: LeaveType;
  startTime?: string; // HH:mm for hourly
  endTime?: string; // HH:mm for hourly
  durationMinutes: number;
  note?: string;
  createdAt: number;
}

export interface OfficialHoliday {
  id: string;
  date: string; // YYYY/MM/DD (for specific year) or MM/DD (for recurring annual)
  title: string;
  isRecurring: boolean; // if true, applies every year based on MM/DD
}

export interface UserSettings {
  dailyQuotaHours: number; // e.g. 8
  dailyQuotaMinutes: number; // e.g. 15 (07:15 to 15:30 is 8h 15m)
  standardEntryTime?: string; // e.g. "07:15"
  standardExitTime?: string; // e.g. "15:30"
  isThursdayHoliday: boolean; // Friday is always holiday
  departureReminderEnabled?: boolean;
  reminderMinutesBeforeQuota?: number;
  entryReminderEnabled: boolean; // یادآوری ثبت ورود
  entryReminderTime: string; // HH:mm e.g. "07:15"
  theme: 'light' | 'dark';
  // New features:
  soundEnabled?: boolean;
  motionPreference?: 'normal' | 'reduced' | 'off';
  weeklySummaryEnabled?: boolean;
  incompleteReminderEnabled?: boolean;
  backupReminderEnabled?: boolean;
  cardVisibility?: {
    delayToday?: boolean;
    overtimeToday?: boolean;
    delayMonth?: boolean;
    overtimeMonth?: boolean;
    netOvertime?: boolean;
    workProgress?: boolean;
  };
}

export interface HistoryAction {
  id: string;
  timestamp: number;
  actionType: 'create_interval' | 'update_interval' | 'delete_interval' | 'create_leave' | 'update_leave' | 'delete_leave';
  description: string;
  previousData?: any;
  newData?: any;
}

export interface IncompleteRecordIssue {
  id: string;
  date: string;
  type: 'open_past_interval' | 'excessive_duration' | 'overlapping' | 'unrecorded_workday';
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  intervalId?: string;
}

export interface WeeklySummary {
  weekIndex: number; // 1, 2, 3, 4, 5
  startDate: string;
  endDate: string;
  workMinutes: number;
  leaveMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  netOvertimeMinutes: number;
  workDaysCount: number;
}

export interface MonthComparisonResult {
  currentTotalWork: number;
  previousTotalWork: number;
  workDiffMinutes: number;
  workDiffPercentage: number;
  
  currentTotalDelay: number;
  previousTotalDelay: number;
  delayDiffMinutes: number;

  currentNetOvertime: number;
  previousNetOvertime: number;
  overtimeDiffMinutes: number;

  currentLeave: number;
  previousLeave: number;
  leaveDiffMinutes: number;
}

export interface DayCalculationResult {
  date: string; // YYYY/MM/DD
  dayOfWeekIndex: number; // 0=Sat, 6=Fri
  isWeeklyHoliday: boolean;
  isOfficialHoliday: boolean;
  holidayTitle?: string;
  isWorkDay: boolean; // neither weekly nor official holiday
  workMinutes: number;
  leaveMinutes: number;
  delayMinutes: number; // تاخیر ورود بعد از ۰۷:۱۵ (و کسر کار)
  entryDelayMinutes: number; // تاخیر مشخص ورود
  overtimeMinutes: number; // اضافه‌کار روزانه (خروج بعد از ۱۵:۳۰ یا کار در تعطیلات)
  cumulativeWorkMinutes: number;
  cumulativeOvertimeMinutes: number; // مجموع اضافه‌کار ناخالص تا این روز
  cumulativeDelayMinutes: number; // مجموع تاخیرها تا این روز
  netOvertimeMinutes: number; // خالص اضافه‌کار تا این روز: max(0, cumulativeOvertime - cumulativeDelay)
}

export interface MonthCalculationResult {
  year: number;
  month: number;
  workDaysCount: number;
  dailyQuotaMinutes: number;
  D_minutes: number; // Total required minutes in work days
  elapsedWorkDaysCount: number; // روزهای کاری موظفی سپری‌شده تا تاریخ جاری در این ماه
  elapsedQuotaMinutes: number; // مجموع ساعات موظفی در روزهای کاری سپری‌شده تا تاریخ جاری
  P_minutes: number; // Recorded work on work days
  L_minutes: number; // Recorded leave minutes
  H_minutes: number; // Recorded work on holidays
  totalWorkMinutes: number; // P + H
  daysWithWorkCount: number;
  daysWithLeaveCount: number;
  remainingMinutes: number; // max(0, D - P - L)
  
  // Model for 07:15 entry delay & 15:30 exit overtime offset
  totalDelayMinutes: number; // مجموع کسر کار یا تاخیرهای کل ماه
  elapsedDelayMinutes: number; // مجموع تاخیرها تا امروز
  grossOvertimeMinutes: number; // مجموع اضافه‌کار ناخالص (خروج بعد از ۱۵:۳۰ + کار تعطیلات)
  elapsedGrossOvertimeMinutes: number; // مجموع اضافه‌کار ناخالص تا امروز
  netOvertimeMinutes: number; // باقی‌مانده اضافه‌کار پس از کسر تاخیرها: max(0, grossOvertime - totalDelay)
  elapsedNetOvertimeMinutes: number; // خالص اضافه‌کار تا امروز: max(0, elapsedGrossOvertime - elapsedDelay)
  netDelayDeficitMinutes: number; // مانده تاخیر جبران‌نشده: max(0, totalDelay - grossOvertime)

  normalOvertimeMinutes: number; // max(0, P - D)
  totalOvertimeMinutes: number; // normalOvertime + H
  totalOvertime?: number; // alias for totalOvertimeMinutes or netOvertimeMinutes
  dailyBreakdown: Record<string, DayCalculationResult>;
}
