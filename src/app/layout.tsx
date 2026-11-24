import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MesaMétrica — Planifica mesas con criterio",
  description: "Distribución inteligente y explicable de invitados para eventos."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
