import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://ejaiflgcspbowtsywyqc.supabase.co";
const fallbackSupabasePublishableKey = "sb_publishable_3rzNFTstSRRu_DcEpPMrqQ_cIpLSP3E";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
  fallbackSupabaseUrl;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  fallbackSupabasePublishableKey;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: typeof window !== "undefined",
      },
    })
  : null;
