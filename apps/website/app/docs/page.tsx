'use client';

import { motion } from 'framer-motion';
import useKC_DABR_WASM from 'kc-dabr-wasm';
import {
  Box,
  ChevronRight,
  Command,
  Database,
  GitBranch,
  Package,
  Palette,
  Smartphone,
  Workflow,
} from 'lucide-react';
import { type JSX, useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/NavBar';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  title: string;
  icon: JSX.Element;
  content: string;
}

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Command className="h-5 w-5 md:h-6 md:w-6" />,
    content: `Our tech stack is carefully chosen to provide the best development experience while maintaining high performance and reliability. Here's what you need to get started:

1. Install Node.js (v18+)
2. Install pnpm: npm install -g pnpm
3. Clone the repository
4. Run pnpm install
5. Start the development server`,
  },
  {
    id: 'framework',
    title: 'Framework',
    icon: <Smartphone className="h-5 w-5 md:h-6 md:w-6" />,
    content: `We use Expo and React Native as our primary framework. This allows us to:
- Develop for both iOS and Android simultaneously
- Leverage native device features
- Use hot reloading for faster development
- Access Expo's extensive library of pre-built components`,
  },
  {
    id: 'state-management',
    title: 'State Management',
    icon: <Workflow className="h-5 w-5 md:h-6 md:w-6" />,
    content: `Zustand is our choice for state management because it's:
- Simple and lightweight
- TypeScript-friendly
- Has minimal boilerplate
- Supports middleware and devtools
- Perfect for both local and global state`,
  },
  {
    id: 'styling',
    title: 'Styling',
    icon: <Palette className="h-5 w-5 md:h-6 md:w-6" />,
    content: `We use NativeWind (powered by Tailwind CSS) for styling:
- Utility-first CSS approach
- Consistent design system
- Responsive layouts
- Dark mode support
- Custom theme configuration`,
  },
  {
    id: 'build-tools',
    title: 'Build Tools',
    icon: <Package className="h-5 w-5 md:h-6 md:w-6" />,
    content: `Our build process is handled by:
- pnpm: Fast, disk space efficient package manager
- Metro bundler: React Native's default bundler
- Custom build scripts for different environments`,
  },
  {
    id: 'database',
    title: 'Database',
    icon: <Database className="h-5 w-5 md:h-6 md:w-6" />,
    content: `Supabase powers our backend infrastructure:
- PostgreSQL database
- Real-time subscriptions
- Row Level Security
- Authentication
- Storage for media files`,
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: <Box className="h-5 w-5 md:h-6 md:w-6" />,
    content: `Our app follows a modular architecture:
- Feature-based directory structure
- Atomic design principles
- Custom hooks for business logic
- Service layer for API interactions
- Type-safe data fetching`,
  },
  {
    id: 'contributing',
    title: 'Contributing',
    icon: <GitBranch className="h-5 w-5 md:h-6 md:w-6" />,
    content: `We welcome contributions! Please follow our guidelines:
1. Fork the repository
2. Create a feature branch
3. Follow our coding standards
4. Write tests
5. Submit a pull request`,
  },
] as const satisfies DocSection[];

const TableOfContents = ({ activeSection }: { activeSection: string }) => (
  <div className="sticky top-24 hidden h-fit w-64 space-y-2 p-4 lg:block">
    <h3 className="mb-4 font-semibold">On this page</h3>
    {sections.map((section) => (
      <a
        key={section.id}
        href={`#${section.id}`}
        className={cn(
          'block rounded-md px-2 py-1 text-sm transition-colors',
          'hover:bg-secondary',
          activeSection === section.id ? 'font-medium text-primary' : 'text-muted-foreground',
        )}
      >
        {section.title}
      </a>
    ))}
  </div>
);

export default function Docs() {
  useKC_DABR_WASM();
  const [activeSection, setActiveSection] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Update active section based on scroll position
      const sectionElements = sections.map((section) => document.getElementById(section.id));

      const currentSection = sectionElements.find((element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return rect.top <= 100 && rect.bottom >= 100;
      });

      if (currentSection) {
        setActiveSection(currentSection.id);
      }

      // Show/hide back to top button
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-20 pb-12 md:pt-32 md:pb-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 px-4 text-center md:mb-16"
          >
            <h1 className="mb-4 font-bold text-3xl md:text-4xl">Documentation</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Everything you need to know about UT Dining&apos;s technical implementation
            </p>
          </motion.div>

          <div className="flex flex-col gap-8 px-4 lg:flex-row">
            <TableOfContents activeSection={activeSection} />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto max-w-3xl flex-1 space-y-6 md:space-y-8 lg:mx-0"
            >
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  id={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ delay: index * 0.1 }}
                  className="glass scroll-mt-24 rounded-lg p-4 md:p-6"
                >
                  <div className="mb-4 flex items-center gap-3 md:gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">{section.icon}</div>
                    <h2 className="font-semibold text-xl md:text-2xl">{section.title}</h2>
                  </div>
                  <div className="prose prose-neutral dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-muted-foreground text-sm md:text-base">
                      {section.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Back to Top Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: showBackToTop ? 1 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          'fixed right-8 bottom-8 rounded-full p-3',
          'bg-primary text-primary-foreground shadow-lg',
          'transition-opacity',
          !showBackToTop && 'pointer-events-none',
        )}
      >
        <ChevronRight className="-rotate-90 h-5 w-5" />
      </motion.button>

      <Footer />
    </div>
  );
}
