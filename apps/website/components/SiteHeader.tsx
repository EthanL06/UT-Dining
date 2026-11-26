import { Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL, asset } from '@/lib/site';

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-18 max-w-290 items-center justify-between gap-4 px-6">
      <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap font-bold text-lg">
        <Image
          src={asset('/app-icon.svg')}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-[9px]"
        />
        UT Dining
      </Link>
      <nav className="flex items-center gap-1 rounded-full bg-tile p-1.5 text-[15px]">
        <button
          type="button"
          data-theme-toggle
          aria-label="Dark mode"
          aria-pressed="false"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:text-ink"
        >
          <Moon size={18} strokeWidth={2} aria-hidden className="theme-icon-light" />
          <Sun size={18} strokeWidth={2} aria-hidden className="theme-icon-dark" />
        </button>
        <Link
          href="/#features"
          className="hidden rounded-full px-3.5 py-2 hover:text-accent-text sm:block"
        >
          Features
        </Link>
        <Link href="/changelog/" className="rounded-full px-3.5 py-2 hover:text-accent-text">
          Changelog
        </Link>
        <a
          href={APP_STORE_URL}
          className="rounded-full bg-accent px-3.5 py-2 font-semibold text-white hover:opacity-90"
        >
          Download
        </a>
      </nav>
    </header>
  );
}
