import { useState } from 'react';

interface QuickActionsProps {
  onKey: (key: string) => void;
  disabled?: boolean;
}

type KeyGroup = 'main' | 'nav' | 'prompt';

export default function QuickActions({ onKey, disabled = false }: QuickActionsProps) {
  const [activeGroup, setActiveGroup] = useState<KeyGroup>('main');

  const mainKeys = [
    { key: 'C-c', label: 'Ctrl+C', className: 'bg-red-600 hover:bg-red-700 text-white' },
    { key: 'Enter', label: 'Enter', className: 'btn-secondary' },
    { key: 'Escape', label: 'Esc', className: 'btn-secondary' },
  ];

  const navKeys = [
    { key: 'Up', label: '↑', className: 'btn-secondary' },
    { key: 'Down', label: '↓', className: 'btn-secondary' },
    { key: 'Tab', label: 'Tab', className: 'btn-secondary' },
    { key: 'Space', label: 'Space', className: 'btn-secondary' },
  ];

  const promptKeys = [
    { key: '1', label: '1', className: 'btn-secondary' },
    { key: '2', label: '2', className: 'btn-secondary' },
    { key: '3', label: '3', className: 'btn-secondary' },
    { key: 'y', label: 'y', className: 'bg-green-600 hover:bg-green-700 text-white' },
    { key: 'n', label: 'n', className: 'bg-red-600 hover:bg-red-700 text-white' },
  ];

  const groups: Record<KeyGroup, { keys: typeof mainKeys; label: string }> = {
    main: { keys: mainKeys, label: 'Main' },
    nav: { keys: navKeys, label: 'Nav' },
    prompt: { keys: promptKeys, label: '1/2/y/n' },
  };

  const currentKeys = groups[activeGroup].keys;

  return (
    <div className="bg-gray-900 border-t border-gray-800">
      {/* Group selector */}
      <div className="flex border-b border-gray-800">
        {(Object.keys(groups) as KeyGroup[]).map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeGroup === group
                ? 'text-blue-400 bg-gray-800'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {groups[group].label}
          </button>
        ))}
      </div>

      {/* Key buttons */}
      <div className="flex gap-2 p-3">
        {currentKeys.map(({ key, label, className }) => (
          <button
            key={key}
            onClick={() => onKey(key)}
            disabled={disabled}
            className={`flex-1 py-3 rounded-lg font-mono text-sm transition-colors disabled:opacity-50 ${className}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
