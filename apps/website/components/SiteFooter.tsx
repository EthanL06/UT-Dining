import Link from 'next/link';
import { GITHUB_URL } from '@/lib/site';
import { StatusLink } from './StatusLink';

export function SiteFooter() {
  return (
    <footer className="text-muted mx-auto flex max-w-290 flex-wrap justify-between gap-4 px-6 pt-24 pb-12 text-sm">
      <span>Built by UT students. Not affiliated with UT Austin.</span>
      <span className="flex gap-5">
        <Link href="/privacy-policy/" className="hover:text-ink">
          Privacy Policy
        </Link>
        <Link href="/changelog/" className="hover:text-ink">
          Changelog
        </Link>
        <StatusLink />
        <a href={GITHUB_URL} className="hover:text-ink">
          GitHub
        </a>
      </span>
    </footer>
  );
}
