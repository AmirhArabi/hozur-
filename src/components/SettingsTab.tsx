import React, { useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  Download,
  Globe,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Trash2,
  Upload
} from 'lucide-react';
import { OfficialHoliday, UserSettings } from '../types';
import { DEFAULT_FIXED_HOLIDAYS } from '../utils/calculator';
import { toPersianDigits } from '../utils/jalali';
import { ExportService } from '../services/export';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { HolidayModal } from './HolidayModal';

interface SettingsTabProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  holidays: OfficialHoliday[];
  onUpdateHolidays: (holidays: OfficialHoliday[]) => void;
  onDataReloadNeeded: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  holidays,
  onUpdateHolidays,
  onDataReloadNeeded
}) => {
  const [hoursInput, setHoursInput] = useState(String(settings.dailyQuotaHours));
  const [minutesInput, setMinutesInput] = useState(String(settings.dailyQuotaMinutes));
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveDailyQuota = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseInt(hoursInput, 10);
    const m = parseInt(minutesInput, 10);

    const validH = isNaN(h) ? 8 : Math.max(1, Math.min(24, h));
    const validM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));

    setHoursInput(String(validH));
    setMinutesInput(String(validM));

    onUpdateSettings({
      ...settings,
      dailyQuotaHours: validH,
      dailyQuotaMinutes: validM
    });

    setNotificationMsg(
      `موظفی روزانه به ${toPersianDigits(validH)} ساعت و ${toPersianDigits(validM)} دقیقه ذخیره شد.`
    );
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleToggleThursday = () => {
    onUpdateSettings({
      ...settings,
      isThursdayHoliday: !settings.isThursdayHoliday
    });
  };

  const handleToggleEntryReminder = async () => {
    const nextState = !settings.entryReminderEnabled;

    if (nextState) {
      // Request permission (handles Android 13+ POST_NOTIFICATIONS)
      const perm = await NotificationService.requestPermission();
      if (!perm.granted) {
        setNotificationMsg(
          perm.message || 'مجوز اعلان‌ها تایید نشد. لطفا در تنظیمات دستگاه فعال کنید.'
        );
        setTimeout(() => setNotificationMsg(null), 4000);
        return;
      }
      await NotificationService.scheduleEntryReminder(settings.entryReminderTime || '09:00');
    } else {
      await NotificationService.cancelEntryReminder();
    }

    onUpdateSettings({
      ...settings,
      entryReminderEnabled: nextState
    });

    setNotificationMsg(
      nextState
        ? `یادآوری ثبت ورود در ساعت ${toPersianDigits(settings.entryReminderTime || '09:00')} فعال شد.`
        : 'یادآوری ثبت ورود غیرفعال شد.'
    );
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  const handleChangeEntryReminderTime = async (newTime: string) => {
    onUpdateSettings({
      ...settings,
      entryReminderTime: newTime
    });
    if (settings.entryReminderEnabled) {
      await NotificationService.scheduleEntryReminder(newTime);
      setNotificationMsg(`ساعت یادآوری به ${toPersianDigits(newTime)} تغییر یافت.`);
      setTimeout(() => setNotificationMsg(null), 3000);
    }
  };

  const handleTestNotification = async () => {
    const success = await NotificationService.sendTestNotification();
    if (success) {
      setNotificationMsg('اعلان آزمایشی با موفقیت ارسال شد.');
    } else {
      setNotificationMsg('خطا در ارسال اعلان آزمایشی. مجوز اعلان را در دستگاه بررسی کنید.');
    }
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  const handleAddHoliday = (newH: Omit<OfficialHoliday, 'id'>) => {
    const item: OfficialHoliday = {
      ...newH,
      id: `custom-${Date.now()}`
    };
    onUpdateHolidays([...holidays, item]);
  };

  const handleDeleteHoliday = (id: string) => {
    onUpdateHolidays(holidays.filter((h) => h.id !== id));
  };

  const handleResetHolidays = () => {
    onUpdateHolidays(DEFAULT_FIXED_HOLIDAYS);
    setNotificationMsg('تعطیلات رسمی به حالت پیش‌فرض بازگردانده شد.');
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // Full Backup Export
  const handleExportBackup = async () => {
    const backupJson = await StorageService.exportFullBackup();
    await ExportService.exportJSONBackup(backupJson);
    setBackupStatus('فایل پشتیبان با موفقیت استخراج شد.');
    setTimeout(() => setBackupStatus(null), 4000);
  };

  // Full Backup Import
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await StorageService.importFullBackup(text);
      setBackupStatus(res.message);
      if (res.success) {
        onDataReloadNeeded();
      }
    } catch {
      setBackupStatus('خطا در بارگذاری فایل پشتیبان.');
    }
    setTimeout(() => setBackupStatus(null), 4000);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {(notificationMsg || backupStatus) && (
        <div className="p-3 rounded-2xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-md flex items-center justify-between">
          <span>{notificationMsg || backupStatus}</span>
        </div>
      )}

      {/* 1. Daily Quota Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 mb-1">
          موظفی روزانه
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          ساعت کاری تعیین‌شده برای روزهای کاری عادی (پیش‌فرض: ۸ ساعت و ۳۰ دقیقه)
        </p>

        <form onSubmit={handleSaveDailyQuota} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                ساعت
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                دقیقه
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-98 transition-all shadow-xs"
          >
            <Check className="w-4 h-4" />
            ذخیره ساعت موظفی
          </button>
        </form>
      </div>

      {/* 2. Weekly Holidays */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 mb-1">
          روزهای تعطیل هفتگی
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          روزهای تعطیل در محاسبه ساعات موظفی در نظر گرفته نمی‌شوند و کار در آنها تماماً اضافه‌کار است.
        </p>

        <div className="space-y-2.5">
          {/* Friday: Fixed */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
            <div>
              <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                جمعه
              </div>
              <div className="text-[11px] text-neutral-500">تعطیل ثابت هفتگی</div>
            </div>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              ثابت
            </span>
          </div>

          {/* Thursday: Toggle */}
          <label className="flex items-center justify-between p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 cursor-pointer">
            <div>
              <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                پنج‌شنبه
              </div>
              <div className="text-[11px] text-neutral-500">تعطیلی اختیاری آخر هفته</div>
            </div>
            <input
              type="checkbox"
              checked={settings.isThursdayHoliday}
              onChange={handleToggleThursday}
              className="w-5 h-5 rounded-md border-neutral-300 dark:border-neutral-700 text-neutral-900 focus:ring-0"
            />
          </label>
        </div>
      </div>

      {/* 3. Official Holidays Management */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-neutral-500" />
              تعطیلات رسمی
            </h3>
            <span className="text-[11px] text-neutral-400">
              {toPersianDigits(holidays.length)} روز تعطیل فعال
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsHolidayModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              افزودن
            </button>
            <button
              onClick={handleResetHolidays}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 active:scale-95"
              title="بازنشانی به تعطیلات پیش‌فرض"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Holidays List */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-56 overflow-y-auto no-scrollbar mt-2">
          {holidays.map((h) => (
            <div key={h.id} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                  {h.title}
                </div>
                <div className="text-[11px] font-mono text-neutral-500">
                  {toPersianDigits(h.date)} {h.isRecurring && '(سالانه)'}
                </div>
              </div>

              <button
                onClick={() => handleDeleteHoliday(h.id)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 active:scale-95"
                title="حذف تعطیلی"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Entry Reminder Notification (یادآوری ثبت ورود) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                یادآوری ثبت ورود (اعلان)
              </div>
              <div className="text-[11px] text-neutral-500">
                اعلان در صورتی که تا ساعت مشخص‌شده ورود ثبت نشود
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.entryReminderEnabled}
              onChange={handleToggleEntryReminder}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-950 dark:peer-checked:bg-white dark:after:border-neutral-900 dark:after:bg-neutral-950" />
          </label>
        </div>

        {settings.entryReminderEnabled && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                ساعت یادآوری روزانه:
              </label>
              <input
                type="time"
                value={settings.entryReminderTime || '09:00'}
                onChange={(e) => handleChangeEntryReminderTime(e.target.value)}
                className="h-10 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold text-center focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-400">
                آزمایش فعال بودن اعلان‌ها روی دستگاه:
              </span>
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold active:scale-95 transition-all"
              >
                تست اعلان
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Backup & Restore Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-50">
          پشتیبان‌گیری و بازیابی اطلاعات
        </h3>
        <p className="text-xs text-neutral-500">
          تمامی داده‌های شما تنها روی حافظه محلی همین دستگاه ذخیره می‌شود. برای حفظ داده‌ها یا انتقال به دستگاه دیگر، از پشتیبان‌گیری استفاده کنید.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportBackup}
            className="h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            دانلود فایل پشتیبان (JSON)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            بازیابی از فایل (JSON)
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />
        </div>
      </div>

      {/* 6. Theme Appearance */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              {settings.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-bold text-xs text-neutral-900 dark:text-neutral-100">
                حالت ظاهری
              </div>
              <div className="text-[11px] text-neutral-500">
                پوسته تیره / پوسته روشن
              </div>
            </div>
          </div>

          <div className="flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1">
            <button
              onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.theme === 'light'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              روشن
            </button>
            <button
              onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                settings.theme === 'dark'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500'
              }`}
            >
              تیره
            </button>
          </div>
        </div>
      </div>

      {/* 7. About App & Developer Section (معرفی برنامه و توسعه‌دهنده) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-xs space-y-3.5">
        <div className="flex items-center gap-3">
          <img
            src="./icon.png"
            alt="hozur logo"
            className="w-12 h-12 rounded-2xl shadow-xs object-contain border border-neutral-200 dark:border-neutral-800"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-neutral-950 dark:text-neutral-50 font-mono">
                hozur
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                v1.1.0
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              ثبت و مدیریت هوشمند ساعات کاری، موظفی و اضافه‌کار
            </p>
          </div>
        </div>

        <div className="pt-2.5 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 font-medium">توسعه‌دهنده:</span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
              امیرحسین عربی
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Telegram Link with Official Telegram Symbol */}
            <a
              href="https://t.me/amirharabi"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-3 rounded-2xl bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all border border-[#229ED9]/25 shadow-2xs"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.195 1.006.128.832.926z" />
              </svg>
              <span>@amirharabi</span>
            </a>

            {/* Website Link */}
            <a
              href="https://amirharabi.ir"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-3 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-neutral-200 dark:border-neutral-700 shadow-2xs"
            >
              <Globe className="w-4 h-4 text-neutral-500 shrink-0" />
              <span className="font-mono">amirharabi.ir</span>
            </a>
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onAddHoliday={handleAddHoliday}
      />
    </div>
  );
};
