// components/ScheduleCard.tsx
"use client";

import { Tables } from "@/types/supabase/database";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DeleteConfirmPopup } from "@/components/DeleteConfirmPopup";

type Schedule = Tables<"schedules">;

interface ScheduleCardProps {
  schedule: Schedule;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (scheduleId: string, newStatus: string) => void;
  isDeleting?: boolean;
  index: number;
  total: number;
}

export function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onStatusChange,
  isDeleting = false,
  index,
  total,
}: ScheduleCardProps) {
  const supabase = createClient();
  const [isReadyLoading, setIsReadyLoading] = useState(false);
  const [isReadyClicked, setIsReadyClicked] = useState(schedule.status === "ONGOING");
  const [currentStatus, setCurrentStatus] = useState(schedule.status);
  
  // State untuk popup delete
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);

  // 1. REALTIME SUBSCRIPTION EFFECT
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-schedule-${schedule.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "schedules",
          filter: `id=eq.${schedule.id}`,
        },
        (payload) => {
          const updatedSchedule = payload.new as Schedule;
          console.log(`📡 Schedule ${schedule.id} updated:`, updatedSchedule.status);
          
          setCurrentStatus(updatedSchedule.status);
          
          if (updatedSchedule.status === "ONGOING") {
            setIsReadyClicked(true);
          } else if (updatedSchedule.status === "TODO") {
            setIsReadyClicked(false);
          } else if (updatedSchedule.status === "CANCELLED") {
            setIsReadyClicked(false);
          } else if (updatedSchedule.status === "DONE") {
            setIsReadyClicked(true);
          }

          if (onStatusChange) {
            onStatusChange(updatedSchedule.id, updatedSchedule.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schedule.id, onStatusChange, supabase]);

  // Efek sinkronisasi manual
  useEffect(() => {
    setCurrentStatus(schedule.status);
    setIsReadyClicked(schedule.status === "ONGOING");
  }, [schedule.status]);

  // Format waktu
  const formatTime12h = (timeString: string) => {
    if (!timeString) return "";
    const [hoursStr, minutesStr] = timeString.split(":");
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHours.toString().padStart(2, "0")}:${minutesStr.padStart(2, "0")} ${ampm}`;
  };

  // Cek apakah sekarang sudah melewati jam_mulai
  const isNowAfterStart = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const curMinTotal = currentHour * 60 + currentMinute + (currentSecond / 60);

    const [startHours, startMinutes] = schedule.jam_mulai.split(":").map(Number);
    const startMinTotal = startHours * 60 + startMinutes;

    return curMinTotal >= startMinTotal && currentStatus === "TODO";
  };

  // Cek apakah sekarang sudah melewati jam_selesai
  const isNowAfterEnd = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    const curMinTotal = currentHour * 60 + currentMinute + (currentSecond / 60);

    const [endHours, endMinutes] = schedule.jam_selesai.split(":").map(Number);
    const endMinTotal = endHours * 60 + endMinutes;

    return curMinTotal >= endMinTotal;
  };

  // Handler untuk tombol READY
  const handleReady = async () => {
    if (isReadyLoading || isReadyClicked) return;

    setIsReadyLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("schedules")
        .update({ 
          status: "ONGOING" as Schedule["status"],
          updated_at: new Date().toISOString()
        })
        .eq("id", schedule.id)
        .eq("user_id", schedule.user_id);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase
        .from("notifications")
        .delete()
        .eq("schedule_id", schedule.id)
        .in("title", ["Waktunya Dimulai!", "Segera Dimulai!"])
        .eq("user_id", schedule.user_id);

      if (deleteError) throw deleteError;

      setIsReadyClicked(true);
      setCurrentStatus("ONGOING");
      
      if (onStatusChange) {
        onStatusChange(schedule.id, "ONGOING");
      }

      console.log(`✅ Schedule ${schedule.nama_kegiatan} berhasil diubah menjadi ONGOING`);
    } catch (error) {
      console.error("❌ Gagal mengupdate status:", error);
    } finally {
      setIsReadyLoading(false);
    }
  };

  // Handler untuk delete dengan popup
  const handleDeleteClick = () => {
    setShowDeletePopup(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeletingLocal(true);
    try {
      await onDelete(schedule.id);
      setShowDeletePopup(false);
    } catch (error) {
      console.error("❌ Gagal menghapus:", error);
    } finally {
      setIsDeletingLocal(false);
    }
  };

  const handleClosePopup = () => {
    if (!isDeletingLocal) {
      setShowDeletePopup(false);
    }
  };

  // Gunakan currentStatus untuk semua pengecekan
  const isOngoing = currentStatus === "ONGOING";
  const isTodo = currentStatus === "TODO";
  const isCancelled = currentStatus === "CANCELLED";
  const isDone = currentStatus === "DONE";

  // Styling functions
  const getCategoryStyles = (category?: string | null) => {
    switch (category?.toUpperCase()) {
      case "WORK":
        return "bg-blue-50 text-blue-600";
      case "STUDY":
        return "bg-purple-50 text-purple-600";
      case "HEALTH":
        return "bg-indigo-50 text-indigo-600";
      case "PERSONAL":
        return "bg-green-50 text-green-600";
      case "SOCIAL":
        return "bg-pink-50 text-pink-600";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const getPriorityStyles = (priority?: string | null) => {
    switch (priority?.toUpperCase()) {
      case "HIGH":
        return "bg-red-500 text-white";
      case "MEDIUM":
        return "bg-indigo-500 text-white";
      case "LOW":
        return "bg-yellow-300 text-white";
      default:
        return null;
    }
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;
  const priorityStyle = getPriorityStyles(schedule.priority);

  // Tentukan apakah tombol READY ditampilkan
  const showReadyButton = isTodo && isNowAfterStart() && !isNowAfterEnd();

  // Tentukan apakah tombol edit/delete ditampilkan
  const showEditDelete = (!showReadyButton || isNowAfterEnd()) && (isTodo || isCancelled || isDone);

  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  return (
    <>
      <div className="flex items-start group relative pl-10 pb-5">
        {/* LINE TOP */}
        {!isFirst && (
          <div className="absolute left-3 top-0 w-0.5 h-10 bg-indigo-100" />
        )}

        {/* LINE BOTTOM */}
        {!isLast && (
          <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-indigo-100" />
        )}

        {/* DOT */}
        <div
        onClick={() => setIsTooltipOpen(!isTooltipOpen)}
        className={`absolute left-3 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center bg-white z-10 border-2 cursor-pointer top-10 transition-all ${
          isOngoing ? "border-indigo-700 shadow-sm" : 
          isCancelled ? "border-red-500" :
          isDone ? "border-green-500" :
          "border-indigo-400"
        }`}
      >
        {/* Backdrop transparan khusus untuk mendeteksi klik di luar DOT agar tooltip menutup kembali */}
        {isTooltipOpen && (
          <div 
            className="fixed inset-0 z-20 cursor-default" 
            onClick={(e) => {
              e.stopPropagation(); // Mencegah trigger onClick milik DOT berjalan ulang
              setIsTooltipOpen(false);
            }}
          />
        )}

        {/* TOOLTIP STATUS */}
        {currentStatus && (
          /* 3. Mengubah class opacity & scale berdasarkan state `isTooltipOpen` alih-alih group-hover */
          <div className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-xs font-bold px-3 py-1.5 rounded-lg border shadow-xl transition-all duration-200 z-30 flex items-center gap-2 ${
            isTooltipOpen 
              ? "opacity-100 scale-100 pointer-events-auto" 
              : "opacity-0 scale-95 pointer-events-none"
          } ${
            isOngoing ? "text-indigo-600 border-indigo-100" :
            isCancelled ? "text-red-600 border-red-100" :
            isDone ? "text-green-600 border-green-100" :
            "text-indigo-600 border-indigo-100"
          }`}>
            <span
              className={`w-2 h-2 rounded-full ${
                isOngoing ? "bg-indigo-600 animate-pulse" : 
                isCancelled ? "bg-red-500" :
                isDone ? "bg-green-500" :
                "bg-indigo-600"
              }`}
            />
            <span
              className={`uppercase tracking-wider ${isOngoing ? "animate-pulse" : ""}`}
            >
              {isOngoing ? "NOW" : currentStatus}
            </span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white drop-shadow-[0_1px_0_rgba(224,231,255,1)]" />
          </div>
        )}

        {/* Bulatan Inti DOT */}
        <div
          className={`w-2 h-2 rounded-full transition-transform ${isTooltipOpen ? "scale-125" : ""} ${
            isOngoing ? "bg-indigo-700" : 
            isCancelled ? "bg-red-500" :
            isDone ? "bg-green-500" :
            "bg-indigo-400"
          }`}
        />
      </div>

        {/* CARD */}
        <div
          className={`group relative flex w-full flex-col justify-between rounded-2xl border bg-white p-4 sm:p-5 lg:p-6 transition-all duration-300 ${
            isOngoing
              ? "border-indigo-400 shadow-md ring-3 ring-indigo-100 border-[2px]"
              : "border-gray-200 border-l-[4px] sm:border-l-[5px] border-l-indigo-600 shadow-sm hover:shadow-lg"
          }`}
        >
          {/* PRIORITY BADGE */}
          {priorityStyle && (
            <span
              className={`absolute -top-3 left-2 text-[11px] font-extrabold tracking-wider px-4 py-1 rounded-md uppercase shadow-sm ${priorityStyle}`}
            >
              {schedule.priority}
            </span>
          )}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {/* TIME + BADGES */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-sm font-bold text-indigo-600">
                  {formatTime12h(schedule.jam_mulai)} -{" "}
                  {formatTime12h(schedule.jam_selesai)}
                </span>

                {/* CATEGORY BADGE */}
                {schedule.kategori && (
                  <span
                    className={`text-[11px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-md uppercase ${getCategoryStyles(schedule.kategori)}`}
                  >
                    {schedule.kategori}
                  </span>
                )}
              </div>

              {/* TITLE */}
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                {schedule.nama_kegiatan}
              </h3>

              {/* NOTE */}
              {schedule.catatan && (
                <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">
                  {schedule.catatan}
                </p>
              )}

              {/* REMINDER MINUTES */}
              {schedule.reminder_minutes !== undefined &&
                schedule.reminder_minutes !== null && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-max mt-1">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <span>{schedule.reminder_minutes} Minutes</span>
                  </div>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex space-x-1 bg-white/90 backdrop-blur-sm pl-2 pt-2 rounded-xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
              {/* Tombol READY */}
              {showReadyButton && !isReadyClicked && (
                <button
                  onClick={handleReady}
                  disabled={isReadyLoading}
                  className="relative inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  title="Ready"
                >
                  {isReadyLoading ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg 
                        className="w-4 h-4 fill-current text-white" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Ready
                    </span>
                  )}
                </button>
              )}

              {/* Tombol "Sudah di Click" */}
              {isReadyClicked && (
                <span className="p-2 text-gray-400 bg-gray-100 rounded-xl text-xs font-medium flex items-center">
                  ✓ Button Sudah DiClick
                </span>
              )}

              {/* Tombol Edit & Delete */}
              {showEditDelete && !isReadyClicked && (
                <>
                  <button
                    onClick={() => onEdit(schedule)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Edit"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  <button
                    onClick={handleDeleteClick}
                    disabled={isDeleting || isDeletingLocal}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM POPUP */}
      <DeleteConfirmPopup
        isOpen={showDeletePopup}
        onClose={handleClosePopup}
        onConfirm={handleConfirmDelete}
        scheduleName={schedule.nama_kegiatan}
        isDeleting={isDeletingLocal}
      />
    </>
  );
}