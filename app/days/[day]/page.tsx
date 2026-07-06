// app/days/[day]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ScheduleCard } from "@/components/ScheduleCard";
import { ScheduleModal } from "@/components/ScheduleModal";
import { Navbar } from "@/components/Navbar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Tables } from "@/types/supabase/database";
import { getSchedulesByDay, deleteSchedule } from "@/app/actions/schedule";
import { ClipboardList } from "lucide-react";
import { DeleteConfirmPopup } from "@/components/DeleteConfirmPopup";

type Schedule = Tables<"schedules">;

export type DayOfWeek =
  | "Senin"
  | "Selasa"
  | "Rabu"
  | "Kamis"
  | "Jumat"
  | "Sabtu"
  | "Minggu";

// Hanya definisikan sekali di luar komponen
const dayMap: Record<string, string> = {
  Senin: "Monday",
  Selasa: "Tuesday",
  Rabu: "Wednesday",
  Kamis: "Thursday",
  Jumat: "Friday",
  Sabtu: "Saturday",
  Minggu: "Sunday",
};

export default function DayPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const rawDay = params.day as string;
  const day = (
    rawDay ? rawDay.charAt(0).toUpperCase() + rawDay.slice(1).toLowerCase() : ""
  ) as DayOfWeek;

  const displayDay = dayMap[day] ?? day;

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null,
  );
  
  // State untuk delete popup
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePopupOpen, setDeletePopupOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [scheduleNameToDelete, setScheduleNameToDelete] = useState<string>("");

  useEffect(() => {
    const validDays = [
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
      "Minggu",
    ];

    if (day && !validDays.includes(day)) {
      router.push("/dashboard");
      return;
    }

    if (day) {
      checkUserAndLoadSchedules();
    }
  }, [day]);

  const checkUserAndLoadSchedules = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);
      await loadSchedules();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await getSchedulesByDay(day);
      setSchedules(data || []);
    } catch (error) {
      console.error("Error loading schedules:", error);
    }
  };

  // Handler untuk update status schedule
  const handleStatusChange = (
    scheduleId: string, 
    newStatus: string
  ) => {
    setSchedules(prevSchedules => 
      prevSchedules.map(schedule => 
        schedule.id === scheduleId 
          ? { ...schedule, status: newStatus as Schedule["status"] }
          : schedule
      )
    );
  };

  const handleAddSchedule = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

// Handler untuk delete dengan popup - PERBAIKAN
const handleDeleteClick = (id: string, name: string) => {
  // Reset state terlebih dahulu
  setScheduleToDelete(null);
  setScheduleNameToDelete("");
  
  // Set state baru
  setScheduleToDelete(id);
  setScheduleNameToDelete(name);
  setDeletePopupOpen(true);
};

const handleConfirmDelete = async () => {
  // Cek apakah ada schedule yang akan dihapus
  if (!scheduleToDelete) return;

  // Cegah double click
  if (isDeleting) return;

  setIsDeleting(true);
  try {
    await deleteSchedule(scheduleToDelete, day);
    await loadSchedules();
    
    // Tutup popup dan reset state
    setDeletePopupOpen(false);
    setScheduleToDelete(null);
    setScheduleNameToDelete("");
  } catch (error) {
    console.error("Error deleting schedule:", error);
    // Tampilkan error toast atau notifikasi
  } finally {
    setIsDeleting(false);
  }
};

const handleCloseDeletePopup = () => {
  // Hanya tutup jika tidak sedang deleting
  if (!isDeleting) {
    setDeletePopupOpen(false);
    setScheduleToDelete(null);
    setScheduleNameToDelete("");
  }
};


  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleScheduleSaved = async () => {
    await loadSchedules();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <button
              onClick={() => router.push("/dashboard")}
              className="mb-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </button>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 break-words">
              Schedule for {displayDay}
            </h1>

            <p className="mt-1 text-sm sm:text-base text-gray-600">
              {schedules.length} scheduled activities
            </p>
          </div>

          <button
            onClick={handleAddSchedule}
            className="flex w-full sm:w-auto items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Activity
          </button>
        </div>

        {schedules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">
              <ClipboardList className="w-16 h-16 text-indigo-600 mx-auto" />
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No activities scheduled for today
            </h3>

            <p className="text-gray-600 mb-4">
              Click "Add Activity" to start creating your schedule
            </p>

            <button
              onClick={handleAddSchedule}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Add Activity
            </button>
          </div>
        ) : (
          <div>
            {schedules.map((schedule, index) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                index={index}
                total={schedules.length}
                onEdit={handleEditSchedule}
                onDelete={(id) => handleDeleteClick(id, schedule.nama_kegiatan)}
                onStatusChange={handleStatusChange}
                isDeleting={isDeleting && scheduleToDelete === schedule.id}
              />
            ))}
          </div>
        )}
      </main>

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        day={day}
        schedule={selectedSchedule}
        onSaved={handleScheduleSaved}
      />

      {/* Delete Confirmation Popup */}
      <DeleteConfirmPopup
        isOpen={deletePopupOpen}
        onClose={handleCloseDeletePopup}
        onConfirm={handleConfirmDelete}
        scheduleName={scheduleNameToDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}