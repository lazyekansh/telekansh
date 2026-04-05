import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Telekansh',
    short_name: 'Telekansh',
    description: 'Telegram-style web client built with Next.js and GramJS',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#17212b',
    theme_color: '#17212b',
    icons: [
      {
        src: '/tg-logo.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/tg-logo-maskable.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
