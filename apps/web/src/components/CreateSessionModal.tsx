import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useTemplates } from '../hooks/useTemplates';
import { useCreateSession } from '../hooks/useSessions';
import type { CreateSessionPayload } from '@trinetra/shared';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
  preselectedWorkspaceId?: string;
}

export default function CreateSessionModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedWorkspaceId,
}: CreateSessionModalProps) {
  const [workspaceId, setWorkspaceId] = useState(preselectedWorkspaceId || '');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [pathOverride, setPathOverride] = useState('');

  const { data: workspaces } = useWorkspaces();
  const { data: templates } = useTemplates();
  const createSession = useCreateSession();

  // Set default template when workspace changes
  useEffect(() => {
    if (workspaceId && workspaces) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws?.defaultTemplateId) {
        setTemplateId(ws.defaultTemplateId);
      }
    }
  }, [workspaceId, workspaces]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setWorkspaceId(preselectedWorkspaceId || '');
      setTemplateId('');
      setTitle('');
      setPathOverride('');
    }
  }, [isOpen, preselectedWorkspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: CreateSessionPayload = {};
    if (workspaceId) payload.workspaceId = workspaceId;
    if (templateId) payload.templateId = templateId;
    if (title.trim()) payload.title = title.trim();
    if (pathOverride.trim()) payload.pathOverride = pathOverride.trim();

    try {
      const session = await createSession.mutateAsync(payload);
      onClose();
      onSuccess?.(session.id);
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="workspace" className="label">
            Workspace (optional)
          </label>
          <select
            id="workspace"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="input"
          >
            <option value="">None (custom path)</option>
            {workspaces?.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        {!workspaceId && (
          <div>
            <label htmlFor="pathOverride" className="label">
              Custom Path
            </label>
            <input
              id="pathOverride"
              type="text"
              value={pathOverride}
              onChange={(e) => setPathOverride(e.target.value)}
              placeholder="/path/to/directory"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="input font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label htmlFor="template" className="label">
            Template (optional)
          </label>
          <select
            id="template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="input"
          >
            <option value="">None</option>
            {templates?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} - {t.command}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="title" className="label">
            Session Title (optional)
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Auto-generated if empty"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="input"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={createSession.isPending}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSession.isPending}
            className="btn-primary flex-1"
          >
            {createSession.isPending ? 'Creating...' : 'Create Session'}
          </button>
        </div>

        {createSession.isError && (
          <p className="text-red-400 text-sm text-center">
            {(createSession.error as Error)?.message || 'Failed to create session'}
          </p>
        )}
      </form>
    </Modal>
  );
}
