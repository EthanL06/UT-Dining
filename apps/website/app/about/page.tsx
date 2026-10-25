'use client';

import { motion } from 'framer-motion';
import useKC_DABR_WASM from 'kc-dabr-wasm';
import { BookOpen, Clock, Coffee, Github, Star, Users } from 'lucide-react';
import type { JSX } from 'react';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/NavBar';

interface TeamValue {
  icon: JSX.Element;
  title: string;
  description: string;
}

interface Milestone {
  year: string;
  title: string;
  description: string;
}

const teamValues = [
  {
    icon: <Users className="h-6 w-6 text-primary md:h-8 md:w-8" />,
    title: 'Community First',
    description: 'Built by students, for students',
  },
  {
    icon: <Github className="h-6 w-6 text-primary md:h-8 md:w-8" />,
    title: 'Open Source',
    description: 'Committed to open source, collaboration, and quality',
  },
  {
    icon: <Coffee className="h-6 w-6 text-primary md:h-8 md:w-8" />,
    title: 'Innovation',
    description: 'Constantly improving the experience',
  },
  {
    icon: <BookOpen className="h-6 w-6 text-primary md:h-8 md:w-8" />,
    title: 'Education',
    description: 'Helping make informed choices',
  },
] as const satisfies TeamValue[];

const milestones = [
  {
    year: '2025',
    title: 'Launch',
    description: 'Initial release of UT Dining app for iOS, Android, Desktop, and Web',
  },
  {
    year: '2026',
    title: 'Growth',
    description: 'Reached 10,000+ active users',
  },
] as const satisfies Milestone[];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function About() {
  useKC_DABR_WASM();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-12 md:pt-24 md:pb-20">
        {/* Hero Section */}
        <div className="container px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mb-12 max-w-3xl space-y-4 text-center md:mb-20"
          >
            <h1 className="font-bold text-3xl md:text-4xl">About UT Dining Experience</h1>
            <p className="text-lg text-muted-foreground md:text-xl">
              We&apos;re a team of UT students passionate about making campus dining better for
              everyone.
            </p>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mx-auto mb-12 grid max-w-4xl grid-cols-2 gap-4 md:mb-20 md:grid-cols-4 md:gap-6"
          >
            {[
              { icon: <Users />, value: '10,000+', label: 'Active Users' },
              { icon: <Star />, value: '4.8', label: 'App Rating' },
              { icon: <Coffee />, value: '10+', label: 'Dining Locations' },
              { icon: <Clock />, value: 'Real-time', label: 'Menu Updates' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="glass space-y-2 p-4 text-center"
              >
                <div className="flex justify-center text-primary">{stat.icon}</div>
                <div className="font-bold text-xl md:text-2xl">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Mission Section */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass mx-auto mb-12 max-w-4xl rounded-2xl p-6 md:mb-20 md:p-8"
          >
            <h2 className="mb-4 font-semibold text-xl md:text-2xl">Our Mission</h2>
            <p className="text-muted-foreground text-sm md:text-base">
              To revolutionize the campus dining experience by providing students with real-time
              information, honest reviews, and a platform to make informed dining choices. We
              believe that good food fuels academic success, and every student deserves access to
              quality dining options.
            </p>
          </motion.div>

          {/* Team Values */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mb-20 md:gap-8 lg:grid-cols-4"
          >
            {teamValues.map((value, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="glass space-y-3 p-4 text-center md:p-6"
              >
                <div className="flex justify-center">{value.icon}</div>
                <h3 className="font-semibold">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Timeline Section */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl"
          >
            <h2 className="mb-6 text-center font-semibold text-xl md:text-2xl">Our Journey</h2>
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="glass flex items-start gap-4 p-4 md:p-6"
                >
                  <div className="font-bold text-primary">{milestone.year}</div>
                  <div>
                    <h3 className="mb-1 font-semibold">{milestone.title}</h3>
                    <p className="text-muted-foreground text-sm">{milestone.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
