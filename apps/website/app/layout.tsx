import type { Metadata } from 'next';
import { Inter_Tight } from 'next/font/google';
import { asset } from '@/lib/site';
import './globals.css';

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'UT Dining',
  description:
    'Menus, hours, nutrition and a campus map for every place to eat at UT Austin. Free for iPhone.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src={asset('/theme.js')} />
      </head>
      <body className={`${interTight.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
