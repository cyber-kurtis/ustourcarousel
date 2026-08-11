// Yönetici anahtarı — panelde girilir, cihazda saklanır, yazma isteklerine eklenir.
//
// Anahtar uygulama paketine gömülü DEĞİLDİR. Doğrulama sunucuda yapılır
// (Netlify ortam değişkeni ADMIN_SECRET); buradaki değer yalnızca yöneticinin
// girdiği ve cihazında tutulan kopyadır. Native'de Keychain, web'de tarayıcı
// deposu kullanılır.

import { storage } from "@/src/utils/storage";
import { API_BASE } from "@/src/lib/api";

const STORAGE_KEY = "naviguide_admin_key";

let cached: string | null = null;

/** Uygulama açılırken bir kez çağrılır — daha önce girilmiş anahtarı geri yükler. */
export async function loadAdminKey(): Promise<string | null> {
  if (cached) return cached;
  const saved = await storage.secureGet(STORAGE_KEY, "");
  cached = saved ? String(saved) : null;
  return cached;
}

export function getAdminKey(): string | null {
  return cached;
}

export async function setAdminKey(key: string): Promise<void> {
  cached = key;
  await storage.secureSet(STORAGE_KEY, key);
}

export async function clearAdminKey(): Promise<void> {
  cached = null;
  await storage.secureRemove(STORAGE_KEY);
}

/**
 * Anahtarı sunucuda doğrular.
 * @returns true = geçerli, false = geçersiz. Ağ/sunucu hatasında fırlatır.
 */
export async function verifyAdminKey(key: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": key },
    body: "{}",
  });
  if (res.ok) return true;
  if (res.status === 401) return false;
  const out = await res.json().catch(() => ({}));
  throw new Error(out.detail || `Sunucu hatası (${res.status})`);
}

/** Yazma isteklerine eklenecek başlıklar. */
export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...(extra ?? {}),
    ...(cached ? { "x-admin-key": cached } : {}),
  };
}
