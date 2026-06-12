// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  const title = "UStour — Otelleri Keşfet";
  const description =
    "Balkanlar'daki anlaşmalı otelleri keşfet: Üsküp, Ohrid, Saraybosna, İşkodra ve daha fazlası. UStour — Welcome Home.";
  const url = "https://ustnaviguide.netlify.app/";
  const ogImage = "https://ustnaviguide.netlify.app/og-image.png";

  return (
    <html lang="tr" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, user-scalable=no"
        />

        <meta name="description" content={description} />
        <meta name="theme-color" content="#003580" />

        {/* Open Graph — WhatsApp, Facebook, Instagram, Telegram link önizlemesi */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="UStour" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="UStour — Welcome Home" />
        <meta property="og:locale" content="tr_TR" />

        {/* Twitter / X kartı */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />

        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; max-width: 480px; margin: 0 auto; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
