import "./globals.css";
import type { Metadata } from "next";
import { Archivo, Space_Grotesk } from "next/font/google";

const SITE_URL = "https://ahmed-dlshad-portfolio.vercel.app";
const TITLE = "Ahmed Dlshad — Full-Stack & Agentic AI Engineer";
const DESCRIPTION =
  "Full-Stack & Agentic AI Engineer building React/Next.js and Node.js products and Model Context Protocol (MCP) agent systems — including Companion, an agentic AI desktop controller.";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Ahmed Dlshad",
    "Ahmed Dlshad Mohammed",
    "Full-Stack Engineer",
    "Agentic AI Engineer",
    "MCP",
    "Model Context Protocol",
    "React",
    "Next.js",
    "Node.js",
    "AI Engineer",
    "Portfolio",
  ],
  authors: [{ name: "Ahmed Dlshad Mohammed", url: SITE_URL }],
  creator: "Ahmed Dlshad Mohammed",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Ahmed Dlshad — Portfolio",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/imgs/og-card.png",
        width: 1200,
        height: 630,
        alt: "Ahmed Dlshad — Full-Stack & Agentic AI Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/imgs/og-card.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
