// Görsel optimizasyonu — Netlify Image CDN.
// Otel/restoran görselleri dış sitelerden ham (1-3 MB) geliyor; bu yardımcı
// onları Netlify'ın görsel servisinden küçültülmüş/sıkıştırılmış (WebP/AVIF)
// olarak geçirir. Telefonda liste kaydırması belirgin hızlanır.

import { API_BASE } from "@/src/lib/api";

export function optimizedImage(
  url?: string | null,
  width = 480,
  quality = 60
): string | undefined {
  if (!url) return undefined;
  // Panelden yüklenen base64 (data:) görseller proxy'lenemez — olduğu gibi
  if (url.startsWith("data:")) return url;
  return `${API_BASE}/.netlify/images?url=${encodeURIComponent(
    url
  )}&w=${width}&q=${quality}&fit=cover`;
}
