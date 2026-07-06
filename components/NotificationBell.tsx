// components/NotificationBell.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  CheckCircle,
  Play,
  Check,
  Eye,
  X,
} from "lucide-react";
import { updateScheduleStatus } from "@/app/actions/schedule";

export function NotificationBell({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readyClicked, setReadyClicked] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Memisahkan fungsi fetch agar reusable dan aman dimasukkan ke dependency array
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    const { data: notifData, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("notification_time", { ascending: false })
      .limit(20);

    if (notifError) {
      console.error("Error fetching notifications:", notifError);
      return;
    }

    if (notifData && notifData.length > 0) {
      const scheduleIds = notifData
        .map((n) => n.schedule_id)
        .filter((id) => id !== null && id !== undefined);

      if (scheduleIds.length > 0) {
        const { data: schedulesData, error: schedError } = await supabase
          .from("schedules")
          .select("id, status, nama_kegiatan, jam_mulai, jam_selesai")
          .in("id", scheduleIds);

        if (!schedError && schedulesData) {
          const mergedData = notifData.map((notif) => ({
            ...notif,
            schedules:
              schedulesData.find((s) => s.id === notif.schedule_id) || null,
          }));
          setNotifications(mergedData);
          return;
        }
      }
      setNotifications(notifData);
    } else {
      setNotifications([]);
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (!userId) return;

    // Ambil data awal saat mount
    fetchNotifications();

    // Setup realtime channel
    const channel = supabase
      .channel("navbar-realtime-sync")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen ke INSERT, UPDATE, dan DELETE
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Realtime notification event:", payload.eventType);
          // Panggil fetch ulang agar data schedule otomatis tergabung dengan benar dan state diperbarui secara realtime
          await fetchNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "schedules",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchNotifications();
        }
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsReadSingle = async (notifId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notifId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
      );
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  // FUNGSI: Cek apakah dalam rentang waktu mulai-selesai
  const isWithinTimeRange = (notification: any) => {
    if (!notification.schedules) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const curMinTotal = currentHour * 60 + currentMinute;

    const startTime = notification.schedules.jam_mulai?.split(":");
    const endTime = notification.schedules.jam_selesai?.split(":");

    if (!startTime || !endTime) return false;

    const startMinTotal = Number(startTime[0]) * 60 + Number(startTime[1]);
    const endMinTotal = Number(endTime[0]) * 60 + Number(endTime[1]);

    return curMinTotal >= startMinTotal && curMinTotal <= endMinTotal;
  };

  // FUNGSI: Cek apakah sudah melewati jam selesai
  const isAfterEndTime = (notification: any) => {
    if (!notification.schedules) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const curMinTotal = currentHour * 60 + currentMinute;

    const endTime = notification.schedules.jam_selesai?.split(":");
    if (!endTime) return false;

    const endMinTotal = Number(endTime[0]) * 60 + Number(endTime[1]);

    return curMinTotal > endMinTotal;
  };

  // FUNGSI: Handle action READY
  const handleReadyClick = async (notification: any) => {
    setReadyClicked((prev) => new Set(prev).add(notification.id));

    await updateScheduleStatus(
      notification.schedule_id,
      userId,
      "ONGOING",
      notification.schedules?.nama_kegiatan || "Kegiatan",
    );

    await supabase
      .from("notifications")
      .update({
        is_read: true,
        metadata: { ready_clicked: true, clicked_at: new Date().toISOString() },
      })
      .eq("id", notification.id);

    const { data: updatedNotif } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification.id)
      .single();

    if (updatedNotif) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, ...updatedNotif } : n,
        ),
      );
    }

    setIsOpen(false);
  };

  // FUNGSI: Hapus notifikasi manual
  const deleteNotification = async (notifId: string) => {
    await supabase.from("notifications").delete().eq("id", notifId);
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
  };

  // FUNGSI: Cek apakah ready button sudah diklik
  const isReadyClicked = (notification: any) => {
    return (
      readyClicked.has(notification.id) ||
      notification.metadata?.ready_clicked === true
    );
  };

  const formatNotificationTime = (isoString: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);

    const timeFormatter = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const dateFormatter = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
    });

    return `${timeFormatter.format(date)} • ${dateFormatter.format(date)}`;
  };

  // FUNGSI: Cek apakah notifikasi expired
  const isNotificationExpired = (notification: any) => {
    if (!notification.schedules) return false;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const curMinTotal = currentHour * 60 + currentMinute;

    const endTime = notification.schedules.jam_selesai?.split(":");
    if (!endTime) return false;

    const endMinTotal = Number(endTime[0]) * 60 + Number(endTime[1]);

    return curMinTotal > endMinTotal;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all focus:outline-none shadow-sm"
      >
        <Bell className="h-[19px] w-[19px] text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl border border-indigo-200 shadow-2xl z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <span className="font-bold text-xs text-gray-700 tracking-wider uppercase">
                Notifikasi ({unreadCount} baru)
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5 text-indigo-600" /> Baca semua
                  </button>
                )}
              </div>
            </div>

            <div
              className="max-h-96 overflow-y-auto divide-y divide-gray-100 
              [&::-webkit-scrollbar]:w-1.5 
              [&::-webkit-scrollbar-track]:bg-transparent 
              [&::-webkit-scrollbar-thumb]:bg-indigo-400 
              [&::-webkit-scrollbar-thumb]:rounded-full 
              hover:[&::-webkit-scrollbar-thumb]:bg-indigo-500 
              [scrollbar-width:thin] 
              [scrollbar-color:#4f46e5_transparent]"
            >
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Bell className="h-6 w-6 text-gray-300" />
                  <span>Tidak ada notifikasi baru</span>
                </div>
              ) : (
                notifications.map((notif) => {
                  // Jika data schedule belum ter-fetch (sedang loading/realtime sync), tunda eksekusi filter destruktif
                  if (!notif.schedules && notif.schedule_id) {
                    return null; 
                  }

                  // CEK: Apakah notifikasi expired (Mati jika melewati jam selesai)
                  if (
                    isNotificationExpired(notif) &&
                    notif.schedules?.status === "TODO" &&
                    notif.metadata?.type === "ready"
                  ) {
                    deleteNotification(notif.id);
                    return null;
                  }

                  const isReadyNotification =
                    notif.schedule_id &&
                    notif.metadata?.type === "ready" &&
                    notif.schedules?.status === "TODO";

                  const isWithinRange = isWithinTimeRange(notif);
                  const isAfterEnd = isAfterEndTime(notif);
                  const hasBeenClicked = isReadyClicked(notif);

                  // 1. KONDISI: Jika tombol READY sudah diklik
                  if (isReadyNotification && hasBeenClicked) {
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 text-sm transition-all flex gap-3 items-start relative group ${
                          !notif.is_read
                            ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="p-1.5 bg-green-100 rounded-lg shrink-0 mt-0.5">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-semibold leading-snug text-green-700">
                            {notif.title} 
                          </p>
                          <p className="text-gray-600 text-xs mt-1 leading-relaxed break-words">
                            {notif.message}
                          </p>

                          <div className="mt-2 p-2 bg-green-100/50 rounded-lg border border-green-200">
                            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-700" />
                              Button READY sudah di klik ✓
                            </p>
                          </div>

                          <span className="block text-[10px] text-gray-400 font-medium mt-2">
                            {formatNotificationTime(notif.notification_time)}
                          </span>
                        </div>

                        <button
                          onClick={() => deleteNotification(notif.id)}
                          title="Hapus notifikasi"
                          className="absolute right-3 top-4 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                        >
                          <X className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    );
                  }

                  // 2. KONDISI: Jika sudah melewati jam selesai tapi belum diklik
                  if (isReadyNotification && isAfterEnd && !hasBeenClicked) {
                    deleteNotification(notif.id);
                    if (notif.schedule_id) {
                      updateScheduleStatus(
                        notif.schedule_id,
                        userId,
                        "CANCELLED",
                        notif.schedules?.nama_kegiatan || "Kegiatan"
                      );
                    }
                    return null;
                  }

                  // 3. KONDISI: Tampilkan tombol READY jika dalam rentang waktu aktif
                  if (isReadyNotification && isWithinRange && !hasBeenClicked) {
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 text-sm transition-all flex gap-3 items-start relative group ${
                          !notif.is_read
                            ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                          <Play className="h-4 w-4 text-indigo-600" />
                        </div>

                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-semibold leading-snug text-indigo-950">
                            {notif.title}
                          </p>
                          <p className="text-gray-600 text-xs mt-1 leading-relaxed break-words">
                            {notif.message}
                          </p>

                          <span className="block text-[10px] text-gray-400 font-medium mt-2">
                            {formatNotificationTime(notif.notification_time)}
                          </span>

                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleReadyClick(notif)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                              <Play className="h-3 w-3 text-white fill-current" />{" "}
                              <span>Ready</span>
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteNotification(notif.id)}
                          title="Hapus notifikasi"
                          className="absolute right-3 top-4 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                        >
                          <X className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-600" />
                        </button>
                      </div>
                    );
                  }

                  // 4. KONDISI: Notifikasi standar / tipe lainnya
                  return (
                    <div
                      key={notif.id}
                      className={`p-4 text-sm transition-all flex gap-3 items-start relative group ${
                        !notif.is_read
                          ? "bg-indigo-50/40 hover:bg-indigo-50/70"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0 mt-0.5">
                        <Bell className="h-4 w-4 text-indigo-600" />
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs font-semibold leading-snug text-gray-700">
                          {notif.title}
                        </p>
                        <p className="text-gray-600 text-xs mt-1 leading-relaxed break-words">
                          {notif.message}
                        </p>

                        <span className="block text-[10px] text-gray-400 font-medium mt-2">
                          {formatNotificationTime(notif.notification_time)}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteNotification(notif.id)}
                        title="Hapus notifikasi"
                        className="absolute right-3 top-4 p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all focus:outline-none"
                      >
                        <X className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-600" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}