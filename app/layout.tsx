import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telekansh — Telegram Web Client',
  description: 'A production-ready Telegram web client built with Next.js and GramJS',
  keywords: ['telegram', 'web client', 'telekansh', 'gramjs', 'mtproto'],
  authors: [{ name: 'Telekansh' }],
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/tg-logo.svg',
    apple: '/tg-logo.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17212b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-tg-bg text-tg-tx antialiased">
        {children}
      </body>
    </html>
  );
}
