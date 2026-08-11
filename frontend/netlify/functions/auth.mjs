// Yönetici anahtarı doğrulama — panel giriş ekranı bunu çağırır.
// Anahtarın kendisi sunucuda (ADMIN_SECRET); istemci paketinde bulunmaz.

import { yetkiDenetle } from "../lib/auth.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-admin-key",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ detail: "Yöntem desteklenmiyor" }, 405);

  const body = await req.json().catch(() => null);
  const yetki = yetkiDenetle(req, body);
  if (!yetki.ok) return json({ detail: yetki.detail }, yetki.status);

  return json({ ok: true });
};
