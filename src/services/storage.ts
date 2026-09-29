/**
 * Local Data Storage Service
 * Uses @capacitor/preferences combined with IndexedDB and localStorage
 * for robust, zero-server offline persistence on device.
 */

import { Preferences } from '@capacitor/preferences';
import { LeaveRecord, OfficialHoliday, UserSettings, WorkInterval } from '../types';
import { DEFAULT_FIXED_HOLIDAYS, DEFAULT_SETTINGS } from '../utils/calculator';

const KEYS = {
  INTERVALS: 'wt_intervals',
  LEAVES: 'wt_leaves',
  HOLIDAYS: 'wt_holidays',
  SETTINGS: 'wt_settings'
};

// IndexedDB Helper for deep local persistence fallback
const DB_NAME = 'WorkTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_data';

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

/**
 * Universal safe storage getter.
 * Checks Capacitor Preferences first, falls back to IndexedDB and localStorage.
 */
async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const res = await Preferences.get({ key });
    if (res.value) {
      return JSON.parse(res.value) as T;
    }
  } catch {
    // Preferences unavailable
  }

  // Fallback 1: IndexedDB
  const idbVal = await idbGet<T>(key);
  if (idbVal !== null) {
    return idbVal;
  }

  // Fallback 2: LocalStorage
  try {
    const lsVal = localStorage.getItem(key);
    if (lsVal) {
      return JSON.parse(lsVal) as T;
    }
  } catch {
    // LocalStorage unavailable
  }

  return fallback;
}

/**
 * Universal safe storage setter.
 * Writes to Capacitor Preferences, IndexedDB, and localStorage simultaneously.
 */
async function setItem<T>(key: string, value: T): Promise<void> {
  const jsonStr = JSON.stringify(value);

  try {
    await Preferences.set({ key, value: jsonStr });
  } catch {
    // Ignore error
  }

  // Dual backup to IndexedDB and LocalStorage
  await idbSet(key, value);

  try {
    localStorage.setItem(key, jsonStr);
  } catch {
    // Ignore error
  }
}

export const StorageService = {
  async getIntervals(): Promise<WorkInterval[]> {
    return getItem<WorkInterval[]>(KEYS.INTERVALS, []);
  },

  async saveIntervals(intervals: WorkInterval[]): Promise<void> {
    await setItem(KEYS.INTERVALS, intervals);
  },

  async getLeaves(): Promise<LeaveRecord[]> {
    return getItem<LeaveRecord[]>(KEYS.LEAVES, []);
  },

  async saveLeaves(leaves: LeaveRecord[]): Promise<void> {
    await setItem(KEYS.LEAVES, leaves);
  },

  async getHolidays(): Promise<OfficialHoliday[]> {
    const list = await getItem<OfficialHoliday[]>(KEYS.HOLIDAYS, DEFAULT_FIXED_HOLIDAYS);
    // If the list only contained the old basic 10 holidays, merge in the full official Iranian holidays
    if (list.length < 20) {
      const mergedMap = new Map<string, OfficialHoliday>();
      for (const h of DEFAULT_FIXED_HOLIDAYS) {
        mergedMap.set(h.id, h);
      }
      for (const h of list) {
        mergedMap.set(h.id, h);
      }
      const updatedList = Array.from(mergedMap.values());
      await this.saveHolidays(updatedList);
      return updatedList;
    }
    return list;
  },

  async saveHolidays(holidays: OfficialHoliday[]): Promise<void> {
    await setItem(KEYS.HOLIDAYS, holidays);
  },

  async getSettings(): Promise<UserSettings> {
    return getItem<UserSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
  },

  async saveSettings(settings: UserSettings): Promise<void> {
    await setItem(KEYS.SETTINGS, settings);
  },

  /**
   * Export all data as a backup JSON object
   */
  async exportFullBackup(): Promise<string> {
    const [intervals, leaves, holidays, settings] = await Promise.all([
      this.getIntervals(),
      this.getLeaves(),
      this.getHolidays(),
      this.getSettings()
    ]);

    const backupData = {
      app: 'com.example.worktracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        intervals,
        leaves,
        holidays,
        settings
      }
    };

    return JSON.stringify(backupData, null, 2);
  },

  /**
   * Restore full backup from JSON
   */
  async importFullBackup(jsonStr: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !parsed.data) {
        return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است.' };
      }

      const { intervals, leaves, holidays, settings } = parsed.data;

      if (Array.isArray(intervals)) {
        await this.saveIntervals(intervals);
      }
      if (Array.isArray(leaves)) {
        await this.saveLeaves(leaves);
      }
      if (Array.isArray(holidays)) {
        await this.saveHolidays(holidays);
      }
      if (settings && typeof settings === 'object') {
        await this.saveSettings({ ...DEFAULT_SETTINGS, ...settings });
      }

      return { success: true, message: 'داده‌ها با موفقیت بازیابی شدند.' };
    } catch {
      return { success: false, message: 'خطا در خواندن فایل JSON. لطفا فایل معتبر انتخاب کنید.' };
    }
  }
};
