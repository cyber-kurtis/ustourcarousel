// Sınır kapıları bekleme süreleri API.
// Kaynak: borderalarm.com — her yönün kendi sayfası var; og:title meta'sında
// "Waiting time: X min" geçiyor, gövdede son rapor zamanı (dd.mm.yyyy hh:mm).
// Turda kullanılan kapılar aşağıda sabit listede; CDN 10 dk önbellekler,
// yani BorderAlarm'a en fazla 10 dakikada bir gidilir.

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
      // 10 dk CDN önbelleği — sınır verisi zaten saatlik değişiyor.
      "Cache-Control": "public, max-age=0, s-maxage=600",
      ...CORS,
    },
  });

// Turda kullanılan kapılar. a/b: iki taraf (isim + bayrak + ülke kodu).
// slugAB: a→b yönünün BorderAlarm sayfası; slugBA tersi. Slug'ı olmayan
// kapıları BorderAlarm kapsamıyor — kart "canlı veri yok" gösterir.
const CROSSINGS = [
  {
    id: "kapikule",
    a: { name: "Kapıkule", flag: "🇹🇷", country: "Türkiye" },
    b: { name: "Kapitan Andreevo", flag: "🇧🇬", country: "Bulgaristan" },
    slugAB: "kapikule-kapitan-andreewo",
    slugBA: "kapitan-andreewo-kapikule",
  },
  {
    id: "kalotina",
    a: { name: "Kalotina", flag: "🇧🇬", country: "Bulgaristan" },
    b: { name: "Gradina", flag: "🇷🇸", country: "Sırbistan" },
    slugAB: "kalotina-dragina",
    slugBA: "dragina-kalotina",
  },
  {
    id: "gyueshevo",
    a: { name: "Gyueshevo", flag: "🇧🇬", country: "Bulgaristan" },
    b: { name: "Deve Bair", flag: "🇲🇰", country: "K. Makedonya" },
    slugAB: "gyueshevo-deve-bair",
    slugBA: "deve-bair-gyueshevo",
  },
  {
    id: "presevo",
    a: { name: "Preševo", flag: "🇷🇸", country: "Sırbistan" },
    b: { name: "Tabanovce", flag: "🇲🇰", country: "K. Makedonya" },
    slugAB: "presevo-tabanovce",
    slugBA: "tabanovce-presevo",
  },
  {
    id: "kafasan",
    a: { name: "Kafasan", flag: "🇲🇰", country: "K. Makedonya" },
    b: { name: "Qafë Thanë", flag: "🇦🇱", country: "Arnavutluk" },
    slugAB: "kjafasan-qafe-thane",
    slugBA: "qafe-thane-kjafasan",
  },
  {
    id: "sveti-naum",
    a: { name: "Sveti Naum", flag: "🇲🇰", country: "K. Makedonya" },
    b: { name: "Tushemisht", flag: "🇦🇱", country: "Arnavutluk" },
    // BorderAlarm bu küçük kapıyı kapsamıyor.
  },
  {
    id: "blace",
    a: { name: "Blace", flag: "🇲🇰", country: "K. Makedonya" },
    b: { name: "Hani i Elezit", flag: "🇽🇰", country: "Kosova" },
    slugAB: "blace-hani-i-elezit",
    slugBA: "hani-i-elezit-blace",
  },
  {
    id: "muriqan",
    a: { name: "Muriqan", flag: "🇦🇱", country: "Arnavutluk" },
    b: { name: "Sukobin", flag: "🇲🇪", country: "Karadağ" },
    slugAB: "muriqan-sukobin",
    slugBA: "sukobin-muriqan",
  },
  {
    id: "sitnica",
    a: { name: "Sitnica", flag: "🇲🇪", country: "Karadağ" },
    b: { name: "Zupci", flag: "🇧🇦", country: "Bosna Hersek" },
    // BorderAlarm bu küçük kapıyı kapsamıyor.
  },
  {
    id: "merdare",
    a: { name: "Merdare", flag: "🇽🇰", country: "Kosova" },
    b: { name: "Merdare", flag: "🇷🇸", country: "Sırbistan" },
    slugAB: "merdare-merdare",
    slugBA: "merdare-merdare-2",
  },
  {
    id: "raca",
    a: { name: "Bosanska Rača", flag: "🇧🇦", country: "Bosna Hersek" },
    b: { name: "Sremska Rača", flag: "🇷🇸", country: "Sırbistan" },
    slugAB: "bosanska-raca-sremska-raca",
    slugBA: "sremska-raca-bosanska-raca",
  },
  {
    id: "sepak",
    a: { name: "Šepak", flag: "🇧🇦", country: "Bosna Hersek" },
    b: { name: "Trbušnica", flag: "🇷🇸", country: "Sırbistan" },
    slugAB: "sepak-trbusnica",
    slugBA: "trbusnica-sepak",
  },
  {
    id: "ivanica",
    a: { name: "Ivanica", flag: "🇧🇦", country: "Bosna Hersek" },
    b: { name: "Gornji Brgat", flag: "🇭🇷", country: "Hırvatistan" },
    // BorderAlarm bu kapıyı kapsamıyor.
  },
  {
    id: "bogorodica",
    a: { name: "Bogorodica", flag: "🇲🇰", country: "K. Makedonya" },
    b: { name: "Evzoni", flag: "🇬🇷", country: "Yunanistan" },
    slugAB: "bogorodica-evzoni",
    slugBA: "evzoni-bogorodica",
  },
  {
    id: "medzitlija",
    a: { name: "Medzitlija", flag: "🇲🇰", country: "K. Makedonya" },
    b: { name: "Niki", flag: "🇬🇷", country: "Yunanistan" },
    slugAB: "medzitlija-niki",
    slugBA: "niki-medzitlija",
  },
];

const BA = "https://borderalarm.com/bottlenecks/";

// Tek yön sayfasını çekip bekleme süresi + son rapor zamanını ayıkla.
async function fetchDirection(slug) {
  if (!slug) return null;
  try {
    const r = await fetch(`${BA}${slug}/`, {
      headers: { "User-Agent": "NaviGuide/1.0 (tour guide app)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`BA ${r.status}`);
    const html = await r.text();
    // og:title: "Kapıkule / Kapitan Andreewo, Waiting time: 10 min"
    const wait =
      html.match(/Waiting time:\s*([^"<]+?)\s*["<]/i)?.[1]?.trim() ?? null;
    // Gövdedeki ilk rapor zamanı en güncel olanı (dd.mm.yyyy hh:mm)
    const reported =
      html.match(/(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2})/)?.[1] ?? null;
    return { wait, reported, url: `${BA}${slug}/` };
  } catch {
    return { wait: null, reported: null, url: `${BA}${slug}/` };
  }
}

export default async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: CORS });

  // Tüm yönler paralel — 24 sayfa, 8 sn zaman aşımıyla.
  const results = await Promise.all(
    CROSSINGS.map(async (c) => {
      const [ab, ba] = await Promise.all([
        fetchDirection(c.slugAB),
        fetchDirection(c.slugBA),
      ]);
      return {
        id: c.id,
        a: c.a,
        b: c.b,
        hasData: Boolean(c.slugAB),
        ab, // a → b yönü
        ba, // b → a yönü
      };
    })
  );

  return json({ crossings: results, source: "borderalarm.com" });
};
