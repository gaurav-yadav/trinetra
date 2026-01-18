import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XTermViewProps {
  content: string;
  autoScroll?: boolean;
  sessionTitle?: string;
}

export default function XTermView({ content, autoScroll = true, sessionTitle = 'session' }: XTermViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const prevContentLengthRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

  // Track scroll position and new output for jump-to-bottom feature
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasUnreadOutput, setHasUnreadOutput] = useState(false);

  // Download log function
  const downloadLog = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionTitle}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, sessionTitle]);

  // Copy functions
  const copyLastLines = useCallback((n: number) => {
    const lines = content.split('\n');
    const lastLines = lines.slice(-n).join('\n');
    navigator.clipboard.writeText(lastLines);
  }, [content]);

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollToBottom();
      setIsScrolledUp(false);
      setHasUnreadOutput(false);
      shouldAutoScrollRef.current = true;
    }
  }, []);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        cursorAccent: '#1a1b26',
        selectionBackground: '#33467c',
        selectionForeground: '#c0caf5',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true,
      scrollback: 10000,
      convertEol: true,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(containerRef.current);

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle scroll events for detecting scroll position
    terminal.onScroll(() => {
      const buffer = terminal.buffer.active;
      const viewportY = buffer.viewportY;
      const baseY = buffer.baseY;

      // Check if scrolled up (not at bottom)
      const atBottom = viewportY >= baseY;
      shouldAutoScrollRef.current = atBottom;
      setIsScrolledUp(!atBottom);

      // Clear unread state when at bottom
      if (atBottom) {
        setHasUnreadOutput(false);
      }
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Handle content updates (incremental)
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = terminalRef.current;
    const prevLength = prevContentLengthRef.current;
    const newLength = content.length;

    if (newLength > prevLength) {
      // Get the new content
      const newContent = content.slice(prevLength);

      // Track if there's unread output while scrolled up
      if (isScrolledUp && newContent.length > 0) {
        setHasUnreadOutput(true);
      }

      // Write the new content
      terminal.write(newContent);

      // Auto-scroll if enabled and user hasn't scrolled up
      if (autoScroll && shouldAutoScrollRef.current) {
        terminal.scrollToBottom();
      }
    } else if (newLength < prevLength) {
      // Content was reset/cleared - rewrite everything
      terminal.clear();
      terminal.write(content);
      if (autoScroll) {
        terminal.scrollToBottom();
      }
    }

    prevContentLengthRef.current = newLength;
  }, [content, autoScroll, isScrolledUp]);

  return (
    <div className="h-full flex flex-col bg-terminal-bg relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-gray-900 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">XTerm.js</span>
        </div>

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
                onClick={() => navigator.clipboard.writeText(content)}
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

      {/* Terminal container */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden p-2"
        style={{ backgroundColor: '#1a1b26' }}
      />

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
