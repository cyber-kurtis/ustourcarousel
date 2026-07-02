// Döviz kurları API.
// EUR/TRY satış kuru: TCMB today.xml → BanknoteSelling (Efektif Satış).
// Efektif satış, TCMB'nin yayınladığı dört kurun en yükseğidir — rehberin
// TL tahsilatı EUR'ya çevrilirken zarar oluşmasın diye bilinçli seçildi.
// Çapraz kurlar (MKD, RSD, ALL, BAM...): open.er-api.com (ücretsiz, günlük).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Netlify CDN 30 dk önbelleklesin — TCMB günde bir kez güncellenir.
      "Cache-Control": "public, max-age=0, s-maxage=1800",
      ...CORS,
    },
  });

const WANTED = ["EUR", "TRY", "USD", "MKD", "RSD", "ALL", "BAM"];

async function fetchTcmbEurSelling() {
  const r = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml");
  if (!r.ok) throw new Error(`TCMB ${r.status}`);
  const xml = await r.text();
  const eurBlock = xml.match(
    /<Currency[^>]*CurrencyCode="EUR"[\s\S]*?<\/Currency>/
  )?.[0];
  if (!eurBlock) throw new Error("TCMB EUR bloğu bulunamadı");
  const pick = (tag) => {
    const v = eurBlock.match(new RegExp(`<${tag}>([\\d.]+)</${tag}>`))?.[1];
    return v ? parseFloat(v) : null;
  };
  const banknote = pick("BanknoteSelling");
  const forex = pick("ForexSelling");
  const selling = banknote ?? forex;
  if (!selling) throw new Error("TCMB satış kuru okunamadı");
  return {
    selling,
    source: banknote ? "TCMB Efektif Satış" : "TCMB Döviz Satış",
    date: xml.match(/Tarih="([^"]+)"/)?.[1] ?? null,
  };
}

async function fetchCrossRates() {
  const r = await fetch("https://open.er-api.com/v6/latest/EUR");
  if (!r.ok) throw new Error(`er-api ${r.status}`);
  const data = await r.json();
  if (data.result !== "success" || !data.rates)
    throw new Error("er-api geçersiz yanıt");
  const rates = {};
  for (const code of WANTED) {
    if (typeof data.rates[code] === "number") rates[code] = data.rates[code];
  }
  return rates;
}

export default async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  const [tcmb, cross] = await Promise.allSettled([
    fetchTcmbEurSelling(),
    fetchCrossRates(),
  ]);

  const rates = cross.status === "fulfilled" ? cross.value : null;

  let eurTry = null;
  if (tcmb.status === "fulfilled") {
    eurTry = tcmb.value;
  } else if (rates?.TRY) {
    // TCMB'ye ulaşılamazsa piyasa orta kuru + %2 marj ile satışa yaklaş.
    eurTry = {
      selling: Math.round(rates.TRY * 1.02 * 10000) / 10000,
      source: "Piyasa kuru (yaklaşık)",
      date: null,
    };
  }

  if (!eurTry && !rates)
    return json({ detail: "Kur kaynaklarına ulaşılamadı" }, 502);

  return json({ base: "EUR", eurTry, rates });
};
