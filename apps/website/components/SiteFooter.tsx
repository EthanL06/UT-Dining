import { Monitor, Moon, Sun } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { APP_STORE_URL, asset, GITHUB_URL, STATUS_URL } from '@/lib/site';
import { StatusPill } from './StatusPill';

const linkClass = 'text-muted hover:text-ink';

const themeChoices = [
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'system', label: 'System theme', Icon: Monitor },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
] as const;

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-290 px-6 pt-10 pb-8 text-sm md:pt-16">
      <div className="bg-tile grid gap-7 rounded-[28px] px-6 py-7 md:gap-9 md:p-10">
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-[1.6fr_1fr_1fr] md:gap-8">
          <div className="col-span-2 grid content-start justify-items-start gap-3.5 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 text-[17px] font-bold">
              <Image
                src={asset('/app-icon.svg')}
                alt=""
                width={30}
                height={30}
                className="size-7.5 rounded-[8px]"
              />
              UT Dining
            </Link>
            <p className="text-muted max-w-[30ch]">
              Every dining hall, café and food truck at UT, in one app.
            </p>
            <StatusPill />
          </div>
          <nav aria-label="App" className="grid content-start gap-2.25">
            <h2 className="text-ink mb-1 text-[13px] font-semibold">App</h2>
            <Link href="/#features" className={linkClass}>
              Features
            </Link>
            <a href={APP_STORE_URL} className={linkClass}>
              Download
            </a>
            <Link href="/changelog/" className={linkClass}>
              Changelog
            </Link>
          </nav>
          <nav aria-label="Project" className="grid content-start gap-2.25">
            <h2 className="text-ink mb-1 text-[13px] font-semibold">Project</h2>
            <a href={STATUS_URL} className={linkClass}>
              Status
            </a>
            <a href={GITHUB_URL} className={linkClass}>
              GitHub
            </a>
            <Link href="/privacy-policy/" className={linkClass}>
              Privacy Policy
            </Link>
          </nav>
        </div>
        <div className="border-line text-muted flex flex-col-reverse items-start gap-4 border-t pt-5.5 md:flex-row md:items-center md:justify-between">
          <span>Built by UT students. Not affiliated with UT Austin.</span>
          <fieldset className="bg-bg inline-flex gap-0.5 rounded-full p-0.75">
            <legend className="sr-only">Theme</legend>
            {themeChoices.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                data-theme-choice={value}
                aria-label={label}
                aria-pressed="false"
                className="text-muted hover:text-ink aria-pressed:bg-tile aria-pressed:text-ink flex size-7 items-center justify-center rounded-full aria-pressed:shadow-sm"
              >
                <Icon size={15} strokeWidth={2} aria-hidden />
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </footer>
  );
}
