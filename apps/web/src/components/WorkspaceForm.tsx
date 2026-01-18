import { useState, useEffect } from 'react';
import type { Workspace, CreateWorkspacePayload, UpdateWorkspacePayload } from '@trinetra/shared';
import { useTemplates } from '../hooks/useTemplates';

interface WorkspaceFormProps {
  workspace?: Workspace;
  onSubmit: (data: CreateWorkspacePayload | UpdateWorkspacePayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WorkspaceForm({
  workspace,
  onSubmit,
  onCancel,
  isLoading = false,
}: WorkspaceFormProps) {
  const [name, setName] = useState(workspace?.name || '');
  const [path, setPath] = useState(workspace?.path || '');
  const [defaultTemplateId, setDefaultTemplateId] = useState(
    workspace?.defaultTemplateId || ''
  );
  const [envHint, setEnvHint] = useState(workspace?.envHint || '');

  const { data: templates } = useTemplates();

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setPath(workspace.path);
      setDefaultTemplateId(workspace.defaultTemplateId || '');
      setEnvHint(workspace.envHint || '');
    }
  }, [workspace]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      path,
      defaultTemplateId: defaultTemplateId || undefined,
      envHint: envHint || undefined,
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
          placeholder="My Project"
          required
          className="input"
        />
      </div>

      <div>
        <label htmlFor="path" className="label">
          Path
        </label>
        <input
          id="path"
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/path/to/project"
          required
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="input font-mono text-sm"
        />
      </div>

      <div>
        <label htmlFor="template" className="label">
          Default Template (optional)
        </label>
        <select
          id="template"
          value={defaultTemplateId}
          onChange={(e) => setDefaultTemplateId(e.target.value)}
          className="input"
        >
          <option value="">None</option>
          {templates?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="envHint" className="label">
          Environment Hint (optional)
        </label>
        <input
          id="envHint"
          type="text"
          value={envHint}
          onChange={(e) => setEnvHint(e.target.value)}
          placeholder="e.g., node, python, rust"
          className="input"
        />
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
        <button type="submit" disabled={isLoading || !name || !path} className="btn-primary flex-1">
          {isLoading ? 'Saving...' : workspace ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
