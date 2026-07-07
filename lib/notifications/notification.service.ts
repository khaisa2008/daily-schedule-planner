// lib/notifications/notification.service.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';

export class NotificationService {
  private static instance: NotificationService;
  private supabase = createClient();
  private realtimeChannel: any = null;
  private notificationCallbacks: ((notification: any) => void)[] = [];
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  // 🔥 TAMBAHKAN: Subscribe ke realtime notifications
  async subscribeToRealtimeNotifications(userId: string) {
    // Unsubscribe dari channel sebelumnya jika ada
    if (this.realtimeChannel) {
      await this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    console.log('📡 Subscribing to realtime notifications for user:', userId);

    this.realtimeChannel = this.supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log('📨 New notification received:', payload);
          const notification = payload.new;
          
          // 🔥 Trigger native notification popup
          await this.showNativeNotification(notification);
          
          // 🔥 Trigger semua callback yang terdaftar
          this.notificationCallbacks.forEach(callback => {
            callback(notification);
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime notifications');
        }
      });

    return this.realtimeChannel;
  }

  // 🔥 TAMBAHKAN: Tampilkan native notification popup
  private async showNativeNotification(notification: any) {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Native notification popup:', notification);
      return;
    }

    try {
      // Tampilkan notifikasi popup seperti WhatsApp
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now() + Math.random() * 1000,
            title: notification.title || 'Notifikasi Baru',
            body: notification.message || 'Anda memiliki notifikasi baru',
            schedule: { at: new Date(Date.now() + 500) }, // Tampilkan segera
            extra: {
              notificationId: notification.id,
              scheduleId: notification.schedule_id,
              type: notification.metadata?.type || 'general'
            },
            sound: 'default',
            actionTypeId: 'OPEN_ACTIVITY',
            smallIcon: 'ic_notification'
          }
        ]
      });
      
      console.log('✅ Native notification shown:', notification.title);
    } catch (error) {
      console.error('❌ Failed to show native notification:', error);
    }
  }

  // 🔥 TAMBAHKAN: Register callback untuk realtime notifications
  onNotificationReceived(callback: (notification: any) => void) {
    this.notificationCallbacks.push(callback);
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(
        cb => cb !== callback
      );
    };
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
          smallIcon: 'ic_notification',
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
  async addListener(callback: (notification: any) => void) {
    if (!Capacitor.isNativePlatform()) {
      return { remove: () => {} };
    }

    return await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      console.log('🔔 Notification action performed:', notification);
      callback(notification);
    });
  }

  // 🔥 TAMBAHKAN: Unsubscribe dari realtime
  unsubscribeFromRealtime() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      console.log('📡 Unsubscribed from realtime notifications');
    }
  }
}

export const notificationService = NotificationService.getInstance();