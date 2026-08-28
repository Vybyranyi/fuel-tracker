import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/features/pwa/components/service-worker-registrar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic-ext"],
});

export const metadata: Metadata = {
  title: "Пальне",
  description: "Облік заправок і витрат на пальне",
  manifest: "/manifest.webmanifest",
  // Без цього блоку iPhone відкривав би застосунок з головного екрана як
  // звичайну вкладку Safari — з адресним рядком і без пуш-сповіщень.
  appleWebApp: {
    capable: true,
    title: "Пальне",
    // Смуга стану лишається системною: `black-translucent` дав би білий текст
    // завжди, і на світлій темі його не було б видно.
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Застосунок відкривають з головного екрана iPhone — зум по подвійному тапу
  // на числових полях там тільки заважає.
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Змінні шрифтів вішаємо на <html>, а не на <body>: `@theme inline`
    // резолвить --font-sans у :root, і на body воно б їх уже не побачило.
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
          <ServiceWorkerRegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
