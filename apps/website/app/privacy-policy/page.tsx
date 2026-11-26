import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { getMarkdownContent } from '@/lib/markdown';

export const metadata: Metadata = {
  title: 'Privacy Policy · UT Dining',
  description: 'How UT Dining handles your information.',
};

const summary = [
  { title: 'No account', body: 'UT Dining never asks for your name, email or phone number.' },
  { title: 'On your phone', body: 'Favorites and your Meal Plan stay on your device.' },
  { title: 'No ads', body: 'Nothing is shared for marketing or advertising.' },
];

export default async function PrivacyPolicy() {
  const content = await getMarkdownContent('privacy-policy.md');

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-290 px-6 pt-16 pb-10">
        <h1 className="font-bold text-[clamp(40px,6vw,64px)] leading-none tracking-[-0.04em]">
          Privacy
        </h1>
        <p className="mt-4 text-[19px] text-muted">The short version, then the full policy.</p>
      </section>

      <section className="mx-auto grid max-w-290 grid-cols-1 gap-4 px-6 md:grid-cols-3">
        {summary.map((item) => (
          <div key={item.title} className="rounded-[28px] bg-tile p-7">
            <h2 className="font-bold text-[22px] tracking-tight">{item.title}</h2>
            <p className="mt-1.5 text-muted leading-normal">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-4 max-w-290 px-6">
        <div className="rounded-[28px] bg-tile px-7 py-10 md:px-16 md:py-14">
          <article className="prose prose-neutral dark:prose-invert mx-auto max-w-170 prose-hr:border-line prose-a:text-accent-text prose-h1:text-4xl prose-h2:text-xl prose-h1:tracking-tight">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
