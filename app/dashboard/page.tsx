"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DayCard } from "@/components/DayCard";
import { Navbar } from "@/components/Navbar";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import DashboardContent from "./DashboardContent";
import { Calendar } from "lucide-react";

export type DayOfWeek =
  | "Senin"
  | "Selasa"
  | "Rabu"
  | "Kamis"
  | "Jumat"
  | "Sabtu"
  | "Minggu";

const DAYS: DayOfWeek[] = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [scheduleCounts, setScheduleCounts] = useState<
    Record<DayOfWeek, number>
  >({
    Senin: 0,
    Selasa: 0,
    Rabu: 0,
    Kamis: 0,
    Jumat: 0,
    Sabtu: 0,
    Minggu: 0,
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUser(user);
      await fetchScheduleCounts(user.id);
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchScheduleCounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("hari")
        .eq("user_id", userId);

      if (error) throw error;

      const counts: Record<DayOfWeek, number> = {
        Senin: 0,
        Selasa: 0,
        Rabu: 0,
        Kamis: 0,
        Jumat: 0,
        Sabtu: 0,
        Minggu: 0,
      };

      if (data && data.length > 0) {
        data.forEach((schedule: any) => {
          const day = schedule.hari as DayOfWeek;
          if (day && day in counts) {
            counts[day] = (counts[day] || 0) + 1;
          }
        });
      }

      setScheduleCounts(counts);
    } catch (error) {
      console.error("Error fetching schedule counts:", error);
    }
  };

  // Mendapatkan hari dengan aktivitas terbanyak
  const getBusiestDay = () => {
    let maxCount = 0;
    let busiestDay: DayOfWeek = "Senin";
    for (const [day, count] of Object.entries(scheduleCounts)) {
      if (count > maxCount) {
        maxCount = count;
        busiestDay = day as DayOfWeek;
      }
    }
    return { day: busiestDay, count: maxCount };
  };

  const busiestDay = getBusiestDay();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Kiri - Day Cards */}
          <div className="lg:w-100 flex-shrink-0">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Daily Schedule
              </h1>
              <p className="text-gray-600">
                Manage your activity schedule from Monday to Sunday
              </p>
            </div>
            <div className="rounded-xl p-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Weekly Schedule
                </h2>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  {Object.values(scheduleCounts).reduce((a, b) => a + b, 0)}{" "}
                  total
                </span>
              </div>

              <div className="space-y-5">
                {DAYS.map((day) => (
                  <DayCard
                    key={day}
                    day={day}
                    scheduleCount={scheduleCounts[day] || 0}
                    onClick={() => router.push(`/days/${day}`)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Konten Utama - DashboardContent */}
          <DashboardContent 
            userEmail={user?.email}
            busiestDay={busiestDay}
          />
        </div>
      </main>
    </div>
  );
}