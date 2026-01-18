import { useState, type KeyboardEvent } from 'react';

interface InputBarProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function InputBar({
  onSend,
  disabled = false,
  placeholder = 'Type a command...',
}: InputBarProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 p-3 bg-gray-900 border-t border-gray-800">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
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
  );
}
