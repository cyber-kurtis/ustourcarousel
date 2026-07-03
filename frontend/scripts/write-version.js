#!/usr/bin/env node
// Netlify derlemesi sırasında çalışır (netlify.toml build command).
// Aynı sürüm damgasını iki yere yazar:
//  1. src/lib/version.ts  → pakete gömülür (uygulamanın kendi sürümü)
//  2. public/version.json → sunucudan servis edilir (en son sürüm)
// Uygulama ikisini karşılaştırır; farklıysa "yeni sürüm var" der.
const fs = require("fs");
const path = require("path");

const v = process.env.COMMIT_REF || `local-${Date.now()}`;

fs.writeFileSync(
  path.join(__dirname, "..", "src", "lib", "version.ts"),
  `// Otomatik üretilir (scripts/write-version.js) — elle düzenleme.\nexport const APP_VERSION: string = "${v}";\n`
);
fs.writeFileSync(
  path.join(__dirname, "..", "public", "version.json"),
  JSON.stringify({ v })
);
console.log(`[write-version] sürüm damgası: ${v}`);
