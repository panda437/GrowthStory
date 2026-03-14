import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GrowthStory",
    template: "%s | GrowthStory"
  },
  description:
    "GrowthStory turns public startup coverage into clear, evidence-backed growth playbooks for founders, marketers, and operators.",
  keywords: [
    "startup growth strategy",
    "growth playbook",
    "growth marketing analysis",
    "startup research",
    "AI growth teardown"
  ],
  robots: {
    index: true,
    follow: true
  },
  openGraph: {
    title: "GrowthStory",
    description:
      "Evidence-backed startup growth playbooks generated from public web sources.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowthStory",
    description:
      "Evidence-backed startup growth playbooks generated from public web sources."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a
          href="https://exa.ai"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(65, 53, 44, 0.12)",
            background: "rgba(255, 250, 244, 0.94)",
            boxShadow: "0 12px 30px rgba(76, 54, 36, 0.08)",
            color: "#1f1f1f",
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(8px)"
          }}
        >
          <img
            src="https://www.google.com/s2/favicons?domain=exa.ai&sz=64"
            alt="Exa"
            width={18}
            height={18}
            style={{ display: "block", borderRadius: 4 }}
          />
          <span>Sponsored by Exa.ai</span>
        </a>
        {children}
      </body>
    </html>
  );
}
