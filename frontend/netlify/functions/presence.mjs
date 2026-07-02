// Çevrimiçi rehber takibi + erişim kontrolü (iç güvenlik).
// Depo: Netlify Blobs "presence" store'u — harici veritabanı gerekmez.
// POST: uygulama ~60 sn'de bir {id, name, device} yollar (kalp atışı).
//       Yanıtta {blocked} döner; true ise istemci kilit ekranı gösterir.
// GET:  yönetim paneli listeyi çeker (isim, cihaz, son görülme, durum).
// PUT:  yönetici işlemleri {pin, id, action: pause|resume|rename|remove}.
//       Yönetici isim verirse (rename) istemcinin yolladığı isim artık
//       üzerine yazamaz (name_locked).

import { getStore } from "@netlify/blobs";

// admin.tsx'teki panel şifresiyle aynı basit kapı.
const ADMIN_PIN = "ustour";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...CORS,
    },
  });

// 30 günden eski kayıtları listelerken temizle (depo şişmesin)
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export default async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  // strong: yazılan kayıt hemen okunabilsin (PAUSE anında etki etsin)
  const store = getStore({ name: "presence", consistency: "strong" });

  // ── Kalp atışı ──
  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ detail: "Geçersiz istek" }, 400);
    }
    const id = String(body?.id ?? "").slice(0, 64);
    if (!id) return json({ detail: "id gerekli" }, 400);

    const existing = await store.get(id, { type: "json" }).catch(() => null);
    const blocked = existing?.blocked ?? false;
    // Önce mevcut kaydı olduğu gibi koru (blocked/name_locked dahil) —
    // kalp atışı yönetici alanlarını asla ezmesin.
    await store.setJSON(id, {
      ...(existing ?? {}),
      // Yönetici isim verdiyse istemci ismi ezemez
      name: existing?.name_locked
        ? existing.name
        : String(body?.name ?? existing?.name ?? "").slice(0, 40),
      device: String(body?.device ?? existing?.device ?? "").slice(0, 80),
      first_seen: existing?.first_seen ?? Date.now(),
      last_seen: Date.now(),
    });
    return json({ ok: true, blocked });
  }

  // ── Yönetici işlemleri ──
  if (req.method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ detail: "Geçersiz istek" }, 400);
    }
    if (body?.pin !== ADMIN_PIN) return json({ detail: "Yetkisiz" }, 403);

    const id = String(body?.id ?? "").slice(0, 64);
    const action = body?.action;
    if (!id || !action) return json({ detail: "id ve action gerekli" }, 400);

    if (action === "remove") {
      await store.delete(id).catch(() => {});
      return json({ ok: true });
    }

    const existing = await store.get(id, { type: "json" }).catch(() => null);
    if (!existing) return json({ detail: "Kayıt bulunamadı" }, 404);

    if (action === "pause") {
      await store.setJSON(id, { ...existing, blocked: true });
      return json({ ok: true });
    }
    if (action === "resume") {
      await store.setJSON(id, { ...existing, blocked: false });
      return json({ ok: true });
    }
    if (action === "rename") {
      const name = String(body?.name ?? "").slice(0, 40).trim();
      if (!name) return json({ detail: "İsim boş olamaz" }, 400);
      await store.setJSON(id, { ...existing, name, name_locked: true });
      return json({ ok: true });
    }
    return json({ detail: "Bilinmeyen işlem" }, 400);
  }

  // ── Liste ──
  if (req.method === "GET") {
    const { blobs } = await store.list();
    const now = Date.now();
    const rows = (
      await Promise.all(
        blobs.map(async (b) => {
          const v = await store.get(b.key, { type: "json" }).catch(() => null);
          if (!v) return null;
          if (now - (v.last_seen ?? 0) > STALE_MS) {
            store.delete(b.key).catch(() => {});
            return null;
          }
          return { id: b.key, ...v };
        })
      )
    ).filter(Boolean);
    rows.sort((a, b) => (b.last_seen ?? 0) - (a.last_seen ?? 0));
    return json({ now, guides: rows.slice(0, 100) });
  }

  return json({ detail: "Yöntem desteklenmiyor" }, 405);
};
