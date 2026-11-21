import { MockRepository } from "./mock";
import { SupabaseRepository } from "./supabase";
import type { Repository } from "./contracts";

export function createRepository(): Repository {
  const mode = import.meta.env.VITE_DATA_MODE || "demo";
  if (mode === "demo") return new MockRepository();
  if (mode !== "supabase")
    throw new Error("VITE_DATA_MODE debe ser demo o supabase.");
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.",
    );
  return new SupabaseRepository(url, key);
}
