// API adresi — tek kaynak.
//
// NEDEN: Site hem ustnaviguide.netlify.app hem ustnaviguide.kurtiscode.com
// üzerinden açılıyor. Netlify, özel alan adı birincil yapıldığı için
// netlify.app adresini kurtiscode.com'a 301 ile yönlendiriyor. Pakete gömülü
// mutlak adres (EXPO_PUBLIC_BACKEND_URL=https://ustnaviguide.netlify.app)
// kullanılırsa her istek çapraz kaynak (cross-origin) + yönlendirme olur ve
// tarayıcı CORS nedeniyle hepsini bloklar → "Failed to fetch".
//
// ÇÖZÜM: Web'de her zaman göreli yol kullan. Site hangi alan adından açılırsa
// istek de oraya gider; netlify.toml'daki /api/* yönlendirmeleri devreye girer,
// çapraz kaynak isteği hiç oluşmaz.
//
// Native (iOS/Android) derlemede göreli yol çözülemediği için mutlak adres
// gerekir; oradaki değer EXPO_PUBLIC_BACKEND_URL ile ezilebilir.

import { Platform } from "react-native";

/** Native derlemede kullanılacak varsayılan mutlak adres (birincil alan adı). */
export const SITE_URL = "https://ustnaviguide.kurtiscode.com";

/**
 * Tüm `/api/...` ve `/.netlify/...` çağrılarının önüne eklenecek kök.
 * Web'de "" (göreli/aynı origin), native'de mutlak adres.
 */
export const API_BASE =
  Platform.OS === "web" ? "" : process.env.EXPO_PUBLIC_BACKEND_URL || SITE_URL;
