import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset. " +
      "Salin .env.local.example ke .env.local dan isi dengan kredensial project Supabase-mu."
  );
}

// Not using the generic `createClient<Database>()` form here: supabase-js's generic
// constraints expect the exact shape produced by `supabase gen types`, and our
// hand-written Database type (see ./types.ts) isn't a full match. Table/query results
// are typed manually where needed in src/lib/queries.ts instead.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key"
);
