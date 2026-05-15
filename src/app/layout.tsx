import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coach Pulse — Avatar Practice",
  description:
    "Live avatar practice for Coach associates. A demo of the Coach Pulse practice experience powered by HeyGen LiveAvatar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
