import "./globals.css";
import type { Metadata } from "next";

const SITE_URL = "https://ahmed-dlshad-portfolio.vercel.app";
const TITLE = "Ahmed Dlshad — Full-Stack & Agentic AI Engineer";
const DESCRIPTION =
  "Full-Stack & Agentic AI Engineer building React/Next.js and Node.js products and Model Context Protocol (MCP) agent systems — including Companion, an agentic AI desktop controller.";

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
        url: "/imgs/hero-image.png",
        alt: "Ahmed Dlshad — Full-Stack & Agentic AI Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/imgs/hero-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/jpg" href="/imgs/favicon.jpg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
