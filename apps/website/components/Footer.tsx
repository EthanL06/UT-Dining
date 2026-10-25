'use client';

import { Github } from 'lucide-react';
import Link from 'next/link';

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

interface FooterColumnProps {
  title: string;
  children: React.ReactNode;
}

const FooterLink = ({ href, children, external = false }: FooterLinkProps) => {
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-primary"
      {...linkProps}
    >
      {children}
    </Link>
  );
};

const FooterColumn = ({ title, children }: FooterColumnProps) => {
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-base">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
};

const footerLinks = {
  product: [
    { href: '/downloads', label: 'Downloads' },
    { href: '/#features', label: 'Features' }, // TODO
    { href: '/reviews', label: 'Reviews' }, // TODO
  ],
  resources: [
    { href: '/docs', label: 'Documentation' },
    { href: '/faq', label: 'FAQ' },
    { href: '/about', label: 'About' },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container px-4 py-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          {/* About Column */}
          <div className="col-span-2 space-y-3 sm:col-span-2 md:col-span-1">
            <h3 className="font-bold text-base">UT Dining</h3>
            <p className="text-muted-foreground text-sm">
              Making campus dining better for every Longhorn.
            </p>
          </div>

          {/* Product Column */}
          <FooterColumn title="Product">
            {footerLinks.product.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          {/* Resources Column */}
          <FooterColumn title="Resources">
            {footerLinks.resources.map((link) => (
              <li key={link.href}>
                <FooterLink href={link.href}>{link.label}</FooterLink>
              </li>
            ))}
          </FooterColumn>

          {/* Connect Column */}
          <FooterColumn title="Connect">
            <li>
              <FooterLink href="https://github.com/Longhorn-Developers/ut-dining-website" external>
                <Github className="h-4 w-4" />
                GitHub
              </FooterLink>
            </li>
          </FooterColumn>
        </div>

        {/* Copyright Section */}
        <div className="mt-8 border-t pt-6 text-center text-muted-foreground text-sm">
          <p className="mx-auto max-w-lg">
            &copy; {new Date().getFullYear()} UT Dining. A Longhorn Developers Project.
          </p>
        </div>
      </div>
    </footer>
  );
}
