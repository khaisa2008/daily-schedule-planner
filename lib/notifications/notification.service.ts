// lib/notifications/notification.service.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  private static instance: NotificationService;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // Request permission
  async requestPermissions() {
    if (!Capacitor.isNativePlatform()) return true;
    
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  }

  // Schedule notification
  async scheduleNotification(params: {
    id: number;
    title: string;
    body: string;
    scheduleTime: Date;
    scheduleId?: string;
    extra?: any;
  }) {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Native notification:', params);
      return;
    }

    const now = new Date();
    const timeDiff = params.scheduleTime.getTime() - now.getTime();
    
    // Jika waktu sudah lewat, jadwalkan untuk sekarang
    const triggerTime = timeDiff > 0 ? params.scheduleTime : new Date(now.getTime() + 1000);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: params.id,
          title: params.title,
          body: params.body,
          schedule: { at: triggerTime },
          extra: {
            scheduleId: params.scheduleId,
            type: params.extra?.type || 'reminder'
          },
          sound: 'default',
          actionTypeId: 'OPEN_ACTIVITY',
          smallIcon: 'ic_notification', // ✅ Diperbaiki dari 'icon' ke 'smallIcon'
        }
      ]
    });

    console.log(`✅ Notification scheduled: ${params.title}`);
  }

  // Cancel notification
  async cancelNotification(notificationId: number) {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    if (!Capacitor.isNativePlatform()) return;
    
    // ✅ Diperbaiki: Ambil semua yang pending, lalu cancel sekaligus
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  }

  // Get pending notifications
  async getPendingNotifications() {
    if (!Capacitor.isNativePlatform()) return [];
    const result = await LocalNotifications.getPending();
    return result.notifications;
  }

  // Listen for notification actions (when user taps notification)
  // ✅ Diperbaiki: Ditambahkan async agar type return-nya cocok saat memakai await
  async addListener(callback: (notification: any) => void) {
    if (!Capacitor.isNativePlatform()) {
      return { remove: () => {} };
    }

    // ✅ Diperbaiki: Tambahkan await sebelum LocalNotifications
    return await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('🔔 Notification action performed:', notification);
      callback(notification);
    });
  }
}

export const notificationService = NotificationService.getInstance();