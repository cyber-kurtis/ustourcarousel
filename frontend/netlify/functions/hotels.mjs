// Hotels API — replaces the FastAPI backend. Talks to Supabase via PostgREST.
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (set in Netlify project env vars).

const FIELDS = [
  "name", "image_url", "location", "phone", "email",
  "website", "country", "kind", "description",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const sbHeaders = () => ({
  apikey: process.env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
});

function pickFields(body) {
  const out = {};
  for (const k of FIELDS) {
    if (body[k] !== undefined && body[k] !== null) out[k] = body[k];
  }
  return out;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return json({ detail: "Supabase yapılandırması eksik (SUPABASE_URL / SUPABASE_SERVICE_KEY)" }, 500);
  }

  const rest = `${process.env.SUPABASE_URL}/rest/v1/hotels`;
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const m = path.match(/\/hotels(?:\/([^/]+))?$/);
  if (!m) return json({ message: "Otel Rehberi API" });
  const id = m[1];

  try {
    if (req.method === "GET" && !id) {
      const r = await fetch(`${rest}?select=*&order=created_at.asc,name.asc`, { headers: sbHeaders() });
      return json(await r.json(), r.status);
    }

    if (req.method === "GET") {
      const r = await fetch(`${rest}?id=eq.${encodeURIComponent(id)}&select=*`, { headers: sbHeaders() });
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) return json({ detail: "Otel bulunamadı" }, 404);
      return json(rows[0]);
    }

    if (req.method === "POST" && !id) {
      const body = pickFields(await req.json());
      if (!body.kind) body.kind = "hotel";
      const r = await fetch(rest, {
        method: "POST",
        headers: { ...sbHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(body),
      });
      const rows = await r.json();
      if (!r.ok) return json({ detail: rows.message || "Kayıt eklenemedi" }, r.status);
      return json(rows[0]);
    }

    if (req.method === "PUT" && id) {
      const updates = pickFields(await req.json());
      if (Object.keys(updates).length === 0) return json({ detail: "Güncellenecek alan yok" }, 400);
      const r = await fetch(`${rest}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { ...sbHeaders(), Prefer: "return=representation" },
        body: JSON.stringify(updates),
      });
      const rows = await r.json();
      if (!r.ok) return json({ detail: rows.message || "Güncellenemedi" }, r.status);
      if (!Array.isArray(rows) || rows.length === 0) return json({ detail: "Otel bulunamadı" }, 404);
      return json(rows[0]);
    }

    if (req.method === "DELETE" && id) {
      const r = await fetch(`${rest}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...sbHeaders(), Prefer: "return=representation" },
      });
      const rows = await r.json();
      if (!Array.isArray(rows) || rows.length === 0) return json({ detail: "Otel bulunamadı" }, 404);
      return json({ ok: true });
    }

    return json({ detail: "Yöntem desteklenmiyor" }, 405);
  } catch (e) {
    return json({ detail: `Sunucu hatası: ${e.message}` }, 500);
  }
};
