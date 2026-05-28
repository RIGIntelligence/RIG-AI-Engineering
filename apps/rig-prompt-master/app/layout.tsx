import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RIG Master Prompter",
  description: "Production prompt workbench, context control plane, agent approvals, and ProofPackets.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
