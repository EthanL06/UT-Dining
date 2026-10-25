'use client';

import { motion } from 'framer-motion';
import useKC_DABR_WASM from 'kc-dabr-wasm';
import { ChevronRight, Coffee, Home } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/NavBar';
import { Button } from '@/components/ui/button';

interface SuggestedLink {
  href: string;
  label: string;
}

const suggestedLinks = [
  { href: '/', label: 'Home' },
  { href: '/reviews', label: 'Browse Reviews' },
  { href: '/downloads', label: 'Download App' },
  { href: '/about', label: 'About Us' },
] as const satisfies SuggestedLink[];

export default function NotFound() {
  useKC_DABR_WASM();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container px-4 pt-20 pb-12 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Icon */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              }}
              className="flex justify-center"
            >
              <Coffee className="h-20 w-20 text-primary md:h-24 md:w-24" />
            </motion.div>

            {/* Error Message */}
            <div className="space-y-4">
              <h1 className="font-bold text-4xl md:text-5xl">Oops! Page Not Found</h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Looks like this page took a coffee break. Let&apos;s get you back on track!
              </p>
            </div>

            {/* Primary Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="pt-4"
            >
              <Link href="/">
                <Button size="lg" className="gap-2">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </motion.div>

            {/* Suggested Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="pt-12"
            >
              <h2 className="mb-4 font-semibold text-lg">You might be looking for:</h2>
              <div className="glass mx-auto max-w-md p-4 md:p-6">
                <ul className="space-y-2">
                  {suggestedLinks.map((link, index) => (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                    >
                      <Link
                        href={link.href}
                        className="group flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary"
                      >
                        <span>{link.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
