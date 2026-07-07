// app/dashboard/DashboardContent.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  ListChecks,
  PieChart,
  Target,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Data dummy untuk grafik
const getDummyHourlyData = () => {
  const hours = [
    "06:00",
    "08:00",
    "10:00",
    "12:00",
    "14:00",
    "16:00",
    "18:00",
    "20:00",
  ];
  return hours.map(() => Math.floor(Math.random() * 8) + 1);
};

const getDummyCategoryData = () => {
  return {
    work: Math.floor(Math.random() * 30) + 20,
    personal: Math.floor(Math.random() * 25) + 15,
    health: Math.floor(Math.random() * 20) + 10,
    social: Math.floor(Math.random() * 15) + 5,
    other: Math.floor(Math.random() * 10) + 5,
  };
};

interface DashboardStats {
  totalActivities: number;
  completedToday: number;
  pendingTasks: number;
  totalHours: number;
}

interface DashboardContentProps {
  userEmail?: string;
  userId?: string;
  busiestDay?: { day: string; count: number };
}

export default function DashboardContent({ 
  userEmail = "user@example.com",
  userId = "",
  busiestDay = { day: "Senin", count: 5 }
}: DashboardContentProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalActivities: 0,
    completedToday: 0,
    pendingTasks: 0,
    totalHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hourlyData] = useState(getDummyHourlyData());
  const [categoryData] = useState(getDummyCategoryData());

  // Fetch data dari database
  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // 1. Total activities
        const { count: totalActivities, error: totalError } = await supabase
          .from("schedules")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (totalError) {
          console.error("Error fetching total activities:", totalError);
        }

        // 2. Completed today (status DONE)
        const today = new Date().toISOString().split('T')[0];
        const { count: completedToday, error: completedError } = await supabase
          .from("schedules")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "DONE")
          .gte("updated_at", today);

        if (completedError) {
          console.error("Error fetching completed today:", completedError);
        }

        // 3. Pending tasks (status TODO atau ONGOING) - PERBAIKAN DI SINI
        const { count: pendingTasks, error: pendingError } = await supabase
          .from("schedules")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["TODO", "ONGOING"]); // Ubah dari "IN_PROGRESS" menjadi "ONGOING"

        if (pendingError) {
          console.error("Error fetching pending tasks:", pendingError);
        }

        // 4. Total hours
        // Untuk menghitung total jam, kita bisa query semua data dan hitung durasinya
        let totalHours = 0;
        try {
          const { data: schedules, error: hoursError } = await supabase
            .from("schedules")
            .select("jam_mulai, jam_selesai")
            .eq("user_id", userId);

          if (!hoursError && schedules) {
            schedules.forEach((schedule: any) => {
              if (schedule.jam_mulai && schedule.jam_selesai) {
                const start = new Date(`1970-01-01T${schedule.jam_mulai}`);
                const end = new Date(`1970-01-01T${schedule.jam_selesai}`);
                const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                if (diffHours > 0) {
                  totalHours += diffHours;
                }
              }
            });
            totalHours = Math.round(totalHours * 10) / 10; // Pembulatan 1 desimal
          }
        } catch (hoursError) {
          console.error("Error calculating total hours:", hoursError);
        }

        setStats({
          totalActivities: totalActivities || 0,
          completedToday: completedToday || 0,
          pendingTasks: pendingTasks || 0,
          totalHours: totalHours || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  // Jika loading, tampilkan skeleton
  if (loading) {
    return (
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4">
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-4">
              <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex flex-wrap items-center gap-2">
          <span>Dashboard Overview</span>
          <span className="text-xs sm:text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full whitespace-nowrap">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </h1>
        <p className="text-gray-600">Welcome back, {userEmail}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Total Activities
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalActivities}
              </p>
            </div>
            <ListChecks className="w-8 h-8 text-indigo-500 opacity-75" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Completed Today
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.completedToday}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-75" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Pending Tasks
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pendingTasks}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-500 opacity-75" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Total Hours
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalHours}h
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-500 opacity-75" />
          </div>
        </div>
      </div>

      {/* Progress & Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Progress - Hitung dari data real */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Task Completion Rate
            </h3>
            <span className="text-sm font-bold text-indigo-600">
              {stats.totalActivities > 0 
                ? Math.round((stats.completedToday / stats.totalActivities) * 100) 
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000"
              style={{ 
                width: `${stats.totalActivities > 0 
                  ? Math.round((stats.completedToday / stats.totalActivities) * 100) 
                  : 0}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Productivity */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Productivity Score
            </h3>
            <span className="text-sm font-bold text-green-600">
              {stats.totalActivities > 0 
                ? Math.min(100, Math.round((stats.completedToday / Math.max(1, stats.totalActivities)) * 100) + 20) 
                : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-1000"
              style={{ 
                width: `${stats.totalActivities > 0 
                  ? Math.min(100, Math.round((stats.completedToday / Math.max(1, stats.totalActivities)) * 100) + 20) 
                  : 0}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Activity Chart */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Hourly Activity Distribution
          </h3>
          <div className="flex items-end gap-1 h-32">
            {hourlyData.map((value, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-gradient-to-t from-indigo-400 to-indigo-600 rounded-t transition-all duration-500 hover:opacity-80"
                  style={{ height: `${(value / 8) * 100}%` }}
                />
                <span className="text-[8px] text-gray-400 transform -rotate-45 origin-left whitespace-nowrap">
                  {
                    [
                      "06:00",
                      "08:00",
                      "10:00",
                      "12:00",
                      "14:00",
                      "16:00",
                      "18:00",
                      "20:00",
                    ][index]
                  }
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Activity Categories
          </h3>
          <div className="space-y-3">
            {Object.entries(categoryData).map(([category, value]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-600">{category}</span>
                  <span className="font-medium text-gray-700">{value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      category === "work"
                        ? "bg-blue-500"
                        : category === "personal"
                        ? "bg-green-500"
                        : category === "health"
                        ? "bg-red-500"
                        : category === "social"
                        ? "bg-purple-500"
                        : "bg-gray-500"
                    }`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Busiest Day Info */}
      {busiestDay && busiestDay.count > 0 && (
        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm p-4 border border-indigo-100">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-600">Your busiest day</p>
              <p className="text-lg font-semibold text-gray-900">
                {busiestDay.day} - {busiestDay.count} activities
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}