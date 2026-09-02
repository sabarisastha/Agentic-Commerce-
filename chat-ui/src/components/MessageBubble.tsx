import { marked } from 'marked';
import { useMemo } from 'react';

// Configure marked for clean output
marked.setOptions({
  breaks: true,   // newlines become <br>
  gfm: true,      // GitHub-flavored markdown
});

export function MessageBubble({ content }: { content: string }) {
  const html = useMemo(() => {
    // Convert markdown to HTML
    const raw = marked.parse(content) as string;
    return raw;
  }, [content]);

  return (
    <div
      className="bg-white text-neutral-ink px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-sky-100 prose prose-sm max-w-none
        prose-p:my-1 prose-p:leading-relaxed
        prose-strong:text-neutral-ink prose-strong:font-semibold
        prose-ol:my-2 prose-ol:pl-4
        prose-ul:my-2 prose-ul:pl-4
        prose-li:my-0.5
        prose-headings:text-neutral-ink
        prose-a:text-brand-blue"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
