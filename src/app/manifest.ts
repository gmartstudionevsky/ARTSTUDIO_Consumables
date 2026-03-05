import type { MetadataRoute } from 'next';

import { APP_NAME } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: 'Consumables',
    description: 'PWA-оболочка ARTSTUDIO Consumables',
    start_url: '/stock',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    lang: 'ru',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  };
}
