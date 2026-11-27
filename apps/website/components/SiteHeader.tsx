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
        aria-label="UT Dining home"
        className="flex shrink-0 items-center gap-2.5 text-lg font-bold whitespace-nowrap"
      >
        <Image
          src={asset('/app-icon.svg')}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-[9px]"
        />
        <span className="sr-only sm:not-sr-only">UT Dining</span>
      </Link>
      <nav className="bg-tile flex items-center gap-1 rounded-full p-1.5 text-[15px]">
        <button
          type="button"
          data-theme-toggle
          aria-label="Dark mode"
          aria-pressed="false"
          className="text-muted hover:text-ink hidden size-9 items-center justify-center rounded-full sm:flex"
        >
          <Moon size={18} strokeWidth={2} aria-hidden className="theme-icon-light" />
          <Sun size={18} strokeWidth={2} aria-hidden className="theme-icon-dark" />
        </button>
        <Link
          href="/#features"
          className="hover:text-accent-text hidden rounded-full px-3.5 py-2 sm:block"
        >
          Features
        </Link>
        <Link
          href="/changelog/"
          className="hover:text-accent-text hidden rounded-full px-3.5 py-2 sm:block"
        >
          Changelog
        </Link>
        <a
          href={APP_STORE_URL}
          className="bg-accent rounded-full px-3.5 py-2 font-semibold whitespace-nowrap text-white hover:opacity-90"
        >
          Download
        </a>
        <details data-menu className="group sm:hidden">
          <summary
            aria-label="Menu"
            className="text-muted hover:text-ink flex size-9 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden"
          >
            <Menu size={20} strokeWidth={2} aria-hidden className="group-open:hidden" />
            <X size={20} strokeWidth={2} aria-hidden className="hidden group-open:block" />
          </summary>
          <div className="border-line bg-tile absolute inset-x-6 top-full z-20 mt-1 flex flex-col rounded-3xl border p-2 shadow-xl">
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:bg-tile rounded-2xl px-4 py-3 text-base font-semibold"
              >
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              data-theme-toggle
              aria-pressed="false"
              className="hover:bg-tile flex items-center justify-between rounded-2xl px-4 py-3 text-left text-base font-semibold"
            >
              <span className="theme-icon-light">Dark mode</span>
              <span className="theme-icon-dark">Light mode</span>
              <Moon size={18} strokeWidth={2} aria-hidden className="theme-icon-light text-muted" />
              <Sun size={18} strokeWidth={2} aria-hidden className="theme-icon-dark text-muted" />
            </button>
          </div>
        </details>
      </nav>
    </header>
  );
}
