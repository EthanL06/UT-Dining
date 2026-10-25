import ReactMarkdown from 'react-markdown';
import { Navbar } from '@/components/NavBar';
import { getMarkdownContent } from '@/lib/markdown';

export default async function PrivacyPolicy() {
  const content = await getMarkdownContent('privacy-policy.md');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="px-4 pt-20 pb-12 md:pt-32 md:pb-20">
        <div className="container mx-auto max-w-4xl">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </section>
    </div>
  );
}
