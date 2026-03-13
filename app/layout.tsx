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
      <body>{children}</body>
    </html>
  );
}
