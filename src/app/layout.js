// app/layout.js
import { Schibsted_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

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
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/ipcalogo.png` },
  openGraph: {
    title: "HDIL-IPCA — HDIL Industrial Park, Virar (East)",
    description:
      "The federation of the HDIL Industrial Park, Chandansar, Virar (East) — uniting property owners, businesses and workers.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${schibsted.variable} ${jakarta.variable} font-sans antialiased bg-white`}
      >
        {children}
      </body>
    </html>
  );
}
