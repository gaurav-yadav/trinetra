import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useWorkspaces,
  useCreateWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '../hooks/useWorkspaces';
import type { Workspace, CreateWorkspacePayload, UpdateWorkspacePayload } from '@trinetra/shared';
import Modal from '../components/Modal';
import WorkspaceForm from '../components/WorkspaceForm';
import CreateSessionModal from '../components/CreateSessionModal';

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Workspace | null>(null);
  const [showSessionModal, setShowSessionModal] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingWorkspace(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (ws: Workspace) => {
    setEditingWorkspace(ws);
    setShowFormModal(true);
  };

  const handleSubmit = async (data: CreateWorkspacePayload | UpdateWorkspacePayload) => {
    if (editingWorkspace) {
      await updateWorkspace.mutateAsync({ id: editingWorkspace.id, payload: data });
    } else {
      await createWorkspace.mutateAsync(data as CreateWorkspacePayload);
    }
    setShowFormModal(false);
  };

  const handleDelete = async () => {
    if (showDeleteConfirm) {
      await deleteWorkspace.mutateAsync(showDeleteConfirm.id);
      setShowDeleteConfirm(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800">
        <h1 className="text-xl font-semibold text-gray-100">Workspaces</h1>
        <button onClick={handleCreate} className="btn-primary">
          Add
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !workspaces?.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p>No workspaces yet</p>
            <p className="text-sm mt-1">Add one to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {workspaces.map((ws) => (
              <div key={ws.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-100">{ws.name}</h3>
                    <p className="text-sm text-gray-500 font-mono truncate mt-1">{ws.path}</p>
                    {ws.envHint && (
                      <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-gray-800 text-gray-400 rounded">
                        {ws.envHint}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowSessionModal(ws.id)}
                      className="btn-ghost p-2 text-green-400"
                      title="New Session"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(ws)}
                      className="btn-ghost p-2"
                      title="Edit"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(ws)}
                      className="btn-ghost p-2 text-red-400"
                      title="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingWorkspace ? 'Edit Workspace' : 'New Workspace'}
      >
        <WorkspaceForm
          workspace={editingWorkspace}
          onSubmit={handleSubmit}
          onCancel={() => setShowFormModal(false)}
          isLoading={createWorkspace.isPending || updateWorkspace.isPending}
        />
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Delete Workspace"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete "{showDeleteConfirm?.name}"? This action
            cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteWorkspace.isPending}
              className="btn-danger flex-1"
            >
              {deleteWorkspace.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={!!showSessionModal}
        onClose={() => setShowSessionModal(null)}
        onSuccess={(id) => navigate(`/sessions/${id}`)}
        preselectedWorkspaceId={showSessionModal || undefined}
      />
    </div>
  );
}
