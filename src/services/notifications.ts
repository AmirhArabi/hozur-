/**
 * Local Notifications Service
 * Handles departure reminders using @capacitor/local-notifications
 * Supports Android 13+ POST_NOTIFICATIONS permission requests.
 */

import { LocalNotifications } from '@capacitor/local-notifications';

const NOTIFICATION_ID = 1001;

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
      // In web browser or mock environment
      if ('Notification' in window) {
        const webPermission = await Notification.requestPermission();
        if (webPermission === 'granted') {
          return { granted: true };
        }
        return {
          granted: false,
          message: 'مجوز اعلان در مرورگر تایید نشد.'
        };
      }
      return { granted: true }; // Fallback silent
    }
  },

  /**
   * Schedule departure reminder at target timestamp
   */
  async scheduleDepartureReminder(targetDate: Date, title: string, body: string): Promise<boolean> {
    try {
      // Cancel previous notification
      await this.cancelReminder();

      if (targetDate.getTime() <= Date.now()) {
        // Target is already in past
        return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: NOTIFICATION_ID,
            schedule: { at: targetDate },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });

      return true;
    } catch {
      return false;
    }
  },

  /**
   * Cancel any scheduled departure reminder
   */
  async cancelReminder(): Promise<void> {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: NOTIFICATION_ID }]
      });
    } catch {
      // Ignore
    }
  }
};
