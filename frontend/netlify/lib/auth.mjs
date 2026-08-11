// Yönetim yetkisi denetimi — tüm yazma uçları buradan geçer.
//
// NEDEN: Eskiden panel şifresi ("ustour") hem istemci paketinin hem de
// fonksiyon kaynağının içinde sabitti; tarayıcıya indiği için herkes
// görebiliyordu. hotels ucunda ise hiç denetim yoktu — adresi bilen herkes
// otel ekleyebiliyor, değiştirebiliyor veya silebiliyordu.
//
// ŞİMDİ: Şifre yalnızca sunucuda, Netlify ortam değişkeni ADMIN_SECRET'te
// duruyor. Panele girilen değer istekle birlikte gönderilir ve burada
// karşılaştırılır; istemci paketinde şifre bulunmaz.
//
// Değişken tanımlı değilse yazma işlemleri kapalıdır (fail-closed) — yanlış
// yapılandırma sessizce "herkese açık"a düşmesin.

const HEADER = "x-admin-key";

/** Sabit süreli karşılaştırma — şifreyi karakter karakter tahmin etmeyi engeller. */
function sabitZamanEsit(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/**
 * İsteğin yönetici yetkisi var mı?
 * Anahtar önce `x-admin-key` başlığından, yoksa gövdedeki `pin` alanından okunur.
 * @returns {{ok: true} | {ok: false, status: number, detail: string}}
 */
export function yetkiDenetle(req, body) {
  const beklenen = process.env.ADMIN_SECRET;
  if (!beklenen) {
    return { ok: false, status: 500, detail: "Sunucuda ADMIN_SECRET tanımlı değil — yazma işlemleri kapalı" };
  }
  const gelen = req.headers.get(HEADER) || body?.pin || "";
  if (!sabitZamanEsit(gelen, beklenen)) {
    return { ok: false, status: 401, detail: "Yetkisiz — yönetici anahtarı geçersiz" };
  }
  return { ok: true };
}
