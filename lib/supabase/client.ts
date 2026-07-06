// lib/supabase/client.ts

import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/supabase/database";

let client:
  | ReturnType<typeof createBrowserClient<Database>>
  | undefined;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return client;
}
