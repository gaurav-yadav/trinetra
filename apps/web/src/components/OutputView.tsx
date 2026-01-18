import { useEffect, useRef, useMemo, useState, useCallback, type ReactNode } from 'react';
import { stripAnsi } from '../utils/ansi';

interface OutputViewProps {
  content: string;
  autoScroll?: boolean;
  sessionTitle?: string;
}

// Rolling buffer configuration
const DEFAULT_VISIBLE_LINES = 1000;
const LOAD_MORE_CHUNK = 500;

// Error patterns to highlight
const ERROR_PATTERNS = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bexception\b/i,
  /\bpanic\b/i,
  /\bfatal\b/i,
];

function isErrorLine(line: string): boolean {
  return ERROR_PATTERNS.some((pattern) => pattern.test(line));
}

export default function OutputView({ content, autoScroll = true, sessionTitle = 'session' }: OutputViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Rolling buffer state - how many lines to show from the end
  const [visibleLineCount, setVisibleLineCount] = useState(DEFAULT_VISIBLE_LINES);

  // Track scroll position and new output for jump-to-bottom feature
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasUnreadOutput, setHasUnreadOutput] = useState(false);
  const prevContentLength = useRef(content.length);

  // Track if user has scrolled up (more than 100px from bottom)
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    shouldAutoScroll.current = distanceFromBottom < 50;

    // Update isScrolledUp state (100px threshold)
    const scrolledUp = distanceFromBottom > 100;
    setIsScrolledUp(scrolledUp);

    // Clear unread state when at bottom
    if (!scrolledUp) {
      setHasUnreadOutput(false);
    }
  };

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsScrolledUp(false);
      setHasUnreadOutput(false);
    }
  }, []);

  // Track new output while scrolled up
  useEffect(() => {
    if (content.length > prevContentLength.current && isScrolledUp) {
      setHasUnreadOutput(true);
    }
    prevContentLength.current = content.length;
  }, [content, isScrolledUp]);

  // Strip ANSI codes from content
  const cleanContent = useMemo(() => stripAnsi(content), [content]);

  // Split content into lines for processing (all lines for search)
  const allLines = useMemo(() => cleanContent.split('\n'), [cleanContent]);

  // Calculate visible lines based on rolling buffer
  const { visibleLines, startIndex, isTruncated, hiddenMatchCount } = useMemo(() => {
    const totalLines = allLines.length;
    const start = Math.max(0, totalLines - visibleLineCount);
    const visible = allLines.slice(start);
    const truncated = start > 0;

    // Count search matches in hidden (truncated) portion
    let hiddenMatches = 0;
    if (searchQuery.trim() && truncated) {
      const query = searchQuery.toLowerCase();
      for (let i = 0; i < start; i++) {
        if (allLines[i].toLowerCase().includes(query)) {
          hiddenMatches++;
        }
      }
    }

    return {
      visibleLines: visible,
      startIndex: start,
      isTruncated: truncated,
      hiddenMatchCount: hiddenMatches,
    };
  }, [allLines, visibleLineCount, searchQuery]);

  // Load more lines when clicking "Load more"
  const loadMoreLines = useCallback(() => {
    setVisibleLineCount((prev) => prev + LOAD_MORE_CHUNK);
  }, []);

  // Load all lines (useful for search)
  const loadAllLines = useCallback(() => {
    setVisibleLineCount(allLines.length);
  }, [allLines.length]);

  // Handle keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
        setSearchMatches([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  // Search logic - searches visible lines only, but reports hidden matches
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMatches([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matches: number[] = [];
    visibleLines.forEach((line, index) => {
      if (line.toLowerCase().includes(query)) {
        matches.push(index);
      }
    });
    setSearchMatches(matches);
    setCurrentMatch(0);
  }, [searchQuery, visibleLines]);

  // Scroll to current match
  useEffect(() => {
    if (searchMatches.length > 0 && containerRef.current) {
      const matchIndex = searchMatches[currentMatch];
      const lineElements = containerRef.current.querySelectorAll('[data-line]');
      const targetElement = lineElements[matchIndex];
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatch, searchMatches]);

  // Navigate search matches
  const goToNextMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatch((prev) => (prev + 1) % searchMatches.length);
    }
  }, [searchMatches.length]);

  const goToPrevMatch = useCallback(() => {
    if (searchMatches.length > 0) {
      setCurrentMatch((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  }, [searchMatches.length]);

  // Auto-scroll on new content
  useEffect(() => {
    if (autoScroll && shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [cleanContent, autoScroll]);

  // Copy last N lines
  const copyLastLines = useCallback((n: number) => {
    const lastLines = allLines.slice(-n).join('\n');
    navigator.clipboard.writeText(lastLines);
  }, [allLines]);

  // Download log
  const downloadLog = useCallback(() => {
    const blob = new Blob([cleanContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [cleanContent, sessionTitle]);

  // Highlight search matches in a line (visibleIndex is index within visible lines)
  const highlightLine = (line: string, visibleIndex: number): ReactNode => {
    if (!searchQuery.trim()) return line;

    const parts: ReactNode[] = [];
    const query = searchQuery.toLowerCase();
    let lastIndex = 0;
    let searchIndex = line.toLowerCase().indexOf(query);

    while (searchIndex !== -1) {
      // Add text before match
      if (searchIndex > lastIndex) {
        parts.push(line.slice(lastIndex, searchIndex));
      }
      // Add highlighted match
      const isCurrentMatch = searchMatches[currentMatch] === visibleIndex;
      parts.push(
        <mark
          key={searchIndex}
          className={`${isCurrentMatch ? 'bg-yellow-500 text-black' : 'bg-yellow-700 text-white'}`}
        >
          {line.slice(searchIndex, searchIndex + query.length)}
        </mark>
      );
      lastIndex = searchIndex + query.length;
      searchIndex = line.toLowerCase().indexOf(query, lastIndex);
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : line;
  };

  return (
    <div className="h-full flex flex-col bg-terminal-bg relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-800 gap-2">
        {/* Search toggle */}
        <button
          onClick={() => {
            setShowSearch(!showSearch);
            if (!showSearch) {
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }
          }}
          className={`p-1.5 rounded transition-colors ${showSearch ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
          title="Search (Ctrl+F)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Search bar (inline when active) */}
        {showSearch && (
          <div className="flex-1 flex items-center gap-1 max-w-md">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.shiftKey ? goToPrevMatch() : goToNextMatch();
                }
              }}
              placeholder="Search..."
              className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {(searchMatches.length > 0 || hiddenMatchCount > 0) && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {searchMatches.length > 0 ? `${currentMatch + 1}/${searchMatches.length}` : '0/0'}
                {hiddenMatchCount > 0 && (
                  <button
                    onClick={loadAllLines}
                    className="ml-1 text-yellow-500 hover:text-yellow-400"
                    title="Load all lines to see hidden matches"
                  >
                    (+{hiddenMatchCount} hidden)
                  </button>
                )}
              </span>
            )}
            <button
              onClick={goToPrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-50"
              title="Previous match"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={goToNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-50"
              title="Next match"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Copy dropdown */}
          <div className="relative group">
            <button
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
              title="Copy lines"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-1 py-1 bg-gray-800 border border-gray-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 min-w-[120px]">
              <button
                onClick={() => copyLastLines(10)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                Last 10 lines
              </button>
              <button
                onClick={() => copyLastLines(50)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                Last 50 lines
              </button>
              <button
                onClick={() => copyLastLines(100)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                Last 100 lines
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(cleanContent)}
                className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                Copy all
              </button>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={downloadLog}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
            title="Download log"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Line count indicator */}
      {allLines.length > 1 && (
        <div className="px-2 py-1 text-xs text-gray-500 bg-gray-900/50 border-b border-gray-800 flex items-center justify-between">
          <span>
            {isTruncated
              ? `Showing ${visibleLines.length.toLocaleString()} of ${allLines.length.toLocaleString()} lines`
              : `${allLines.length.toLocaleString()} lines`}
          </span>
          {isTruncated && (
            <button
              onClick={loadAllLines}
              className="text-blue-400 hover:text-blue-300"
            >
              Show all
            </button>
          )}
        </div>
      )}

      {/* Output content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto terminal-scrollbar"
      >
        {/* Load more button at top when truncated */}
        {isTruncated && (
          <div className="sticky top-0 z-10 px-3 py-2 bg-gray-900/95 border-b border-gray-800 text-center">
            <button
              onClick={loadMoreLines}
              className="px-3 py-1 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
            >
              Load {Math.min(LOAD_MORE_CHUNK, startIndex).toLocaleString()} more lines
              <span className="ml-1 text-gray-500">
                ({startIndex.toLocaleString()} hidden)
              </span>
            </button>
          </div>
        )}

        <pre className="p-3 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
          {visibleLines.length === 0 || (visibleLines.length === 1 && !visibleLines[0]) ? (
            <span className="text-gray-600">No output yet...</span>
          ) : (
            visibleLines.map((line, visibleIndex) => {
              const actualLineNumber = startIndex + visibleIndex;
              const isError = isErrorLine(line);
              const isMatch = searchMatches.includes(visibleIndex);

              return (
                <div
                  key={actualLineNumber}
                  data-line={visibleIndex}
                  className={`${isError ? 'bg-red-900/30 text-red-300' : 'text-terminal-text'} ${
                    isMatch ? 'bg-yellow-900/20' : ''
                  }`}
                >
                  {highlightLine(line, visibleIndex)}
                  {visibleIndex < visibleLines.length - 1 ? '\n' : ''}
                </div>
              );
            })
          )}
        </pre>
      </div>

      {/* Jump to bottom button - shows when scrolled up */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full shadow-lg transition-all duration-200 min-h-[44px] z-20"
          style={{
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          {hasUnreadOutput && (
            <span className="flex items-center gap-1.5 text-blue-400 text-sm font-medium">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              New output
            </span>
          )}
          <span className="text-gray-300 text-sm">Jump to bottom</span>
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      {/* Keyframe animation for slide-up effect */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
