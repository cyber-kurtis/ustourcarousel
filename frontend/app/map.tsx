import { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const COLORS = {
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
};

// Balkanlar tur buluşma & başlangıç noktaları
const LOCATIONS = [
  { name: "Belgrad — Kalemegdan Kalesi", lat: 44.8215, lng: 20.4513, desc: "Panoramik tur başlangıç noktası, kale girişi" },
  { name: "Belgrad — Cumhuriyet Meydanı", lat: 44.8184, lng: 20.4584, desc: "Şehir turu buluşma noktası" },
  { name: "Üsküp — Makedonyum Meydanı", lat: 41.9965, lng: 21.4314, desc: "Saat kulesi önü, tur buluşma noktası" },
  { name: "Tiran — Skanderbeg Meydanı", lat: 41.3275, lng: 19.8187, desc: "Meydan merkezi, tur başlangıcı" },
  { name: "Saraybosna — Başçarşı", lat: 43.8594, lng: 18.4313, desc: "Büyük çarşı girişi, tur başlangıcı" },
  { name: "Mostar — Eski Köprü", lat: 43.3376, lng: 17.8157, desc: "Stari Most başlangıcı" },
  { name: "Kotor — Deniz Kapısı", lat: 42.4246, lng: 18.7711, desc: "Eski şehir ana girişi" },
  { name: "Budva — Eski Şehir Girişi", lat: 42.2861, lng: 18.8401, desc: "Stara Varoš girişi, tur noktası" },
  { name: "Podgorica — Bağımsızlık Meydanı", lat: 42.4304, lng: 19.2594, desc: "Şehir merkezi buluşma noktası" },
  { name: "Ohrid — Samuel Kalesi", lat: 41.1163, lng: 20.7920, desc: "Kale girişi, panoramik bakış noktası" },
  { name: "Sofya — Nevski Katedrali", lat: 42.6977, lng: 23.3330, desc: "Katedral önü, tur buluşma noktası" },
  { name: "Plovdiv — Eski Şehir", lat: 42.1421, lng: 24.7498, desc: "Tarihi çarşı girişi" },
  { name: "Dubrovnik — Pile Kapısı", lat: 42.6428, lng: 18.1078, desc: "Eski şehir ana girişi" },
  { name: "Split — Diocletianus Sarayı", lat: 43.5086, lng: 16.4400, desc: "Saray girişi, tur başlangıcı" },
  { name: "Priştine — Tereziya Bulvarı", lat: 42.6629, lng: 21.1655, desc: "Merkezi bulvar başlangıcı" },
];

const buildMapHtml = () => {
  const locationsJson = JSON.stringify(LOCATIONS);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; font-family: -apple-system, sans-serif; }

    .leaflet-popup-content-wrapper {
      border-radius: 14px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.18);
      padding: 0;
      overflow: hidden;
    }
    .leaflet-popup-content {
      margin: 0;
      width: 240px !important;
    }
    .popup-inner {
      padding: 16px;
    }
    .popup-name {
      font-size: 14px;
      font-weight: 700;
      color: #003580;
      margin-bottom: 5px;
      line-height: 1.3;
    }
    .popup-desc {
      font-size: 12px;
      color: #6E6E73;
      margin-bottom: 14px;
      line-height: 1.4;
    }
    .popup-btn {
      background: #003580;
      color: white;
      border: none;
      padding: 11px 0;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      letter-spacing: 0.2px;
    }
    .popup-btn:active { opacity: 0.75; }

    /* Onay dialog */
    #overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 9999;
      align-items: flex-end;
      justify-content: center;
    }
    #overlay.show { display: flex; }
    #dialog {
      background: #fff;
      border-radius: 20px 20px 0 0;
      padding: 24px 20px 32px;
      width: 100%;
      max-width: 480px;
    }
    #dialog-title {
      font-size: 16px;
      font-weight: 700;
      color: #1C1C1E;
      margin-bottom: 6px;
      text-align: center;
    }
    #dialog-sub {
      font-size: 13px;
      color: #6E6E73;
      text-align: center;
      margin-bottom: 20px;
    }
    .dialog-btn {
      width: 100%;
      padding: 14px;
      border-radius: 12px;
      border: none;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .btn-yes {
      background: #003580;
      color: white;
    }
    .btn-yes:active { opacity: 0.8; }
    .btn-no {
      background: #F2F2F7;
      color: #003580;
    }
    .btn-no:active { opacity: 0.8; }
  </style>
</head>
<body>
  <div id="map"></div>

  <div id="overlay">
    <div id="dialog">
      <div id="dialog-title">Navigasyon</div>
      <div id="dialog-sub" id="dialog-sub"></div>
      <button class="dialog-btn btn-yes" onclick="confirmYes()">Evet, Git →</button>
      <button class="dialog-btn btn-no" onclick="confirmNo()">Vazgeç</button>
    </div>
  </div>

  <script>
    var map = L.map('map', { center: [42.8, 20.5], zoom: 6 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    var locations = ${locationsJson};
    var pendingUrl = null;

    var pinIcon = L.divIcon({
      html: '<div style="background:#003580;width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    locations.forEach(function(loc) {
      var marker = L.marker([loc.lat, loc.lng], { icon: pinIcon }).addTo(map);
      marker.bindPopup(
        '<div class="popup-inner">' +
          '<div class="popup-name">' + loc.name + '</div>' +
          '<div class="popup-desc">' + loc.desc + '</div>' +
          '<button class="popup-btn" onclick="askNavigate(' + loc.lat + ',' + loc.lng + ',\\'' + loc.name.replace(/'/g, "\\\\'") + '\\')">' +
            '&#9655; Buraya Git' +
          '</button>' +
        '</div>',
        { maxWidth: 260 }
      );
    });

    function askNavigate(lat, lng, name) {
      pendingUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
      document.getElementById('dialog-sub').textContent = name + ' konumuna gitmek istiyor musunuz?';
      document.getElementById('overlay').classList.add('show');
    }

    function confirmYes() {
      document.getElementById('overlay').classList.remove('show');
      if (!pendingUrl) return;
      var url = pendingUrl;
      pendingUrl = null;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', url: url }));
      } else {
        window.open(url, '_blank');
      }
    }

    function confirmNo() {
      pendingUrl = null;
      document.getElementById('overlay').classList.remove('show');
    }
  </script>
</body>
</html>`;
};

const MAP_HTML = buildMapHtml();

export default function MapScreen() {
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "navigate" && data.url) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.open(data.url, "_blank");
        } else {
          Linking.openURL(data.url);
        }
      }
    } catch {}
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.titleWrap}>
          <Ionicons name="map-outline" size={18} color="#CFE0F5" style={{ marginRight: 7 }} />
          <Text style={styles.title}>Konumlar</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        originWhitelist={["*"]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.brandPrimary },
  header: {
    backgroundColor: COLORS.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  map: { flex: 1 },
});
