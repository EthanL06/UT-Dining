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
        <div className="rounded-[28px] bg-tile px-7 py-20 text-center">
          <h1 className="font-bold text-5xl tracking-[-0.04em]">Nothing on this menu.</h1>
          <p className="mt-4 text-[19px] text-muted">That page doesn't exist.</p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-2xl bg-strong px-6 py-4 font-semibold text-on-strong hover:opacity-90"
          >
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
