import { createClient } from "npm:@supabase/supabase-js@2.119.0";

// Public endpoint for code login; teacher actions still verify an actual Auth JWT and database role.
// A service-role key is used ONLY inside this Edge Function and is never returned to the browser.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const sha256 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? "";
  const allowed = (Deno.env.get("JOURNEY_ALLOWED_ORIGINS") ?? "https://voies.vercel.app").split(",").map(s => s.trim());
  const cors = { "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0], "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors, status: 204 });
  if (req.method !== "POST") return reply({ error: "الطلب غير متاح." }, 405);
  if (origin && !allowed.includes(origin)) return reply({ error: "مصدر الطلب غير مسموح." }, 403);
  try {
    const raw = await req.text();
    if (raw.length > 2048) return reply({ error: "الطلب أطول من المسموح." }, 413);
    const body = JSON.parse(raw);
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (body.action === "create-student") {
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: { user }, error: authError } = await service.auth.getUser(token);
      if (authError || !user) return reply({ error: "يلزم دخول المدرّب." }, 401);
      const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "teacher") return reply({ error: "إضافة التلاميذ للمدرّب فقط." }, 403);
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 60) return reply({ error: "اسم غير صالح." }, 400);
      const { data: permitted, error: rateError } = await service.rpc("consume_login_attempt", { key_hash: await sha256(`create:${user.id}`), max_attempts: 15 });
      if (rateError || !permitted) return reply({ error: "انتظر قليلًا ثم حاول مجددًا." }, 429);
      // Ten base32 characters = 50 bits. Random bytes mod 32 have no modulo bias.
      const code = Array.from(crypto.getRandomValues(new Uint8Array(10))).map(b => ALPHABET[b % 32]).join("");
      const { data, error } = await service.auth.admin.createUser({ email: `s-${crypto.randomUUID()}@students.voies.invalid`, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true, user_metadata: { name } });
      if (error || !data.user) return reply({ error: "تعذّرت إضافة التلميذ." }, 500);
      const { error: recordError } = await service.rpc("register_student", { student_id: data.user.id, student_name: name, owner_id: user.id, code_hash: await sha256(code) });
      if (recordError) {
        // Compensating cleanup: never leave a partially provisioned account after database failure.
        await service.auth.admin.deleteUser(data.user.id);
        return reply({ error: "تعذّر إعداد رحلة التلميذ." }, 500);
      }
      return reply({ student_id: data.user.id, login_code: `${code.slice(0, 5)}-${code.slice(5)}` });
    }
    if (body.action !== "login") return reply({ error: "طلب غير معروف." }, 400);
    const code = typeof body.code === "string" ? body.code.replace(/[\s-]/g, "").toUpperCase() : "";
    if (!/^[A-HJ-NP-Z2-9]{10}$/.test(code)) return reply({ error: "تعذّر الدخول بهذا الرمز." }, 400);
    const hash = await sha256(code);
    // Supabase's gateway supplies this header. Do not trust a caller-provided student/user ID.
    const ip = (req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").at(-1) ?? "unknown").trim();
    const limits = await Promise.all([
      service.rpc("consume_login_attempt", { key_hash: await sha256(`ip:${ip}`), max_attempts: 30 }),
      service.rpc("consume_login_attempt", { key_hash: await sha256(`code:${hash}`), max_attempts: 10 }),
    ]);
    if (limits.some(r => r.error || !r.data)) return reply({ error: "انتظر قليلًا ثم حاول مجددًا." }, 429);
    const { data: student } = await service.from("students").select("id").eq("login_code", hash).single();
    if (!student) return reply({ error: "تعذّر الدخول بهذا الرمز." }, 400);
    const { data: account } = await service.auth.admin.getUserById(student.id);
    if (!account.user?.email) return reply({ error: "تعذّر الدخول بهذا الرمز." }, 400);
    // Admin-generated OTP is redeemed server-side; no emails, passwords, or magic links reach the child.
    const { data: link, error: linkError } = await service.auth.admin.generateLink({ type: "magiclink", email: account.user.email });
    if (linkError || !link.properties?.hashed_token) return reply({ error: "تعذّر تسجيل الدخول." }, 500);
    const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: verified, error: verifyError } = await auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (verifyError || !verified.session) return reply({ error: "تعذّر تسجيل الدخول." }, 500);
    return reply({ access_token: verified.session.access_token, refresh_token: verified.session.refresh_token });
  } catch {
    // Do not leak Auth internals, code hashes, account existence, or service credentials.
    return reply({ error: "تعذّر إتمام الطلب. حاول مجددًا." }, 400);
  }
});
