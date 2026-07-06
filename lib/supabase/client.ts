// lib/supabase/client.ts
import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";
import { Database } from "@/types/supabase/database";

// Variable global untuk menyimpan instance browser agar tidak dibuat ulang
let clientInstance: SupabaseClient<Database> | null = null;

export function createClient() {
  // Jika di server-side (SSR), selalu buat client baru
  if (typeof window === "undefined") {
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  // Jika di browser (client-side), buat sekali saja, sisanya gunakan yang sudah ada
  if (!clientInstance) {
    clientInstance = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return clientInstance;
}
