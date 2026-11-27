import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-290 px-6 pt-16">
        <div className="bg-tile rounded-[28px] px-7 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-[-0.04em]">Nothing on this menu.</h1>
          <p className="text-muted mt-4 text-[19px]">That page doesn't exist.</p>
          <Link
            href="/"
            className="bg-strong text-on-strong mt-8 inline-block rounded-2xl px-6 py-4 font-semibold hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
