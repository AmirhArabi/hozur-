/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import {
  LeaveRecord,
  OfficialHoliday,
  TabType,
  UserSettings,
  WorkInterval
} from './types';
import {
  DEFAULT_FIXED_HOLIDAYS,
  DEFAULT_SETTINGS,
  calculateMonthStats
} from './utils/calculator';
import {
  formatJalaliDate,
  getCurrentJalaliDate,
  getCurrentTimeString,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  toPersianDigits
} from './utils/jalali';
import { StorageService } from './services/storage';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { RecordTab } from './components/RecordTab';
import { StatsTab } from './components/StatsTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('record');
  const [isLoading, setIsLoading] = useState(true);

  // App Data State
  const [intervals, setIntervals] = useState<WorkInterval[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<OfficialHoliday[]>(DEFAULT_FIXED_HOLIDAYS);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Current Date & Time State
  const today = getCurrentJalaliDate();
  const todayDateStr = formatJalaliDate(today.year, today.month, today.day);
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [statsYear, setStatsYear] = useState<number>(today.year);
  const [statsMonth, setStatsMonth] = useState<number>(today.month);

  // Live timer tick
  const [currentTimeString, setCurrentTimeString] = useState<string>(getCurrentTimeString());
  const [nowMinutes, setNowMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  });

  // Re-sync live time tick
  const syncLiveTime = () => {
    const now = new Date();
    setCurrentTimeString(getCurrentTimeString());
    setNowMinutes(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
  };

  // Load persistent data on mount
  const loadAllData = async () => {
    try {
      const [storedIntervals, storedLeaves, storedHolidays, storedSettings] =
        await Promise.all([
          StorageService.getIntervals(),
          StorageService.getLeaves(),
          StorageService.getHolidays(),
          StorageService.getSettings()
        ]);

      setIntervals(storedIntervals);
      setLeaves(storedLeaves);
      setHolidays(storedHolidays);
      setSettings(storedSettings);
    } catch (err) {
      console.error('Failed loading data from storage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Timer interval: tick every second for live timer
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      syncLiveTime();
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Recalculate live timer when app returns from background / visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncLiveTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Capacitor app state change
    let capListener: any;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          syncLiveTime();
        }
      }).then((listener) => {
        capListener = listener;
      });
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (capListener) capListener.remove();
    };
  }, []);

  // Capacitor Hardware Back Button Handler:
  // If in Stats or Settings, navigate back to 'record'.
  // If in 'record', exit app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let backListener: any;
    CapApp.addListener('backButton', () => {
      setActiveTab((currentTab) => {
        if (currentTab !== 'record') {
          return 'record';
        }
        CapApp.exitApp();
        return currentTab;
      });
    }).then((listener) => {
      backListener = listener;
    });

    return () => {
      if (backListener) backListener.remove();
    };
  }, []);

  // Theme synchronization and StatusBar color update
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (Capacitor.isNativePlatform()) {
      try {
        if (settings.theme === 'dark') {
          StatusBar.setStyle({ style: Style.Dark });
          StatusBar.setBackgroundColor({ color: '#171717' });
        } else {
          StatusBar.setStyle({ style: Style.Light });
          StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch {
        // Ignore
      }
    }
  }, [settings.theme]);

  // Data persistence handlers
  const handleSaveInterval = async (
    intervalData: Omit<WorkInterval, 'id' | 'createdAt'>,
    id?: string
  ) => {
    let updated: WorkInterval[];
    if (id) {
      updated = intervals.map((i) =>
        i.id === id ? { ...i, ...intervalData } : i
      );
    } else {
      const newInterval: WorkInterval = {
        ...intervalData,
        id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now()
      };
      updated = [newInterval, ...intervals];
    }
    setIntervals(updated);
    await StorageService.saveIntervals(updated);
  };

  const handleDeleteInterval = async (id: string) => {
    const updated = intervals.filter((i) => i.id !== id);
    setIntervals(updated);
    await StorageService.saveIntervals(updated);
  };

  const handleSaveLeave = async (
    leaveData: Omit<LeaveRecord, 'id' | 'createdAt'>,
    id?: string
  ) => {
    let updated: LeaveRecord[];
    if (id) {
      updated = leaves.map((l) => (l.id === id ? { ...l, ...leaveData } : l));
    } else {
      const newLeave: LeaveRecord = {
        ...leaveData,
        id: `leave-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now()
      };
      updated = [newLeave, ...leaves];
    }
    setLeaves(updated);
    await StorageService.saveLeaves(updated);
  };

  const handleDeleteLeave = async (id: string) => {
    const updated = leaves.filter((l) => l.id !== id);
    setLeaves(updated);
    await StorageService.saveLeaves(updated);
  };

  const handleUpdateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    await StorageService.saveSettings(newSettings);
  };

  const handleUpdateHolidays = async (newHolidays: OfficialHoliday[]) => {
    setHolidays(newHolidays);
    await StorageService.saveHolidays(newHolidays);
  };

  // Month Statistics for Stats Tab
  const statsMonthResult = useMemo(() => {
    return calculateMonthStats({
      year: statsYear,
      month: statsMonth,
      intervals,
      leaves,
      holidays,
      settings,
      currentTimeMinutes: nowMinutes,
      currentDateStr: todayDateStr
    });
  }, [statsYear, statsMonth, intervals, leaves, holidays, settings, nowMinutes, todayDateStr]);

  // Current Month Statistics for Record Tab live breakdown
  const currentMonthResult = useMemo(() => {
    return calculateMonthStats({
      year: today.year,
      month: today.month,
      intervals,
      leaves,
      holidays,
      settings,
      currentTimeMinutes: nowMinutes,
      currentDateStr: todayDateStr
    });
  }, [today.year, today.month, intervals, leaves, holidays, settings, nowMinutes, todayDateStr]);

  // Today Persian Date String for Header
  const todayWeekdayName = PERSIAN_WEEKDAYS[today.day % 7]; // or accurate weekday
  const todayHeaderString = `${toPersianDigits(today.day)} ${PERSIAN_MONTH_NAMES[today.month - 1]} ${toPersianDigits(today.year)}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-neutral-400">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        theme={settings.theme}
        onToggleTheme={() =>
          handleUpdateSettings({
            ...settings,
            theme: settings.theme === 'dark' ? 'light' : 'dark'
          })
        }
        todayPersianDateString={todayHeaderString}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 overflow-y-auto no-scrollbar">
        {activeTab === 'record' && (
          <RecordTab
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            intervals={intervals}
            leaves={leaves}
            settings={settings}
            monthStats={currentMonthResult}
            nowMinutes={nowMinutes}
            currentTimeString={currentTimeString}
            onSaveInterval={handleSaveInterval}
            onDeleteInterval={handleDeleteInterval}
            onSaveLeave={handleSaveLeave}
            onDeleteLeave={handleDeleteLeave}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            statsYear={statsYear}
            statsMonth={statsMonth}
            onChangeStatsMonth={(y, m) => {
              setStatsYear(y);
              setStatsMonth(m);
            }}
            monthStats={statsMonthResult}
            intervals={intervals}
            leaves={leaves}
            holidays={holidays}
            settings={settings}
            onGoToRecordDate={(dateStr) => {
              setSelectedDate(dateStr);
              setActiveTab('record');
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            holidays={holidays}
            onUpdateHolidays={handleUpdateHolidays}
            onDataReloadNeeded={loadAllData}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  );
}
