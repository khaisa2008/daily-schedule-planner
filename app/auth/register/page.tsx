"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mendaftar akun.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FB] flex items-center justify-center px-5 py-5">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-5">
          <div className="mx-auto w-18 h-18 rounded-2xl bg-indigo-700 flex items-center justify-center shadow-lg">
            <ClipboardList className="text-white" size={50} />
          </div>

          <h1 className="mt-3 text-3xl font-bold text-indigo-900">
            Daily Schedule
          </h1>

          <p className="text-gray-500 mt-2">Your day, mastered with clarity.</p>
        </div>

        <div className="bg-white rounded-3xl p-7 shadow-xl">
          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Full Name
              </label>

              <div className="relative mt-2">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-indigo-600"
                  placeholder="John Doe"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Email Address
              </label>

              <div className="relative mt-2">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 outline-none focus:border-indigo-600"
                  placeholder="name@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-gray-600">
                Password
              </label>

              <div className="relative mt-2">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-12 outline-none focus:border-indigo-600"
                  placeholder="••••••••"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              className="w-full bg-indigo-700 hover:bg-indigo-800 transition rounded-xl py-3 text-white font-semibold flex justify-center items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Register
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-7 text-gray-400">
            <div className="flex-1 border-t" />
            <span className="mx-3 text-xs font-semibold">OR</span>
            <div className="flex-1 border-t" />
          </div>

          {/* Redirect to Login */}
          <p className="text-center text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-indigo-700">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}