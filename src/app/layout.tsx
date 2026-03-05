import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { APP_NAME } from '@/lib/constants';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'PWA оболочка ARTSTUDIO Consumables',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-512.svg', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/icons/icon-192.svg', type: 'image/svg+xml' }]
  }
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="ru">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
