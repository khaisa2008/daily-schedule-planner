"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User, ClipboardList, ChevronDown } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { useScheduleMonitor } from "../app/actions/useScheduleMonitor";

interface NavbarProps {
  user: any;
}

export function Navbar({ user: initialUser }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();

  // Menggunakan local state agar data user konsisten di setiap rute URL
  const [user, setUser] = useState<any>(initialUser);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      return;
    }

    // Ambil data user cadangan jika di halaman tertentu prop ini bernilai kosong
    const fallbackGetUser = async () => {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      if (sessionUser) {
        setUser(sessionUser);
      }
    };
    fallbackGetUser();
  }, [initialUser, supabase]);

  // Jalankan Tracker Monitor Real-time menggunakan ID pengguna yang sudah dipastikan aman
  useScheduleMonitor(user?.id);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-5 py-1">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-700 flex items-center justify-center shadow-sm">
              <ClipboardList className="text-white" size={20} />
            </div>
            <span className="font-bold text-base sm:text-lg md:text-xl text-indigo-900 tracking-tight">
              Daily Schedule
            </span>
          </div>

          {/* Bagian Kanan Navbar (Notifikasi & User Menu) */}
          <div className="flex items-center space-x-4">
            {/* Lonceng Notifikasi */}
            {user?.id && <NotificationBell userId={user.id} />}

            {/* Profile Menu Dropdown */}
            <div className="relative py-2">
              {/* 1. Mengganti pemicu dari CSS group ke onClick React */}
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2.5 cursor-pointer focus:outline-none group"
              >
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-inner transition-colors group-hover:bg-indigo-100">
                  <User className="h-4 w-4 text-indigo-700" />
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-sm font-semibold text-gray-700 max-w-[120px] sm:max-w-none truncate">
                    {user?.user_metadata?.full_name ||
                      user?.email ||
                      "User Account"}
                  </span>
                  {/* 2. Mengubah rotasi panah berdasarkan state isProfileOpen */}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* 3. Backdrop invisible untuk menutup dropdown ketika pengguna mengklik di luar menu */}
              {isProfileOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
              )}

              {/* 4. Mengubah kelas utility agar menampilkan box berdasarkan state `isProfileOpen` */}
              <div
                className={`absolute right-0 mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-xl transition-all duration-200 origin-top-right z-50 ${
                  isProfileOpen
                    ? "opacity-100 visible scale-100"
                    : "opacity-0 invisible scale-95"
                }`}
              >
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsProfileOpen(false); // Tutup dropdown setelah logout diproses
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
