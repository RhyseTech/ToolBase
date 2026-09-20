import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsProvider";
import { AppShell } from "@/components/AppShell";
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ToolBase | Executive Intelligence Suite",
  description: "Curated portfolio of frontier cognitive engines",
  icons: {
    icon: "/toolbase-mark.svg",
    apple: "/toolbase-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased dark`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        {/* Apply saved theme before paint to avoid flash + enable live settings */}
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var r=localStorage.getItem('aitoolbox-settings-v1');if(!r)return;var s=JSON.parse(r);var h=document.documentElement;var m=s.theme==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):s.theme;h.classList.toggle('dark',m==='dark');h.classList.toggle('light',m==='light');h.style.colorScheme=m;h.style.fontSize=s.fontSize==='small'?'14px':s.fontSize==='large'?'18px':'16px';var A={gold:{'--color-primary':'#ffe09d','--color-on-primary':'#3f2e00','--color-primary-container':'#e5c378','--color-on-primary-container':'#684f0f','--color-secondary':'#e9c349','--color-on-secondary':'#3c2f00','--color-secondary-container':'#af8d11','--color-on-secondary-container':'#342800','--color-surface-tint':'#e4c277','--color-inverse-primary':'#745b1a','--color-primary-fixed':'#ffdf9b','--color-primary-fixed-dim':'#e4c277','--color-secondary-fixed':'#ffe088','--color-secondary-fixed-dim':'#e9c349'},blue:{'--color-primary':'#c9dcfa','--color-on-primary':'#10294d','--color-primary-container':'#5a8fd6','--color-on-primary-container':'#0c1f3a','--color-secondary':'#8fb8ec','--color-on-secondary':'#0f2a4d','--color-secondary-container':'#2f5d9f','--color-on-secondary-container':'#dbe9ff','--color-surface-tint':'#8fb8ec','--color-inverse-primary':'#3f6ea8','--color-primary-fixed':'#c9dcfa','--color-primary-fixed-dim':'#8fb8ec','--color-secondary-fixed':'#b8d2f4','--color-secondary-fixed-dim':'#8fb8ec'},green:{'--color-primary':'#c4e9cf','--color-on-primary':'#0d3b22','--color-primary-container':'#4da56a','--color-on-primary-container':'#08271a','--color-secondary':'#8fd0a4','--color-on-secondary':'#0d3b22','--color-secondary-container':'#2e7d4f','--color-on-secondary-container':'#dcf5e4','--color-surface-tint':'#8fd0a4','--color-inverse-primary':'#3a7d55','--color-primary-fixed':'#c4e9cf','--color-primary-fixed-dim':'#8fd0a4','--color-secondary-fixed':'#b5e2c2','--color-secondary-fixed-dim':'#8fd0a4'},purple:{'--color-primary':'#ddcefb','--color-on-primary':'#341863','--color-primary-container':'#8b6fd6','--color-on-primary-container':'#22103f','--color-secondary':'#bda6f2','--color-on-secondary':'#341863','--color-secondary-container':'#5b4396','--color-on-secondary-container':'#e9defc','--color-surface-tint':'#bda6f2','--color-inverse-primary':'#6a4fa3','--color-primary-fixed':'#ddcefb','--color-primary-fixed-dim':'#bda6f2','--color-secondary-fixed':'#cdbcf5','--color-secondary-fixed-dim':'#bda6f2'}};var L={gold:{'--color-primary':'#9a731d','--color-on-primary':'#fffdf4','--color-primary-container':'#ebd198','--color-on-primary-container':'#4f3d17','--color-secondary':'#816322','--color-on-secondary':'#fffdf4','--color-secondary-container':'#e6d2a8','--color-on-secondary-container':'#4f3d17','--color-surface-tint':'#ab7f21','--color-inverse-primary':'#9b7d3b','--color-primary-fixed':'#efd9a9','--color-primary-fixed-dim':'#e0b65c','--color-secondary-fixed':'#eadab8','--color-secondary-fixed-dim':'#d5b671'},blue:{'--color-primary':'#255493','--color-on-primary':'#fffdf4','--color-primary-container':'#9dbde7','--color-on-primary-container':'#172f4f','--color-secondary':'#284c7b','--color-on-secondary':'#fffdf4','--color-secondary-container':'#a8c3e6','--color-on-secondary-container':'#172f4f','--color-surface-tint':'#295ea3','--color-inverse-primary':'#3b659b','--color-primary-fixed':'#adc8eb','--color-primary-fixed-dim':'#6496d8','--color-secondary-fixed':'#bbcee7','--color-secondary-fixed-dim':'#779dcf'},green:{'--color-primary':'#30884d','--color-on-primary':'#fffdf4','--color-primary-container':'#a9daba','--color-on-primary-container':'#174f2a','--color-secondary':'#366d48','--color-on-secondary':'#fffdf4','--color-secondary-container':'#a8e6bd','--color-on-secondary-container':'#174f2a','--color-surface-tint':'#3d8f58','--color-inverse-primary':'#3b9b5b','--color-primary-fixed':'#b8e0c5','--color-primary-fixed-dim':'#77c591','--color-secondary-fixed':'#c2e0cc','--color-secondary-fixed-dim':'#86c199'},purple:{'--color-primary':'#44288f','--color-on-primary':'#fffdf4','--color-primary-container':'#b2a0e4','--color-on-primary-container':'#26174f','--color-secondary':'#3f2b78','--color-on-secondary':'#fffdf4','--color-secondary-container':'#b9a8e6','--color-on-secondary-container':'#26174f','--color-surface-tint':'#4b2d9f','--color-inverse-primary':'#553b9b','--color-primary-fixed':'#bfafe9','--color-primary-fixed-dim':'#8568d4','--color-secondary-fixed':'#c8bde6','--color-secondary-fixed-dim':'#907acc'}};var CM=m==='light'?s.customAccentTokensLight:s.customAccentTokens;var T=((s.accent==='custom'&&CM&&Object.keys(CM).length>0&&CM)||(m==='light'?L:A)[s.accent]||(m==='light'?L:A).gold);for(var k in T){h.style.setProperty(k,T[k]);}h.dataset.accent=s.accent||'gold';if(s.compactMode||s.density==='compact'){h.style.setProperty('--spacing-space-lg','1rem');h.style.setProperty('--spacing-space-md','0.625rem');}if(s.animations===false){document.addEventListener('DOMContentLoaded',function(){document.body.classList.add('no-animations')});}}catch(e){}}})();`,
          }}
        />
      </head>
      <body className="bg-background text-on-surface font-body-md text-body-md selection:bg-primary selection:text-on-primary min-h-screen" suppressHydrationWarning>
        <SettingsProvider>
        <AppShell>
          {children}
        </AppShell>
        </SettingsProvider>
      </body>
    </html>
  );
}
