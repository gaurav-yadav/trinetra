import { useState, useEffect } from 'react';
import type { Template, CreateTemplatePayload, UpdateTemplatePayload } from '@trinetra/shared';

interface TemplateFormProps {
  template?: Template;
  onSubmit: (data: CreateTemplatePayload | UpdateTemplatePayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TemplateForm({
  template,
  onSubmit,
  onCancel,
  isLoading = false,
}: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '');
  const [command, setCommand] = useState(template?.command || '');
  const [autoRun, setAutoRun] = useState(template?.autoRun ?? true);
  const [shell, setShell] = useState(template?.shell || '');
  const [preCommands, setPreCommands] = useState(template?.preCommands?.join('\n') || '');
  const [postCommands, setPostCommands] = useState(template?.postCommands?.join('\n') || '');

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCommand(template.command);
      setAutoRun(template.autoRun);
      setShell(template.shell || '');
      setPreCommands(template.preCommands?.join('\n') || '');
      setPostCommands(template.postCommands?.join('\n') || '');
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      command,
      autoRun,
      shell: shell || undefined,
      preCommands: preCommands
        ? preCommands.split('\n').filter((c) => c.trim())
        : undefined,
      postCommands: postCommands
        ? postCommands.split('\n').filter((c) => c.trim())
        : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Development Server"
          required
          className="input"
        />
      </div>

      <div>
        <label htmlFor="command" className="label">
          Command
        </label>
        <input
          id="command"
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="npm run dev"
          required
          className="input font-mono text-sm"
        />
      </div>

      <div>
        <label htmlFor="shell" className="label">
          Shell (optional)
        </label>
        <input
          id="shell"
          type="text"
          value={shell}
          onChange={(e) => setShell(e.target.value)}
          placeholder="/bin/zsh"
          className="input font-mono text-sm"
        />
      </div>

      <div>
        <label htmlFor="preCommands" className="label">
          Pre-commands (one per line, optional)
        </label>
        <textarea
          id="preCommands"
          value={preCommands}
          onChange={(e) => setPreCommands(e.target.value)}
          placeholder="cd /path&#10;source .env"
          rows={3}
          className="input font-mono text-sm resize-none"
        />
      </div>

      <div>
        <label htmlFor="postCommands" className="label">
          Post-commands (one per line, optional)
        </label>
        <textarea
          id="postCommands"
          value={postCommands}
          onChange={(e) => setPostCommands(e.target.value)}
          placeholder="echo 'Done'"
          rows={2}
          className="input font-mono text-sm resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoRun"
          checked={autoRun}
          onChange={(e) => setAutoRun(e.target.checked)}
          className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900"
        />
        <label htmlFor="autoRun" className="text-sm text-gray-300">
          Auto-run command on session start
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !name || !command}
          className="btn-primary flex-1"
        >
          {isLoading ? 'Saving...' : template ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
