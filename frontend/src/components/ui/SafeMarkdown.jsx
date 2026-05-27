import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function SafeMarkdown({ content, className }) {
  const { dir } = useLanguage();
  return (
    <div className={className} dir={dir}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}
