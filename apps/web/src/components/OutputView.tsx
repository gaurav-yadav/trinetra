import { useEffect, useRef, useMemo } from 'react';
import { stripAnsi } from '../utils/ansi';

interface OutputViewProps {
  content: string;
  autoScroll?: boolean;
}

export default function OutputView({ content, autoScroll = true }: OutputViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Track if user has scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Consider "at bottom" if within 50px of bottom
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  // Strip ANSI codes from content
  const cleanContent = useMemo(() => stripAnsi(content), [content]);

  // Auto-scroll on new content
  useEffect(() => {
    if (autoScroll && shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [cleanContent, autoScroll]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-auto bg-terminal-bg terminal-scrollbar"
    >
      <pre className="p-3 text-sm font-mono text-terminal-text whitespace-pre-wrap break-words leading-relaxed">
        {cleanContent || <span className="text-gray-600">No output yet...</span>}
      </pre>
    </div>
  );
}
