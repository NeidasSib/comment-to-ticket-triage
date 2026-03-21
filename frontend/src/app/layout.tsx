import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comment to ticket triage backend showcase",
  description:
    "Submit comments and browse tickets—demo for AI-assisted triage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
