/** تجزئة رمز المدرّب قبل حفظه (لا يُحفظ الرمز نفسه أبدًا). */
const SALT = "almutahadith-assaghir::";

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + pin);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", data);
    return "s256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // بديل بسيط في السياقات غير الآمنة (http بدون TLS)
  let h1 = 0xdeadbeef ^ data.length;
  let h2 = 0x41c6ce57 ^ data.length;
  for (const ch of data) {
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "fnv:" + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
}

export function isValidPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}
