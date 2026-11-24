import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "MesaMétrica · Distribución de mesas explicable",
  description: "Distribuye invitados entre mesas respetando afinidades y conflictos, con un algoritmo determinista que explica cada decisión."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" }
  ]
};

// Aplica el tema guardado antes del primer pintado para evitar un parpadeo.
const themeScript = `try{var t=localStorage.getItem("mm-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" data-theme="light" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        {children}
      </body>
    </html>
  );
}
