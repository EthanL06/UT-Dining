'use client';
import { motion } from 'framer-motion';
import useKC_DABR_WASM from 'kc-dabr-wasm';
import {
  ChevronRight,
  Clock,
  Clock3,
  Download,
  Filter,
  Search,
  Star,
  Users,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/NavBar';

export default function Home() {
  useKC_DABR_WASM();
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-4 pt-20 pb-12 md:pt-32 md:pb-20">
        <div className="container mx-auto">
          <div className="mx-auto max-w-3xl space-y-4 text-center md:space-y-6">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-sm"
            >
              Built by Longhorn Developers
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-bold text-3xl leading-tight md:text-4xl lg:text-5xl"
            >
              The Ultimate Dining Experience for UT Students
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl"
            >
              Discover, rate, and explore dining options across campus. Join thousands of Longhorns
              making informed dining choices.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row"
            >
              <Link
                href="/downloads"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-white transition-colors hover:bg-primary-hover sm:w-auto"
              >
                <Download className="h-5 w-5" />
                Download Now
              </Link>
              <a
                href="/about"
                className="flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3 transition-colors hover:bg-secondary sm:w-auto"
              >
                Learn More
                <ChevronRight className="h-5 w-5" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="relative px-4 py-12 md:py-20">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8 text-center font-semibold text-xl md:mb-12 md:text-2xl"
          >
            Trusted by UT Students
          </motion.h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
            {[
              {
                icon: <Users className="mx-auto h-6 w-6 text-primary md:h-8 md:w-8" />,
                stat: '10,000+',
                label: 'Active Users',
              },
              {
                icon: <Star className="mx-auto h-6 w-6 text-primary md:h-8 md:w-8" />,
                stat: '4.8/5',
                label: 'Average Rating',
              },
              {
                icon: <Clock className="mx-auto h-6 w-6 text-primary md:h-8 md:w-8" />,
                stat: '15min',
                label: 'Time Saved per Meal',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="glass space-y-2 p-4 text-center md:p-6"
              >
                {item.icon}
                <div className="font-bold text-2xl md:text-3xl">{item.stat}</div>
                <div className="text-muted-foreground text-sm md:text-base">{item.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-4 py-12 md:py-20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto mb-8 max-w-2xl text-center md:mb-16"
          >
            <h2 className="mb-3 font-bold text-2xl md:mb-4 md:text-3xl">
              Everything you need to find the perfect meal
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              Comprehensive features designed to enhance your campus dining experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8">
            {[
              {
                icon: <Utensils className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Real-time Menu Updates',
                description:
                  'Stay informed with daily menu updates from all campus dining locations',
              },
              {
                icon: <Search className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Nutritional Information',
                description:
                  'See detailed nutritional information for every meal and dining location',
              },
              {
                icon: <Clock3 className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Wait Time Tracking',
                description:
                  'Know how busy each location is before you go with real-time wait estimates',
              },
              {
                icon: <Filter className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Dietary Filters',
                description:
                  'Easily find meals that match your dietary preferences and restrictions',
              },
              {
                icon: <Star className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Student Reviews',
                description: 'Make informed choices with authentic reviews from fellow Longhorns',
              },
              {
                icon: <Users className="h-5 w-5 text-primary md:h-6 md:w-6" />,
                title: 'Social Features',
                description: 'Connect with friends and share your favorite dining spots on campus',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass space-y-3 p-4 md:space-y-4 md:p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 md:h-12 md:w-12">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-lg md:text-xl">{feature.title}</h3>
                <p className="text-muted-foreground text-sm md:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
