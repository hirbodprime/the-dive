import type { Metadata, Viewport } from 'next';
import { Share_Tech_Mono, VT323, Permanent_Marker, Inter, Chakra_Petch } from 'next/font/google';
import { profile } from '@/content/data';
import './globals.css';

const mono = Share_Tech_Mono({ weight: '400', subsets: ['latin'], variable: '--f-mono' });
const vt = VT323({ weight: '400', subsets: ['latin'], variable: '--f-vt' });
const sans = Inter({ subsets: ['latin'], variable: '--f-sans' });
const display = Chakra_Petch({ weight: ['500', '600', '700'], subsets: ['latin'], variable: '--f-display' });
const hand = Permanent_Marker({ weight: '400', subsets: ['latin'], variable: '--f-hand' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: `${profile.name} — Backend Engineer`,
  description: `${profile.name}: ${profile.role}. Django, DRF, PostgreSQL, Redis, Celery. Based in ${profile.location}.`,
  // link previews show the Night City title card, never a personal photo
  openGraph: { type: 'website', url: '/', siteName: 'The Dive', title: `${profile.name} — The Dive`, description: 'A portfolio you don\u2019t scroll — you jack in. Five real-time 3D worlds, from Night City to the Moon.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'The Dive: a neon Night City title screen' }] },
  twitter: { card: 'summary_large_image', images: ['/og.jpg'] },
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { themeColor: '#07040f', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${vt.variable} ${hand.variable} ${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
