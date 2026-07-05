import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

type ImageViewerProps = {
  imageUri: string;
  onClose: () => void;
  title?: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type Transform = { scale: number; tx: number; ty: number };

export function ImageViewer({ imageUri, onClose, title }: ImageViewerProps) {
  const [t, setT] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  const tRef = useRef(t);
  tRef.current = t;

  const stageRef = useRef({ w: 0, h: 0 });
  const gRef = useRef({
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startDist: 0,
    lastTap: 0,
  });

  // Görüntü kenarları ekran dışına tamamen kaçmasın diye pan sınırlanır
  const clamp = (scale: number, tx: number, ty: number): Transform => {
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const maxX = ((s - 1) * stageRef.current.w) / 2;
    const maxY = ((s - 1) * stageRef.current.h) / 2;
    return {
      scale: s,
      tx: Math.min(maxX, Math.max(-maxX, tx)),
      ty: Math.min(maxY, Math.max(-maxY, ty)),
    };
  };

  const zoomBy = (factor: number) => {
    const cur = tRef.current;
    setT(clamp(cur.scale * factor, cur.tx, cur.ty));
  };

  const reset = () => setT({ scale: 1, tx: 0, ty: 0 });

  const onDoubleTap = () => {
    if (tRef.current.scale > 1) reset();
    else setT(clamp(DOUBLE_TAP_SCALE, 0, 0));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (e, g) =>
          e.nativeEvent.touches.length === 2 ||
          Math.abs(g.dx) > 2 ||
          Math.abs(g.dy) > 2,
        onPanResponderGrant: (e) => {
          const cur = tRef.current;
          const gs = gRef.current;
          gs.startScale = cur.scale;
          gs.startTx = cur.tx;
          gs.startTy = cur.ty;
          gs.startDist = 0;
          const touches = e.nativeEvent.touches;
          if (touches.length === 2) {
            gs.startDist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY,
            );
          }
        },
        onPanResponderMove: (e, g) => {
          const touches = e.nativeEvent.touches;
          const gs = gRef.current;
          if (touches.length === 2) {
            // Pinch: iki parmak arası mesafe oranı kadar ölçekle
            const dist = Math.hypot(
              touches[0].pageX - touches[1].pageX,
              touches[0].pageY - touches[1].pageY,
            );
            if (gs.startDist === 0) {
              gs.startDist = dist;
              gs.startScale = tRef.current.scale;
              return;
            }
            setT(clamp((gs.startScale * dist) / gs.startDist, gs.startTx, gs.startTy));
          } else if (gs.startScale > 1) {
            // Tek parmak / fare sürükleme: pan
            setT(clamp(gs.startScale, gs.startTx + g.dx, gs.startTy + g.dy));
          }
        },
        onPanResponderRelease: (_e, g) => {
          const moved = Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
          if (moved) return;
          const now = Date.now();
          if (now - gRef.current.lastTap < DOUBLE_TAP_MS) {
            gRef.current.lastTap = 0;
            onDoubleTap();
          } else {
            gRef.current.lastTap = now;
          }
        },
      }),
    [],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoomBy(1.25);
      if (e.key === "-") zoomBy(1 / 1.25);
      if (e.key === "0") reset();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <View style={styles.backdrop} testID="image-viewer">
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={8}
          testID="image-viewer-close"
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      <View
        style={styles.stage}
        onLayout={(e) => {
          stageRef.current = {
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          };
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.canvas,
            {
              transform: [
                { translateX: t.tx },
                { translateY: t.ty },
                { scale: t.scale },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="contain"
          />
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={styles.controlBtn}
          onPress={() => zoomBy(1 / 1.25)}
          disabled={t.scale <= MIN_SCALE}
          testID="image-viewer-zoom-out"
        >
          <Ionicons
            name="remove"
            size={24}
            color={t.scale <= MIN_SCALE ? "#8E8E93" : "#FFFFFF"}
          />
        </Pressable>

        <Text style={styles.scaleText}>{Math.round(t.scale * 100)}%</Text>

        <Pressable
          style={styles.controlBtn}
          onPress={() => zoomBy(1.25)}
          disabled={t.scale >= MAX_SCALE}
          testID="image-viewer-zoom-in"
        >
          <Ionicons
            name="add"
            size={24}
            color={t.scale >= MAX_SCALE ? "#8E8E93" : "#FFFFFF"}
          />
        </Pressable>

        {t.scale > 1 && (
          <Pressable
            style={styles.controlBtn}
            onPress={reset}
            testID="image-viewer-reset"
          >
            <Ionicons name="contract-outline" size={22} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>
        {Platform.OS === "web"
          ? "Tekerlek: yakınlaştır • Sürükle: kaydır • Çift tık: büyüt/sıfırla • Esc: kapat"
          : "İki parmakla yakınlaştır • Sürükleyerek kaydır • Çift dokunuşla büyüt"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.95)",
    zIndex: 1000,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "web" ? 12 : 48,
    paddingBottom: 12,
    zIndex: 2,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    flex: 1,
    overflow: "hidden",
    ...(Platform.OS === "web" ? ({ touchAction: "none" } as any) : null),
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  scaleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    minWidth: 56,
    textAlign: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    textAlign: "center",
    paddingBottom: Platform.OS === "web" ? 12 : 28,
    paddingHorizontal: 16,
  },
});
