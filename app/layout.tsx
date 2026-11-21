import type { Metadata, Viewport } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://governa-te.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "GOVERNA-TE · A geração por quem se espera", template: "%s · GOVERNA-TE" },
  description:
    "Movimento de desenvolvimento pessoal e iniciativa empreendedora em Angola. Primeiro encontro em Luanda, edição 2027: bilhetes, expositores e patrocínios.",
  openGraph: {
    title: "GOVERNA-TE · A geração por quem se espera",
    description: "Responsabilidade que se transforma em acção. Primeiro encontro em Luanda, edição 2027.",
    locale: "pt_AO",
    type: "website",
    siteName: "GOVERNA-TE",
  },
};

export const viewport: Viewport = { themeColor: "#09090a", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-AO" className={`${inter.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
