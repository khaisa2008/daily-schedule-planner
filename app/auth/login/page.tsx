"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const { data ,error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      console.log(data);
      console.log(error);

      if (error) throw error;

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FB] flex items-center justify-center px-5 py-10">
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
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
                />
              </div>
            </div>

            {/* Password */}

            <div>
              <div className="flex justify-between">
                <label className="text-sm font-semibold text-gray-600">
                  Password
                </label>

                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-indigo-600 font-semibold"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="relative mt-2">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={20}
                />

                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-12 outline-none focus:border-indigo-600"
                  placeholder="••••••••"
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

            <button
              disabled={loading}
              className="w-full bg-indigo-700 hover:bg-indigo-800 transition rounded-xl py-3 text-white font-semibold flex justify-center items-center gap-2 shadow-lg"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Login
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

          <p className="text-center text-gray-500">
            Don't have an account?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-indigo-700"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
