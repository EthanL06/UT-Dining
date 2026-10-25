'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';

interface NavItemProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const NavItem = ({ href, children, className, onClick }: NavItemProps) => {
  const pathname = usePathname();
  // trailingSlash makes the pathname /faq/ while links use /faq.
  const isActive = pathname.replace(/\/$/, '') === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'transition-colors hover:text-primary',
        isActive && 'font-medium text-primary',
        className,
      )}
    >
      {children}
    </Link>
  );
};

const navItems = [
  { href: '/downloads', label: 'Downloads' },
  { href: '/docs', label: 'Docs' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="font-bold text-xl">
          UT Dining
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavItem key={item.href} href={item.href}>
              {item.label}
            </NavItem>
          ))}
          <ThemeToggle />
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 sm:w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-4">
                {navItems.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    className="py-2 text-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </NavItem>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
