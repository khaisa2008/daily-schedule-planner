// app/actions/useScheduleMonitor.ts
"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateScheduleStatus, resetWeeklySchedules } from "@/app/actions/schedule";
import { notificationService } from "@/lib/notifications/notification.service";

export function useScheduleMonitor(userId: string | undefined) {
  const supabase = createClient();
  const triggeredNotifications = useRef<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const notificationIdCounter = useRef(0);
  const realtimeUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Request permission saat mount
    notificationService.requestPermissions();

    // 🔥 SUBSCRIBE KE REALTIME NOTIFICATIONS
    notificationService.subscribeToRealtimeNotifications(userId);

    // 🔥 Register callback untuk realtime notifications
    const unsubscribe = notificationService.onNotificationReceived((notification) => {
      console.log('📨 Real-time notification received in UI:', notification);
      
      // 📌 OPSIONAL: Update UI atau trigger efek lain
      // Misalnya, update badge counter atau show toast
    });
    realtimeUnsubscribe.current = unsubscribe;

    // 1. Buat variabel penampung untuk listener asli
    let activeListener: { remove: () => void } | null = null;

    // 2. Selesaikan promise dari addListener
    notificationService.addListener((notification) => {
      console.log('👆 Notification tapped:', notification);
      const { extra } = notification.notification;
      
      if (extra?.scheduleId && extra?.type === 'ready') {
        console.log(`🔔 User tapped ready notification for schedule: ${extra.scheduleId}`);
      }
    }).then((res) => {
      activeListener = res;
    });

    // ============ REALTIME SUBSCRIPTION SCHEDULES ============
    const channel = supabase
      .channel(`schedule-monitor-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "schedules",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("📡 Realtime schedule update detected:", payload);
          checkSchedules();
        }
      )
      .subscribe();

    const checkSchedules = async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      const curMinTotal = currentHour * 60 + currentMinute;

      const daysArray = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"];
      const currentDayIndo = daysArray[now.getDay()];

      // 1. Reset Mingguan Otomatis
      if (currentDayIndo === "senin" && curMinTotal >= 0 && curMinTotal < 5) {
        const key = `reset-${now.toDateString()}`;
        if (!triggeredNotifications.current.has(key)) {
          await resetWeeklySchedules(userId);
          triggeredNotifications.current.add(key);
        }
      }

      const { data: schedules, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("user_id", userId)
        .ilike("hari", currentDayIndo);

      if (error || !schedules) return;

      for (const schedule of schedules) {
        const [startH, startM] = schedule.jam_mulai.split(":").map(Number);
        const [endH, endM] = schedule.jam_selesai.split(":").map(Number);
        const startMinTotal = startH * 60 + startM;
        const endMinTotal = endH * 60 + endM;
        const reminderMinutes = schedule.reminder_minutes || 0;
        
        const todayKey = now.toDateString();
        const scheduleKey = schedule.id;
        const timeDiffToStart = startMinTotal - curMinTotal;
        
        const shouldExecute = currentSecond === 0;

        // A. CEK JADWAL KADALUARSA (CANCELLED)
        if (shouldExecute && curMinTotal >= endMinTotal && (schedule.status === "TODO" || schedule.status === "ONGOING")) {
          const key = `${scheduleKey}-cancelled-${todayKey}`;
          if (!triggeredNotifications.current.has(key)) {
            // Hapus notifikasi terkait
            await supabase
              .from("notifications")
              .delete()
              .eq("schedule_id", schedule.id)
              .in("title", ["Waktunya Dimulai!", "Segera Dimulai!", "Pengingat Kegiatan"])
              .eq("user_id", userId);

            if (schedule.status === "TODO") {
              const { data: existingNotif } = await supabase
                .from("notifications")
                .select("id")
                .eq("schedule_id", schedule.id)
                .eq("title", "Waktu telah melewati batas")
                .eq("user_id", userId)
                .gte("created_at", new Date(now).setHours(0, 0, 0, 0).toString());

              if (!existingNotif || existingNotif.length === 0) {
                // Insert ke database (akan trigger realtime notification)
                await supabase.from("notifications").insert({
                  user_id: userId,
                  schedule_id: schedule.id,
                  title: "Waktu telah melewati batas",
                  message: `Kegiatan "${schedule.nama_kegiatan}" telah melewati batas waktu yang ditentukan dan dibatalkan.`,
                  notification_time: new Date().toISOString(),
                  is_read: false,
                  metadata: { type: "expired" }
                });

                // 🔥 NATIVE NOTIFICATION AKAN DI-TRIGGER OLEH REALTIME
                // Tidak perlu schedule manual lagi
              }
            }

            await updateScheduleStatus(schedule.id, userId, "CANCELLED", schedule.nama_kegiatan);
            triggeredNotifications.current.add(key);
          }
        }

        // B. MONITORING REMINDER UTAMA
        if (shouldExecute && reminderMinutes > 2 && timeDiffToStart === reminderMinutes && schedule.status === "TODO") {
          const key = `${scheduleKey}-reminder-${todayKey}`;
          if (!triggeredNotifications.current.has(key)) {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("schedule_id", schedule.id)
              .eq("title", "Pengingat Kegiatan")
              .eq("user_id", userId)
              .gte("created_at", startOfDay.toISOString());

            if (!existingNotif || existingNotif.length === 0) {
              // Insert ke database (akan trigger realtime notification)
              await supabase.from("notifications").insert({
                user_id: userId,
                schedule_id: schedule.id,
                title: "🔔 Pengingat Kegiatan",
                message: `Kegiatan "${schedule.nama_kegiatan}" akan dimulai dalam ${reminderMinutes} menit.`,
                notification_time: new Date().toISOString(),
                is_read: false,
                metadata: { type: "reminder" }
              });

              // 🔥 NATIVE NOTIFICATION AKAN DI-TRIGGER OLEH REALTIME
            }
            triggeredNotifications.current.add(key);
          }
        }

        // C. MONITORING PENGINGAT 2 MENIT SEBELUM JAM MULAI
        if (shouldExecute && timeDiffToStart === 2 && schedule.status === "TODO") {
          const key = `${scheduleKey}-2min-${todayKey}`;
          if (!triggeredNotifications.current.has(key)) {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("schedule_id", schedule.id)
              .in("title", ["Segera Dimulai!", "Pengingat Kegiatan (Mendadak)"])
              .eq("user_id", userId)
              .gte("created_at", startOfDay.toISOString());

            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from("notifications").insert({
                user_id: userId,
                schedule_id: schedule.id,
                title: "⏰ Segera Dimulai!",
                message: `Kegiatan "${schedule.nama_kegiatan}" akan dimulai dalam 2 menit.`,
                notification_time: new Date().toISOString(),
                is_read: false,
                metadata: { type: "urgent" }
              });

              // 🔥 NATIVE NOTIFICATION AKAN DI-TRIGGER OLEH REALTIME
            }
            triggeredNotifications.current.add(key);
          }
        }

        // D. NOTIFIKASI WAKTUNYA DIMULAI! (DENGAN BUTTON READY)
        if (shouldExecute && curMinTotal === startMinTotal && schedule.status === "TODO") {
          const key = `${scheduleKey}-started-${todayKey}`;
          if (!triggeredNotifications.current.has(key)) {
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("schedule_id", schedule.id)
              .eq("title", "Waktunya Dimulai!")
              .eq("user_id", userId)
              .gte("created_at", startOfDay.toISOString());

            if (!existingNotif || existingNotif.length === 0) {
              await supabase.from("notifications").insert({
                user_id: userId,
                schedule_id: schedule.id,
                title: "▶️ Waktunya Dimulai!",
                message: `Kegiatan "${schedule.nama_kegiatan}" sudah memasuki waktu mulai. Silakan klik 'Ready'.`,
                notification_time: new Date().toISOString(),
                is_read: false,
                metadata: { type: "ready" }
              });

              // 🔥 NATIVE NOTIFICATION AKAN DI-TRIGGER OLEH REALTIME
            }
            triggeredNotifications.current.add(key);
          }
        }

        // E. STATUS BERUBAH DONE (OTOMATIS SELESAI)
        if (shouldExecute && curMinTotal >= endMinTotal && schedule.status === "ONGOING") {
          const key = `${scheduleKey}-done-${todayKey}`;
          if (!triggeredNotifications.current.has(key)) {
            await supabase
              .from("notifications")
              .delete()
              .eq("schedule_id", schedule.id)
              .in("title", ["Waktunya Dimulai!", "Segera Dimulai!", "Pengingat Kegiatan"])
              .eq("user_id", userId);

            await updateScheduleStatus(schedule.id, userId, "DONE", schedule.nama_kegiatan);
            
            await supabase.from("notifications").insert({
              user_id: userId,
              schedule_id: schedule.id,
              title: "✅ Kegiatan Selesai",
              message: `Kegiatan "${schedule.nama_kegiatan}" telah selesai. Selamat!`,
              notification_time: new Date().toISOString(),
              is_read: false,
              metadata: { type: "done" }
            });

            // 🔥 NATIVE NOTIFICATION AKAN DI-TRIGGER OLEH REALTIME
            triggeredNotifications.current.add(key);
          }
        }
      }
    };

    checkSchedules();
    intervalRef.current = setInterval(checkSchedules, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      supabase.removeChannel(channel);
      
      if (activeListener) {
        activeListener.remove();
      }

      // 🔥 Unsubscribe dari realtime notifications
      if (realtimeUnsubscribe.current) {
        realtimeUnsubscribe.current();
      }
      
      // 🔥 Unsubscribe dari channel realtime
      notificationService.unsubscribeFromRealtime();
    };
  }, [userId, supabase]);
}