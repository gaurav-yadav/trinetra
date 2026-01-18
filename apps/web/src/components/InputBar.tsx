import { useState, type KeyboardEvent } from 'react';
import { InputMode } from '@trinetra/shared';
import MultiLineModal from './MultiLineModal';

interface InputBarProps {
  onSend: (text: string, mode: InputMode) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBar({
  onSend,
  disabled = false,
  placeholder = 'Type a command...',
}: InputBarProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InputMode>(InputMode.COMMAND);
  const [showMultiLine, setShowMultiLine] = useState(false);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input, mode);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMultiLineSend = (text: string) => {
    onSend(text, mode);
    setShowMultiLine(false);
  };

  const toggleMode = () => {
    setMode(mode === InputMode.COMMAND ? InputMode.RAW : InputMode.COMMAND);
  };

  return (
    <>
      <div className="flex gap-2 p-3 bg-gray-900 border-t border-gray-800">
        {/* Mode Toggle */}
        <button
          onClick={toggleMode}
          disabled={disabled}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors shrink-0 ${
            mode === InputMode.COMMAND
              ? 'bg-blue-600 text-white'
              : 'bg-amber-600 text-white'
          } disabled:opacity-50`}
          title={mode === InputMode.COMMAND
            ? 'COMMAND mode: sends full line on Enter'
            : 'RAW mode: sends text character by character'}
        >
          {mode === InputMode.COMMAND ? 'CMD' : 'RAW'}
        </button>

        {/* Multi-line button */}
        <button
          onClick={() => setShowMultiLine(true)}
          disabled={disabled}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          title="Paste / Multi-line input"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="input flex-1"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="btn-primary px-5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Multi-line Modal */}
      <MultiLineModal
        isOpen={showMultiLine}
        onClose={() => setShowMultiLine(false)}
        onSend={handleMultiLineSend}
        mode={mode}
      />
    </>
  );
}
