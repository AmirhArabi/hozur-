/**
 * Local Notifications Service
 * Handles entry reminders and local notifications using @capacitor/local-notifications
 * Supports Android 13+ POST_NOTIFICATIONS permission requests and web fallbacks.
 */

import { LocalNotifications } from '@capacitor/local-notifications';

const DEPARTURE_NOTIFICATION_ID = 1001;
const ENTRY_NOTIFICATION_ID = 2001;

export const NotificationService = {
  /**
   * Request notification permission (critical for Android 13+)
   */
  async requestPermission(): Promise<{ granted: boolean; message?: string }> {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return { granted: true };
      }

      const req = await LocalNotifications.requestPermissions();
      if (req.display === 'granted') {
        return { granted: true };
      } else {
        return {
          granted: false,
          message: 'مجوز اعلان‌ها داده نشد. برای فعال‌سازی یادآوری، از تنظیمات گوشی مجوز اعلان را فعال کنید.'
        };
      }
    } catch {
      // In web browser environment
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const webPermission = await Notification.requestPermission();
          if (webPermission === 'granted') {
            return { granted: true };
          }
          return {
            granted: false,
            message: 'مجوز اعلان در مرورگر تایید نشد.'
          };
        } catch {
          return { granted: false, message: 'خطا در درخواست مجوز اعلان مرورگر.' };
        }
      }
      return { granted: true }; // Fallback silent
    }
  },

  /**
   * Schedule daily entry reminder
   * Reminds user if they haven't registered an entry by the designated time
   */
  async scheduleEntryReminder(
    timeHHMM: string,
    title = 'یادآوری ثبت ورود | hozur',
    body = 'ساعت کاری امروز شما آغاز شده است؛ لطفاً ورود خود را در برنامه hozur ثبت کنید.'
  ): Promise<boolean> {
    try {
      await this.cancelEntryReminder();

      const [hoursStr, minutesStr] = timeHHMM.split(':');
      const targetHours = parseInt(hoursStr, 10) || 9;
      const targetMinutes = parseInt(minutesStr, 10) || 0;

      const now = new Date();
      const targetDate = new Date();
      targetDate.setHours(targetHours, targetMinutes, 0, 0);

      // If scheduled time for today has already passed, schedule for tomorrow
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: ENTRY_NOTIFICATION_ID,
            schedule: {
              at: targetDate,
              repeats: true,
              every: 'day'
            },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: { type: 'entry_reminder' }
          }
        ]
      });

      return true;
    } catch {
      // Web notification fallback for active tab
      return false;
    }
  },

  /**
   * Cancel scheduled entry reminder
   */
  async cancelEntryReminder(): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: ENTRY_NOTIFICATION_ID }]
      });
    } catch {
      // Ignore
    }
  },

  /**
   * Send an immediate test notification to verify device compatibility
   */
  async sendTestNotification(
    title = 'آزمایش اعلان hozur',
    body = 'سیستم اعلان‌ها فعال است و یادآوری ثبت ورود به درستی کار خواهد کرد.'
  ): Promise<boolean> {
    try {
      const perm = await this.requestPermission();
      if (!perm.granted) return false;

      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: 9999,
              schedule: { at: new Date(Date.now() + 1500) },
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }
          ]
        });
        return true;
      } catch {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body, icon: './icon.png' });
          return true;
        }
        return false;
      }
    } catch {
      return false;
    }
  },

  /**
   * Cancel legacy departure reminder if still registered
   */
  async cancelDepartureReminder(): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: DEPARTURE_NOTIFICATION_ID }]
      });
    } catch {
      // Ignore
    }
  }
};
