import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';

import './globals.css';

import { Providers } from './providers';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Barber Admin',
  description: 'White-label admin panel za barber booking MVP',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable}`}
        style={{ fontFamily: 'var(--font-body), sans-serif' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
