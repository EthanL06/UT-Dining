'use client';

import { motion } from 'framer-motion';
import useKC_DABR_WASM from 'kc-dabr-wasm';
import { SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/NavBar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';

interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

const faqItems = [
  {
    question: 'What is UT Dining?',
    answer:
      'UT Dining is a mobile app designed specifically for UT Austin students to explore, rate, and discover campus dining options. It provides real-time information about wait times, menus, and student reviews.',
    category: 'general',
  },
  {
    question: 'How do I download the app?',
    answer:
      'The app is available on both iOS App Store and Google Play Store. You can also access it through our web version. Visit our Downloads page to get started.',
    category: 'technical',
  },
  {
    question: 'Do I need a UT email to use the app?',
    answer:
      'Yes, you need a valid utexas.edu email address to create an account. This helps us maintain a community of authentic UT students.',
    category: 'account',
  },
  {
    question: 'How accurate are the wait times?',
    answer:
      'Wait times are updated in real-time based on user check-ins and our automated monitoring system. They typically reflect actual waiting times within a 5-minute margin.',
    category: 'features',
  },
  {
    question: 'Can I filter for dietary restrictions?',
    answer:
      'Yes! You can filter meals by various dietary requirements including vegetarian, vegan, gluten-free, halal, and more.',
    category: 'features',
  },
  {
    question: 'How can I report an issue?',
    answer:
      "You can report issues directly through the app's Help section or by emailing support@utdining.com. We typically respond within 24 hours.",
    category: 'support',
  },
] as const satisfies FAQItem[];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Faq() {
  useKC_DABR_WASM();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="px-4 pt-20 pb-12 md:pt-32 md:pb-20">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-4 text-center md:mb-16"
          >
            <h1 className="mb-4 font-bold text-3xl md:text-4xl">Frequently Asked Questions</h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
              Find answers to common questions about UT Dining
            </p>

            {/* Search Input */}
            <div className="relative mx-auto mt-8 max-w-md">
              <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search FAQs..."
                className="w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <Accordion type="single" collapsible className="w-full">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((item, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="overflow-hidden rounded-lg"
                  >
                    <AccordionItem value={`item-${index}`} className="glass">
                      <AccordionTrigger className="px-4 py-4 text-base hover:bg-primary/5 hover:no-underline md:px-6 md:text-lg">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 text-muted-foreground text-sm md:px-6 md:text-base">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  variants={itemVariants}
                  className="py-8 text-center text-muted-foreground"
                >
                  No FAQs found matching your search.
                </motion.div>
              )}
            </Accordion>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
