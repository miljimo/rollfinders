import type { Metadata } from "next";
import { ThemeStyleProvider } from "@/app/_components/ThemeStyleProvider";
import "@miljimo/react-components/styles.css";
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ThemeStyleProvider>{children}</ThemeStyleProvider>
      </body>
    </html>
  );
}
