// Harita konumları API (yönetim panelinden pin ekle/sil).
// Depo: Netlify Blobs "locations" store'u (strong: yazınca hemen görünür).
// GET:  {locations:[{id,name,lat,lng,desc}]} — harita sayfaları çeker.
// POST: {action:"add", name, lat, lng, desc?} → yeni pin
//       {action:"remove", id} → pin sil
// Yazma işlemleri x-admin-key başlığı ister (bkz. ../lib/auth.mjs).

import { getStore } from "@netlify/blobs";
import { yetkiDenetle } from "../lib/auth.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
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

export default async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  const store = getStore({ name: "locations", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const rows = (
      await Promise.all(
        blobs.map(async (b) => {
          const v = await store.get(b.key, { type: "json" }).catch(() => null);
          return v ? { id: b.key, ...v } : null;
        })
      )
    ).filter(Boolean);
    rows.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "tr"));
    return json({ locations: rows });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ detail: "Geçersiz istek" }, 400);
    }
    const yetki = yetkiDenetle(req, body);
    if (!yetki.ok) return json({ detail: yetki.detail }, yetki.status);

    if (body.action === "remove") {
      const id = String(body?.id ?? "").slice(0, 64);
      if (!id) return json({ detail: "id gerekli" }, 400);
      await store.delete(id).catch(() => {});
      return json({ ok: true });
    }

    if (body.action === "add") {
      const name = String(body?.name ?? "").trim().slice(0, 80);
      const lat = Number(body?.lat);
      const lng = Number(body?.lng);
      const desc = String(body?.desc ?? "").trim().slice(0, 160);
      if (!name) return json({ detail: "İsim gerekli" }, 400);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90)
        return json({ detail: "Enlem geçersiz" }, 400);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180)
        return json({ detail: "Boylam geçersiz" }, 400);
      const id = `loc-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      await store.setJSON(id, { name, lat, lng, desc, created_at: Date.now() });
      return json({ ok: true, id });
    }

    return json({ detail: "Bilinmeyen işlem" }, 400);
  }

  return json({ detail: "Yöntem desteklenmiyor" }, 405);
};
