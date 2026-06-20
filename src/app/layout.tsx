import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RollFinders | London BJJ open mats and academies",
  description: "Find Brazilian Jiu-Jitsu academies and open mats in London in under 30 seconds.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
