import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

/**
 * Markdown renderer with XSS protection via rehype-sanitize.
 * Use this everywhere raw markdown content is rendered.
 */
export default function SafeMarkdown({ content, className }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
