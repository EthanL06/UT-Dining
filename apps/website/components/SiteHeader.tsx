import { Menu, Moon, Sun, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL, asset } from '@/lib/site';

const menuLinks = [
  { href: '/#features', label: 'Features' },
  { href: '/changelog/', label: 'Changelog' },
  { href: '/privacy-policy/', label: 'Privacy Policy' },
];

export function SiteHeader() {
  return (
    <header className="relative mx-auto flex h-18 max-w-290 items-center justify-between gap-3 px-6">
      <Link
        href="/"
        className="flex shrink-0 items-center gap-2.5 whitespace-nowrap font-bold text-lg max-[359px]:gap-2 max-[359px]:text-base"
      >
        <Image
          src={asset('/app-icon.svg')}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-[9px] max-[359px]:size-7"
        />
        UT Dining
      </Link>
      <nav className="flex items-center gap-1 rounded-full bg-tile p-1.5 text-[15px] max-[359px]:gap-0">
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
        <Link
          href="/changelog/"
          className="hidden rounded-full px-3.5 py-2 hover:text-accent-text sm:block"
        >
          Changelog
        </Link>
        <a
          href={APP_STORE_URL}
          className="whitespace-nowrap rounded-full bg-accent px-3.5 py-2 font-semibold text-white hover:opacity-90 max-[359px]:px-3"
        >
          Download
        </a>
        <details data-menu className="group sm:hidden">
          <summary
            aria-label="Menu"
            className="flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-muted hover:text-ink [&::-webkit-details-marker]:hidden"
          >
            <Menu size={20} strokeWidth={2} aria-hidden className="group-open:hidden" />
            <X size={20} strokeWidth={2} aria-hidden className="hidden group-open:block" />
          </summary>
          <div className="absolute inset-x-6 top-full z-20 mt-1 flex flex-col rounded-3xl border border-line bg-tile p-2 shadow-xl">
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl px-4 py-3 font-semibold text-base hover:bg-tile"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
