// Görsel yükleme — panelden seçilen fotoğrafı Supabase Storage'a koyar ve
// herkese açık URL'sini döner.
//
// NEDEN: Eskiden panel fotoğrafı base64 olarak doğrudan hotels.image_url'e
// yazıyordu. Bu üç şeyi bozuyordu: (1) satırlar megabaytlarca şişiyor ve
// /api/hotels yanıtı ağırlaşıyor, (2) Netlify Image CDN base64'ü küçültemiyor,
// (3) Tur Kiti PDF'i dış (CORS'suz) görselleri basamıyor.
// Storage URL'leri "Access-Control-Allow-Origin: *" ile geldiği için üçü de çözülür.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (Netlify proje değişkenleri).

import { yetkiDenetle } from "../lib/auth.mjs";

const BUCKET = "hotel-images";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ detail: "Yöntem desteklenmiyor" }, 405);

  // Yükleme depolama alanına yazar — yalnızca yönetici.
  const yetki = yetkiDenetle(req);
  if (!yetki.ok) return json({ detail: yetki.detail }, yetki.status);

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return json({ detail: "Supabase yapılandırması eksik" }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ detail: "Geçersiz istek gövdesi" }, 400);
  }

  const contentType = String(body?.contentType || "").toLowerCase();
  const ext = EXT[contentType];
  if (!ext) return json({ detail: "Yalnızca JPEG, PNG, WebP veya GIF yüklenebilir" }, 415);

  const b64 = String(body?.data || "").replace(/^data:[^,]+,/, "");
  if (!b64) return json({ detail: "Görsel verisi boş" }, 400);

  let bytes;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    return json({ detail: "Görsel verisi çözülemedi" }, 400);
  }
  if (bytes.length === 0) return json({ detail: "Görsel verisi boş" }, 400);
  if (bytes.length > MAX_BYTES) {
    return json({ detail: `Görsel çok büyük (en fazla ${MAX_BYTES / 1024 / 1024} MB)` }, 413);
  }

  const path = `${crypto.randomUUID()}.${ext}`;

  try {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: bytes,
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return json({ detail: `Yükleme başarısız: ${detail || r.status}` }, r.status);
    }

    return json({ url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` });
  } catch (e) {
    return json({ detail: `Sunucu hatası: ${e.message}` }, 500);
  }
};
