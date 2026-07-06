"use client";

import { useState, useEffect, useRef } from "react";
import { Tables } from "@/types/supabase/database";
import { createSchedule, updateSchedule } from "@/app/actions/schedule";
import {
  X,
  Type,
  Clock,
  FileText,
  Sparkles,
  Save,
  ChevronDown,
} from "lucide-react";

type Schedule = Tables<"schedules">;

export type DayOfWeek =
  | "Senin"
  | "Selasa"
  | "Rabu"
  | "Kamis"
  | "Jumat"
  | "Sabtu"
  | "Minggu";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayOfWeek;
  schedule?: Schedule | null;
  onSaved: () => void;
}

// Definisikan tipe untuk form data
interface FormData {
  nama_kegiatan: string;
  jam_mulai: string;
  jam_selesai: string;
  kategori: Schedule["kategori"] | "";
  priority: Schedule["priority"] | "";
  status: Schedule["status"];
  reminder_minutes: number;
  catatan: string;
}

// Opsi reminder dalam menit
const REMINDER_OPTIONS = [
  { label: "10 Minutes", value: 10 },
  { label: "15 Minutes", value: 15 },
  { label: "30 Minutes", value: 30 },
  { label: "45 Minutes", value: 45 },
  { label: "60 Minutes", value: 60 },
];

// **KOMPONEN TimePicker dengan Custom Scrollbar**
interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
}

