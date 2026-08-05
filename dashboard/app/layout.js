import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Code Survival Intelligence — Predict When Your Code Will Fail",
  description:
    "A hybrid predictive framework combining survival analysis, machine learning, and AST parsing to deliver cost-optimal software failure risk modeling and ROI-driven refactoring recommendations.",
  keywords: [
    "survival analysis",
    "code quality",
    "technical debt",
    "Cox proportional hazards",
    "software failure prediction",
    "ROI refactoring",
  ],
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
