import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** Only authentication tokens are kept for this tab. Progress is NEVER persisted in browser storage. */
const authStorage = {
  getItem: (name: string) => {
    try {
      return sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      sessionStorage.setItem(name, value);
    } catch {
      /* private browsing: in-memory auth */
    }
  },
  removeItem: (name: string) => {
    try {
      sessionStorage.removeItem(name);
    } catch {
      /* unavailable storage */
    }
  },
};

let client: SupabaseClient | null = null;
let configurationError: string | null = null;
if (url || key) {
  if (!url || !key || !/^https:\/\//.test(url)) {
    configurationError =
      "إعدادات الاتصال غير مكتملة. هذه معاينة تجريبية وليست سجلّ تلميذ.";
  } else if (
    key.startsWith("sb_secret_") ||
    (() => {
      try {
        return JSON.parse(atob(key.split(".")[1])).role === "service_role";
      } catch {
        return false;
      }
    })()
  ) {
    configurationError =
      "يجب استخدام مفتاح Supabase العام فقط، وليس مفتاح الخدمة.";
  } else {
    client = createClient(url, key, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "voies.auth",
      },
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
}
export const supabase = client;
export const supabaseConfigurationError = configurationError;
