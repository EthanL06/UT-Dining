import type { Metadata, Viewport } from 'next';
import { Inter_Tight } from 'next/font/google';
import { APP_STORE_ID, asset, ogImages, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'UT Dining · Menus and hours for every place to eat at UT Austin',
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: 'UT Dining',
  publisher: 'UT Dining',
  formatDetection: { telephone: false, email: false, address: false },
  itunes: { appId: APP_STORE_ID },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    images: ogImages(),
  },
  twitter: { card: 'summary_large_image', images: ogImages() },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={interTight.variable}>
      <head>
        <script src={asset('/theme.js')} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
