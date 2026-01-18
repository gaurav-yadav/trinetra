import { useState, useEffect } from 'react';
import { InputMode } from '@trinetra/shared';
import Modal from './Modal';

interface MultiLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (text: string) => void;
  mode: InputMode;
}

export default function MultiLineModal({
  isOpen,
  onClose,
  onSend,
  mode,
}: MultiLineModalProps) {
  const [content, setContent] = useState('');

  // Reset content when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!content.trim()) return;
    onSend(content);
    setContent('');
  };

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Multi-line Input">
      <div className="space-y-4">
        {/* Mode indicator */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Mode:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            mode === InputMode.COMMAND
              ? 'bg-blue-600 text-white'
              : 'bg-amber-600 text-white'
          }`}>
            {mode === InputMode.COMMAND ? 'COMMAND' : 'RAW'}
          </span>
          <span className="text-gray-500">
            {mode === InputMode.COMMAND
              ? '(sends as complete text)'
              : '(sends character by character)'}
          </span>
        </div>

        {/* Textarea */}
        <div>
          <label htmlFor="multiline-content" className="label">
            Content
          </label>
          <textarea
            id="multiline-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste or type multi-line content here...&#10;&#10;Examples:&#10;- Configuration files&#10;- Multi-line commands&#10;- Code snippets"
            rows={10}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="input font-mono text-sm resize-none w-full"
          />
        </div>

        {/* Stats */}
        <div className="text-xs text-gray-500">
          {lineCount} line{lineCount !== 1 ? 's' : ''} | {charCount} character{charCount !== 1 ? 's' : ''}
        </div>

        {/* Preview */}
        {content.trim() && (
          <div>
            <label className="label">Preview</label>
            <pre className="p-3 bg-gray-800 border border-gray-700 rounded text-sm font-mono text-gray-300 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
              {content}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim()}
            className="btn-primary flex-1"
          >
            Send
          </button>
        </div>
      </div>
    </Modal>
  );
}
