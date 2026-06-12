import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

const isWeb = Platform.OS === "web";

// web.output "single" (SPA) modunda +html.tsx kullanılmadığı için viewport ve
// zoom ayarları runtime'da yapılmak zorunda.
function useWebPageSetup() {
  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;

    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    );

    const style = document.createElement("style");
    style.textContent = `
      html, body { touch-action: pan-x pan-y; overscroll-behavior: none; }
      input, textarea { font-size: 16px !important; }
    `;
    document.head.appendChild(style);

    // iOS Safari, user-scalable=no'yu yok sayar — pinch zoom'u gesture
    // event'lerini iptal ederek engellemek gerekir.
    const preventGesture = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", preventGesture);
    document.addEventListener("gesturechange", preventGesture);
    document.addEventListener("gestureend", preventGesture);

    // Çift dokunmayla zoom'u engelle.
    let lastTouchEnd = 0;
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", preventDoubleTapZoom, {
      passive: false,
    });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchend", preventDoubleTapZoom);
      style.remove();
    };
  }, []);
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  useWebPageSetup();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  const stack = <Stack screenOptions={{ headerShown: false }} />;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        {isWeb ? (
          // Masaüstünde app telefon genişliğinde ortalanmış bir kolon olarak
          // durur; mobil tarayıcıda maxWidth zaten ekrandan büyük olduğu için
          // etkisi yoktur.
          <View style={styles.webBackdrop}>
            <View style={styles.webColumn}>{stack}</View>
          </View>
        ) : (
          stack
        )}
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#00142E",
  },
  webColumn: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#003580",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 32,
  },
});
