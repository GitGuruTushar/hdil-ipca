// app/layout.js
import { Schibsted_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/pwa/pwa-register";
import InstallPrompt from "@/components/pwa/install-prompt";

const schibsted = Schibsted_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "HDIL-IPCA — HDIL Industrial Park, Virar (East)",
    template: "%s — HDIL-IPCA",
  },
  description:
    "HDIL-IPCA is the federation of the HDIL Industrial Park, Chandansar, Virar (East) — uniting property owners, businesses and workers to build a thriving industrial community.",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/ipcalogo.png`,
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/pwa/apple-touch-icon.png`,
  },
  openGraph: {
    title: "HDIL-IPCA — HDIL Industrial Park, Virar (East)",
    description:
      "The federation of the HDIL Industrial Park, Chandansar, Virar (East) — uniting property owners, businesses and workers.",
    type: "website",
  },
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest.webmanifest`,
};

// themeColor lives in the viewport export, not metadata, per the App Router
// metadata API (Next.js warns and silently drops it if placed in `metadata`).
export const viewport = {
  themeColor: "#4F46E2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${schibsted.variable} ${jakarta.variable} font-sans antialiased bg-white`}
      >
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