function TimePicker({
  value,
  onChange,
  label,
  icon,
  required,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMinute, setSelectedMinute] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate time options
  const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0"),
  );

  const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0"),
  );

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setSelectedHour(h || "08");
      setSelectedMinute(m || "00");
    } else {
      setSelectedHour("08");
      setSelectedMinute("00");
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTimeSelect = (hour: string, minute: string) => {
    const timeString = `${hour}:${minute}`;
    setSelectedHour(hour);
    setSelectedMinute(minute);
    onChange(timeString);
    setIsOpen(false);
  };

  const formatDisplayTime = (time: string) => {
    if (!time) return "Select time";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        {icon}
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all flex items-center justify-between hover:bg-indigo-50/50"
        >
          <span className="font-medium">{formatDisplayTime(value)}</span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex h-[280px]">
              {/* Hour Column */}
              <div className="flex-1 border-r border-slate-100">
                <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hour
                  </span>
                </div>
                {/* Custom scrollbar untuk hour */}
                <div className="overflow-y-auto h-[240px] scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-transparent hover:scrollbar-thumb-indigo-500">
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => {
                        handleTimeSelect(hour, selectedMinute || "00");
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors ${
                        selectedHour === hour
                          ? "bg-indigo-100 text-indigo-700 font-semibold"
                          : "text-slate-700"
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minute Column */}
              <div className="flex-1">
                <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm px-3 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Minute
                  </span>
                </div>
                {/* Custom scrollbar untuk minute */}
                <div className="overflow-y-auto h-[240px] scrollbar-thin scrollbar-thumb-indigo-400 scrollbar-track-transparent hover:scrollbar-thumb-indigo-500">
                  {minutes.map((minute) => (
                    <button
                      key={minute}
                      type="button"
                      onClick={() => {
                        handleTimeSelect(selectedHour || "08", minute);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-indigo-50 transition-colors ${
                        selectedMinute === minute
                          ? "bg-indigo-100 text-indigo-700 font-semibold"
                          : "text-slate-700"
                      }`}
                    >
                      {minute}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// **KOMPONEN UTAMA: ScheduleModal**
export function ScheduleModal({
  isOpen,
  onClose,
  day,
  schedule,
  onSaved,
}: ScheduleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nama_kegiatan: "",
    jam_mulai: "",
    jam_selesai: "",
    kategori: "",
    priority: "",
    status: "TODO",
    reminder_minutes: 15,
    catatan: "",
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        nama_kegiatan: schedule.nama_kegiatan,
        jam_mulai: schedule.jam_mulai.slice(0, 5),
        jam_selesai: schedule.jam_selesai.slice(0, 5),
        kategori: schedule.kategori ?? "OTHER",
        priority: schedule.priority,
        status: schedule.status,
        reminder_minutes: schedule.reminder_minutes ?? 15,
        catatan: schedule.catatan ?? "",
      });
    } else {
      // Reset form untuk kegiatan baru dengan status TODO
      setFormData({
        nama_kegiatan: "",
        jam_mulai: "08:00",
        jam_selesai: "09:00",
        kategori: "",
        priority: "",
        status: "TODO",
        reminder_minutes: 15,
        catatan: "",
      });
    }
  }, [schedule]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validasi required fields
      if (!formData.kategori) {
        alert("Please select a category");
        setIsLoading(false);
        return;
      }
      if (!formData.priority) {
        alert("Please select a priority");
        setIsLoading(false);
        return;
      }

      // Validasi waktu
      if (formData.jam_mulai >= formData.jam_selesai) {
        alert("End time must be after start time");
        setIsLoading(false);
        return;
      }

      const input = {
        hari: day,
        nama_kegiatan: formData.nama_kegiatan,
        jam_mulai: formData.jam_mulai,
        jam_selesai: formData.jam_selesai,
        kategori: formData.kategori ?? "OTHER",
        priority: formData.priority,
        reminder_minutes: formData.reminder_minutes,
        catatan: formData.catatan || undefined,
        status: "TODO" as const,
      };

      if (schedule) {
        await updateSchedule(schedule.id, input);
      } else {
        await createSchedule(input);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert("Gagal menyimpan kegiatan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleTimeChange =
    (field: "jam_mulai" | "jam_selesai") => (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] sm:max-h-none overflow-hidden flex flex-col transition-all transform animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
        {/* Handle Bar untuk Mobile */}
        <div className="flex justify-center py-3 sm:hidden">
          <div className="w-12 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header Modal */}
        <div className="px-6 pb-4 pt-2 sm:pt-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {schedule ? "Edit Activity" : "Tambah Kegiatan Baru"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {schedule
                ? "Update your schedule details"
                : "Create a new activity"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[calc(85vh-100px)] sm:max-h-[550px] 
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-transparent 
            [&::-webkit-scrollbar-thumb]:bg-indigo-400 
            [&::-webkit-scrollbar-thumb]:rounded-full 
            hover:[&::-webkit-scrollbar-thumb]:bg-indigo-500 
            [scrollbar-width:thin] 
            [scrollbar-color:#4f46e5_transparent]"
        >
          {/* Input Nama Kegiatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5" /> Activity Name{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nama_kegiatan"
              value={formData.nama_kegiatan}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium transition-all"
              placeholder="Morning Deep Work"
            />
          </div>

          {/* Menggunakan TimePicker custom */}
          <div className="grid grid-cols-2 gap-4">
            <TimePicker
              value={formData.jam_mulai}
              onChange={handleTimeChange("jam_mulai")}
              label="Start Time"
              icon={<Clock className="w-3.5 h-3.5" />}
              required
            />

            <TimePicker
              value={formData.jam_selesai}
              onChange={handleTimeChange("jam_selesai")}
              label="End Time"
              icon={<Clock className="w-3.5 h-3.5" />}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="kategori"
                value={formData.kategori ?? ""}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all"
              >
                <option value="">Select a Category</option>
                <option value="WORK">Work</option>
                <option value="STUDY">Study</option>
                <option value="HEALTH">Health</option>
                <option value="PERSONAL">Personal</option>
                <option value="SOCIAL">Social</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                name="priority"
                value={formData.priority ?? ""}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all"
              >
                <option value="">Select a Priority</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Reminder Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reminder (minutes)
            </label>
            <select
              name="reminder_minutes"
              value={formData.reminder_minutes}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 transition-all"
            >
              {REMINDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Input Catatan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </label>
            <textarea
              name="catatan"
              value={formData.catatan}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-indigo-50/30 border border-indigo-100/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 placeholder-slate-400 transition-all text-sm leading-relaxed"
              placeholder="Focus on finalizing the project proposal..."
            />
          </div>

          {/* Banner Productivity Tip */}
          <div className="bg-purple-50 rounded-xl p-4 flex gap-3 border border-purple-100/60">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-200">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Productivity Tip
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                Activities longer than 90 minutes benefit from a short 5-minute
                break midway.
              </p>
            </div>
          </div>

          {/* Buttons Action */}
          <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-indigo-900 text-white rounded-xl font-bold text-sm tracking-wider uppercase hover:bg-indigo-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-900/10"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {schedule ? "UPDATE ACTIVITY" : "SAVE ACTIVITY"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-indigo-500 hover:bg-indigo-50/50 rounded-xl font-bold text-sm tracking-wider uppercase transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
